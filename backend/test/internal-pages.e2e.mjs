/**
 * The internal pages, rendered in a real browser.
 *
 *   BASE=http://localhost:3391 node backend/test/internal-pages.e2e.mjs
 *
 * WHY A 200 PROVES NOTHING HERE. Every internal page is an HTML shell and a
 * module script: the shell has no content in it, and everything a person
 * reads is built in the browser from an API response. A test that asks for
 * the page and checks the status code is testing that a file exists on disk.
 * The page can serve 200 and paint an error, or paint nothing at all, because
 * a field was renamed in a route three commits ago.
 *
 * That is not hypothetical. These pages read `spend.totals.perRun`,
 * `measured.counts.l7Built`, `perms.matrix[].access` and thirty other paths
 * into live JSON, none of which the server knows the page depends on.
 *
 * So this drives Chromium over the DevTools protocol, signs in the way a
 * person does, and reads what is actually on the screen.
 *
 * NO NEW DEPENDENCY. Node 22 ships a WebSocket client and the image ships
 * Chromium, so the whole harness is one file: launch with a debugging port,
 * connect, navigate, evaluate. Adding a browser-automation library to test
 * five pages would be a larger change than the thing it tests.
 *
 * If Chromium is not present the suite SKIPS rather than fails — a missing
 * browser on some other machine is not a defect in this application, and a
 * test that cannot run must not report a failure it did not observe.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";

const BASE = (process.env.BASE || "http://127.0.0.1:3391").replace(/\/+$/, "");

let pass = 0, fail = 0;
const ok = (c, m, x) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m + (x !== undefined ? "  → " + String(x).slice(0, 400) : ""))); };

const CANDIDATES = [
  process.env.CHROMIUM_PATH,
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
].filter(Boolean);
let binary = CANDIDATES.find((p) => { try { return fs.statSync(p).isFile(); } catch { return false; } });
if (!binary) {
  // A glob for the versioned Playwright directory, so a bumped version does
  // not silently turn this suite off.
  try {
    const dir = "/opt/pw-browsers";
    for (const d of fs.readdirSync(dir)) {
      const p = `${dir}/${d}/chrome-linux/chrome`;
      if (fs.existsSync(p)) { binary = p; break; }
    }
  } catch { /* none */ }
}

if (!binary) {
  console.log("\n=== the internal pages, in a real browser ===\n");
  console.log("  — skipped: no Chromium on this machine. The pages are not verified here.\n");
  process.exit(0);
}

const freePort = () => new Promise((res, rej) => {
  const s = net.createServer();
  s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); });
  s.on("error", rej);
});

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const port = await freePort();
const profile = fs.mkdtempSync("/tmp/etablix-cdp-");
const chrome = spawn(binary, [
  "--headless=new",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  "--no-sandbox",
  "--disable-gpu",
  "--disable-dev-shm-usage",
  "--no-first-run",
  "--no-default-browser-check",
  // EVERYTHING EXCEPT THE APPLICATION IS BLACKHOLED, for two reasons. The
  // first is that it works: these pages preconnect to a font CDN, and with no
  // route to it the load event never fires and every assertion below times
  // out against a page that is actually fine. The second is that it is the
  // more faithful test — what is being checked is this application's own
  // code, and a page that only paints when a third party is reachable is a
  // page with a dependency worth knowing about.
  "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost",
  "about:blank",
], { stdio: ["ignore", "ignore", "pipe"] });

let chromeErr = "";
chrome.stderr.on("data", (d) => { chromeErr += String(d); });

