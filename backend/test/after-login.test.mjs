/**
 * A deep link survives sign-in, and cannot be turned into an open redirect.
 *
 *   node backend/test/after-login.test.mjs
 *
 * WHY. Signing in always went to the Control Desk, so any link to an internal
 * page was discarded by the sign-in it triggered: open /internal/signals.html
 * with an expired session, get bounced to login, sign in, land on the desk.
 * The page asked for is never reached, and the reasonable conclusion is that
 * it does not exist — which is how it was reported, about a page that was
 * being served correctly the whole time.
 *
 * The fix stores where you were going. That stored value then decides where
 * the browser goes next, which makes it a redirect target, which makes it
 * worth attacking even though we wrote it ourselves. So the second half of
 * this file is the open-redirect cases.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const jsDir = path.join(root, "frontend", "internal", "js");
let pass = 0, fail = 0;
const ok = (c, m, x) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m + (x !== undefined ? "\n      → " + x : ""))); };

const login = fs.readFileSync(path.join(jsDir, "login.js"), "utf8");

console.log("\n=== the page you asked for is the page you get ===\n");
{
  ok(/function afterLogin\(\)/.test(login), "login decides a destination rather than hard-coding one");
  ok(!/location\.replace\("\/internal\/index\.html"\)/.test(login),
     "and no longer sends everybody to the desk regardless");
  ok((login.match(/location\.replace\(afterLogin\(\)\)/g) || []).length === 2,
     "on both paths — already signed in, and just signed in");

  // Every page that bounces to login must leave a note saying where it was.
  const pages = fs.readdirSync(jsDir).filter((f) => f.endsWith(".js") && f !== "login.js");
  const bouncers = pages.filter((f) => fs.readFileSync(path.join(jsDir, f), "utf8").includes('/internal/login.html'));
  ok(bouncers.length >= 5, `${bouncers.length} internal pages bounce to login`);
  for (const f of bouncers) {
    const src = fs.readFileSync(path.join(jsDir, f), "utf8");
    ok(src.includes("etablix.after-login"), `${f} remembers where it was going`);
  }
}

console.log("\n--- signing out is not a round trip\n");
{
  for (const f of fs.readdirSync(jsDir).filter((x) => x.endsWith(".js"))) {
    const src = fs.readFileSync(path.join(jsDir, f), "utf8");
    for (const m of src.matchAll(/getElementById\("logout"\)[\s\S]{0,400}?\}\);/g)) {
      ok(!m[0].includes("after-login"),
         `${f}: signing out does not queue a return trip`, m[0].slice(0, 120));
    }
  }
}

console.log("\n--- the stored destination is a redirect target, so it is attacked\n");
{
  // Run the real function, rather than asserting on its source.
  const body = /function afterLogin\(\)\s*\{[\s\S]*?\n\}/.exec(login)[0];
  const store = new Map();
  const sessionStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  // The function resolves the stored path against the page's origin, so the
  // harness has to supply one — the same way the browser does.
  const location = { origin: "https://etablix.com" };
  const afterLogin = new Function("sessionStorage", "location", `${body}; return afterLogin;`)(sessionStorage, location);
  const DESK = "/internal/index.html";

  const allowed = ["/internal/signals.html", "/internal/reach.html", "/internal/index.html#clients",
                   "/internal/signals.html?status=new"];
  for (const w of allowed) {
    store.set("etablix.after-login", w);
    ok(afterLogin() === w, `returns to ${w}`, afterLogin());
  }

  const refused = {
    "//evil.example/internal/x": "a protocol-relative host",
    "https://evil.example/internal/x": "an absolute url",
    "/internal/../../etc/passwd": "a traversal",
    "/public/index.html": "a path outside /internal/",
    "javascript:alert(1)": "a javascript scheme",
    "\\\\evil.example\\internal": "a backslash host",
    "/internal/login.html": "login itself, which would loop",
    "": "an empty value",
  };
  for (const [w, why] of Object.entries(refused)) {
    store.set("etablix.after-login", w);
    const got = afterLogin();
    ok(got === DESK, `refuses ${why} and goes to the desk`, `${JSON.stringify(w)} → ${got}`);
  }

  store.set("etablix.after-login", "/internal/signals.html");
  afterLogin();
  ok(store.has("etablix.after-login") === false,
     "and the destination is used once, then forgotten");
}

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