async function cdpTarget() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/list`);
      const list = await r.json();
      const page = list.find((t) => t.type === "page");
      if (page && page.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await wait(250);
  }
  throw new Error(`Chromium never opened a debugging port. ${chromeErr.slice(-300)}`);
}

let ws;
try {
  ws = new WebSocket(await cdpTarget());
} catch (err) {
  console.log("\n=== the internal pages, in a real browser ===\n");
  console.log(`  — skipped: ${err.message}\n`);
  chrome.kill("SIGKILL");
  process.exit(0);
}

await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error("could not connect to Chromium")); });

let msgId = 0;
const pending = new Map();
const events = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  events.push(m);
};
function send(method, params = {}) {
  const id = ++msgId;
  return new Promise((res, rej) => {
    const timer = setTimeout(() => rej(new Error(`${method} timed out`)), 30000);
    pending.set(id, (m) => { clearTimeout(timer); m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result); });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

/** Evaluate in the page and return the value, or throw what the page threw. */
async function evaluate(expression) {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}

/** Navigate and wait for the page's own load event rather than a fixed sleep. */
async function goto(url) {
  await send("Page.navigate", { url });
  let last = null;
  for (let i = 0; i < 100; i += 1) {
    await wait(100);
    const state = await evaluate("document.readyState").catch((e) => { last = e.message; return null; });
    // "interactive" is enough: the module scripts have run and the DOM is
    // there. Holding out for "complete" waits on subresources that may never
    // arrive, which is a slower way of testing somebody else's server.
    if (state === "complete" || state === "interactive") return;
  }
  throw new Error(`${url} never finished loading${last ? ` (${last})` : ""}`);
}

/** Wait until the page paints something other than its loading state. */
async function settled(selector, avoid) {
  for (let i = 0; i < 120; i += 1) {
    const text = await evaluate(`(document.querySelector(${JSON.stringify(selector)})||{}).textContent || ""`);
    if (text && !avoid.test(text)) return text;
    await wait(250);
  }
  return await evaluate(`(document.querySelector(${JSON.stringify(selector)})||{}).textContent || ""`);
}

console.log("\n=== the internal pages, in a real browser ===\n");

try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Log.enable").catch(() => {});

  // Every console error and every failed request, collected across the run.
  const consoleErrors = [];
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") {
      consoleErrors.push((m.params.args || []).map((a) => a.value || a.description || "").join(" "));
    }
    if (m.method === "Runtime.exceptionThrown") {
      consoleErrors.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || "exception");
    }
  });

  console.log("--- signing in the way a person does\n");
  await goto(`${BASE}/internal/login.html`);
  ok(await evaluate("!!document.querySelector('form') || !!document.querySelector('input[type=password]')"), "the login page paints a form");

  const token = await evaluate(`
    (async () => {
      const r = await fetch("/api/auth/login", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "admin@etablix.com", password: "etablix-admin-2026" }),
      });
      if (!r.ok) return null;
      const j = await r.json();
      sessionStorage.setItem("etablix.token", j.token);
      return j.token;
    })()
  `);
  ok(Boolean(token), "the browser signs in and holds a session");

  console.log("\n--- the Controls page, which is entirely built in the browser\n");
  await goto(`${BASE}/internal/l7.html`);
  const out = await settled("#out", /Running every control/);
  ok(!/could not be run/.test(out), "it did not paint an error", out.slice(0, 200));
  ok(out.length > 2000, `it painted ${out.length} characters of content, not an empty shell`);
  ok(/Level 7 properties/.test(out), "the measured position is on the page");
  ok(/Contract-native reasoning/.test(out), "every property is named");
  ok(/Adversarial self-challenge/.test(out), "including the one the challenger closed");
  ok(/ACU spent/.test(out), "THE ACU METER IS ON THE PAGE");
  ok(/ACU per run/.test(out), "with the cost of one run");
  ok(/Metering is not capping/.test(out), "and the sentence that says nothing is capped");
  ok(/uncapped/i.test(out), "showing the agents as uncapped");
  ok(/NO LLM ARITHMETIC AS AUTHORITY|no model, at any tier/.test(out), "arithmetic is shown as routed to no model");
  ok(/Who can see the price/.test(out), "the permission matrix is on the page");
  ok(/Challenge report|challenge/i.test(out), "and the challenger appears");
  {
    const rows = await evaluate("document.querySelectorAll('#out table tr').length");
    ok(rows > 60, `${rows} table rows rendered`, rows);
    const cells = await evaluate("document.querySelectorAll('#out td').length");
    ok(cells > 150, `${cells} cells of real data`, cells);
  }
  {
    // The numbers on the screen must be the numbers the API returned, not a
    // placeholder that survived a rename.
    const api = await evaluate(`fetch("/api/l7", { headers: { Authorization: "Bearer " + sessionStorage.getItem("etablix.token") } }).then(r => r.json())`);
    const shown = await evaluate(`document.querySelector("#out .num-row .num .v").textContent`);
    ok(shown === `${api.measured.counts.l7Built}/7`, `the headline count on screen is the one the API returned (${shown})`, shown);
    ok(api.measured.drift.levelSeven.length === 0 && api.measured.drift.foundations.length === 0,
       "and the register does not disagree with the measurement", api.measured.drift);
  }
  ok(/contract each project is actually under/i.test(out), "the clause graph is on the page");
  ok(/Memory, and the gate in front of it/i.test(out), "so is the memory and its gate");
  ok(/could tell the adapters apart/i.test(out), "and the ports with their conformance run");
  ok(/Boundaries with no port/i.test(out), "including the boundaries that have none, named rather than omitted");
  ok(/operations identical/.test(out), "the conformance result is a real count rather than a tick", (out.match(/\d+ operations identical/g) || []).slice(0, 3));
  ok(/Ungated, must be zero/.test(out), "and the memory's ungated count is shown, because zero is the only acceptable answer");
  {
    const undef = await evaluate(`(document.querySelector("#out").textContent.match(/undefined|NaN|\\[object Object\\]/g) || []).length`);
    ok(undef === 0, "NOTHING ON THE PAGE READS undefined, NaN OR [object Object] — the sign of a field renamed under a template", undef);
  }

  console.log("\n--- the Reach page\n");
  await goto(`${BASE}/internal/reach.html`);
  const reach = await settled("#out, main", /Loading|Reading/);
  ok(reach.length > 800, `it painted ${reach.length} characters`);
  ok(!/could not|failed/i.test(reach.slice(0, 400)), "without an error", reach.slice(0, 160));
  ok(/\d/.test(reach), "with numbers on it");
  {
    const undef = await evaluate(`(document.body.textContent.match(/undefined|NaN|\\[object Object\\]/g) || []).length`);
    ok(undef === 0, "and nothing undefined", undef);
  }

  console.log("\n--- the Control Desk\n");
  await goto(`${BASE}/internal/index.html`);
  await wait(1500);
  const desk = await evaluate("document.body.textContent");
  ok(desk.length > 1500, `the desk painted ${desk.length} characters`);
  ok(/Controls/.test(desk), "and links to the Controls page");
  {
    const tabs = await evaluate("document.querySelectorAll('#tabs a, #tabs button').length");
    ok(tabs > 0, `${tabs} desk tabs rendered`, tabs);
  }

  console.log("\n--- the Commercial Playbook\n");
  await goto(`${BASE}/internal/playbook.html`);
  // Wait for the content, not for a stopwatch. This was a flat 1500ms, which
  // was enough while the page's script was inline and not enough once it
  // moved into a file for the Content-Security Policy: an external module is
  // one more round trip before it even starts fetching the playbook. A fixed
  // sleep that is "usually enough" is a test that fails on a busy machine and
  // blames the application.
  const play = await settled("#pb", /Loading playbook/);
  ok(play.length > 800, `it painted ${play.length} characters`, play.slice(0, 120));

  console.log("\n--- what the browser complained about\n");
  const real = consoleErrors.filter((e) => !/favicon|Failed to load resource: the server responded with a status of 404/.test(e));
  ok(real.length === 0, "no page threw an error or logged one to the console", real.slice(0, 3));

  console.log("\n--- the public site, in the same browser\n");
  await goto(`${BASE}/`);
  const home = await evaluate("document.body.textContent");
  ok(/ETABLIX/.test(home), "the homepage paints");
  ok(!/undefined|\[object Object\]/.test(home), "with nothing undefined on it");
  {
    const noindex = await evaluate(`!!document.querySelector('meta[name=robots][content*=noindex]')`);
    ok(noindex === false, "and it is NOT noindexed — the public site is meant to be found");
  }
  await goto(`${BASE}/internal/l7.html`);
  {
    const noindex = await evaluate(`!!document.querySelector('meta[name=robots][content*=noindex]')`);
    ok(noindex === true, "while the Controls page is, because it is internal only");
  }
} catch (err) {
  fail += 1;
  console.log(`  ✗ the browser run failed: ${err.message}`);
} finally {
  try { ws.close(); } catch { /* closing */ }
  chrome.kill("SIGKILL");
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* gone */ }
}

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
