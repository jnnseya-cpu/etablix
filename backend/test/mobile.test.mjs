/**
 * The rules that stop the pages panning sideways on a phone.
 *
 *   node backend/test/mobile.test.mjs
 *
 * WHAT WAS WRONG. Measured in Chromium at 390 × 844 (an iPhone 13), eight of
 * fifteen public pages overflowed the viewport — by 15, 23, 32, 40, 52, 73,
 * 92, 111 and 170 pixels — and the Control Desk by 574. A page that pans
 * sideways loses the right-hand edge of every line, and Google indexes the
 * mobile rendering rather than the desktop one, so it is also the version
 * that gets ranked.
 *
 * THE CAUSE WAS ONE RULE OF CSS, NOT EIGHT DESIGN MISTAKES. A grid or flex
 * child has `min-width: auto`: a track cannot shrink below the widest
 * unbreakable thing inside it. `.compare` carries `min-width: 720px` inside
 * `.compare-wrap`, which has `overflow-x: auto` and should have absorbed it —
 * but the wrapper is itself a grid child, so the 720px propagated up through
 * `.reveal`, `.split` and `.container` and pushed the page out. The scroll
 * wrappers were correct all along and were never allowed to work.
 *
 * WHAT THIS TEST CAN AND CANNOT DO. It reads the stylesheets and asserts the
 * rules are present, which is a check on the cause rather than on the
 * rendering. The rendering itself was measured in a real browser and came
 * back 15/15 public pages and 10 of 11 Control Desk tabs at zero overflow,
 * the eleventh at 3px; that measurement needs Playwright, which is not a
 * dependency of this repository, so it is not in this suite.
 *
 * The one rule worth stating: NOTHING HERE USES `overflow-x: hidden` ON THE
 * BODY. That removes the scrollbar and keeps the broken layout, and it is the
 * version of this fix that looks like it worked.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const site = fs.readFileSync(path.join(root, "frontend/public/css/styles.css"), "utf8");
const desk = fs.readFileSync(path.join(root, "frontend/internal/css/internal.css"), "utf8");

let pass = 0, fail = 0;
const ok = (c, m, x) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m + (x !== undefined ? "  → " + String(x).slice(0, 260) : ""))); };

console.log("\n=== the phone layout ===\n");

console.log("--- the grid children can shrink, so the scroll wrappers work\n");
{
  const block = site.match(/\.split > \*,[\s\S]{0,400}?min-width: 0;\s*\}/);
  ok(Boolean(block), "the min-width: 0 block exists");
  const text = block ? block[0] : "";
  for (const sel of [".split > *", ".grid-2 > *", ".grid-3 > *", ".grid-4 > *", ".steps > *", ".form-grid > *", ".hero-actions > *"]) {
    ok(text.includes(sel), `${sel} is in it`);
  }
  ok(/\.compare-wrap[^{]*\{[^}]*max-width: 100%/.test(site) || /\.compare-wrap, \.spec-table-wrap, \.table-wrap \{[\s\S]{0,120}max-width: 100%/.test(site),
     "and the scroll wrappers are capped at the viewport width");
}

console.log("\n--- the things that cannot wrap, wrap\n");
{
  ok(/@media \(max-width: 640px\)[\s\S]{0,700}\.btn \{[^}]*white-space: normal/.test(site),
     "a button label wraps below 640px — a nowrap label was 432px wide on a 390px screen");
  ok(/@media \(max-width: 640px\)[\s\S]{0,700}\.compare td:first-child \{[^}]*white-space: normal/.test(site),
     "and the comparison table's first column, which set the table's whole minimum width");
  ok(/h1, h2, h3, h4, h5[^{]*\{[^}]*overflow-wrap: break-word/.test(site),
     "a long word in a heading breaks rather than pushing the page — an <em> in an h1 was 445px");
  ok(/p, li, td, th, dd[^{]*\{[^}]*overflow-wrap: break-word/.test(site),
     "and so does one in body text, which is how a bare URL overflows a column");
  ok(/pre, \.code-block \{[^}]*overflow-x: auto/.test(site), "preformatted blocks scroll rather than stretching the page");
}

console.log("\n--- the Control Desk top bar wraps instead of running off the screen\n");
{
  const block = desk.match(/@media \(max-width: 700px\) \{[\s\S]*?\n\}/);
  ok(Boolean(block), "there is a phone block in the portal stylesheet");
  const text = block ? block[0] : "";
  ok(/\.topbar \{[^}]*height: auto/.test(text),
     "the bar's height is auto — a sticky element with a fixed height cannot wrap, it can only overflow");
  ok(/\.topbar \{[^}]*flex-wrap: wrap/.test(text), "and it wraps");
  ok(/\.topbar \.user-box \{[^}]*flex-wrap: wrap/.test(text),
     "the quick-action row wraps too: wrapping only the outer bar still left it 202px over");
  ok(/\.topbar \.user-box \{[^}]*flex-basis: 100%/.test(text), "and takes a full row of its own");
  ok(/min-width: 0/.test(text), "with the flex children allowed to shrink");
}

console.log("\n--- and nothing hides the overflow instead of fixing it\n");
{
  for (const [name, css] of [["the public site", site], ["the portal", desk]]) {
    ok(!/\bbody\s*\{[^}]*overflow-x:\s*hidden/.test(css) && !/\bhtml\s*,?\s*body\s*\{[^}]*overflow-x:\s*hidden/.test(css),
       `${name} does not set overflow-x: hidden on the body — that removes the scrollbar and keeps the broken layout`);
  }
  // The viewport meta is what makes any of this apply at all.
  const pages = ["frontend/public/index.html", "frontend/internal/index.html", "frontend/public/client-portal.html"];
  for (const p of pages) {
    const html = fs.readFileSync(path.join(root, p), "utf8");
    ok(/<meta name="viewport" content="width=device-width/.test(html), `${p} declares a device-width viewport`);
  }
}


console.log("\n--- installable as a PWA\n");
{
  // The web platform had to be stable before any of this was worth adding,
  // and it was not: eight pages panned sideways. It is now, so the metadata
  // that lets a phone install it to a home screen is here.
  //
  // WHAT IS DELIBERATELY ABSENT IS A SERVICE WORKER. Every screen in this
  // platform is server-rendered data, so a worker would have to decide what
  // to serve offline — and the cheap version, caching pages, is exactly what
  // the application's own no-cache headers exist to prevent: a browser
  // running a stale page against a new API. That is an offline design
  // decision, not a file to add.
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "frontend/public/manifest.webmanifest"), "utf8"));
  ok(manifest.name && manifest.short_name, "the manifest names the app", manifest.short_name);
  ok(manifest.display === "standalone", "it opens standalone rather than in a browser tab", manifest.display);
  ok(manifest.start_url === "/" && manifest.scope === "/", "with a start url and a scope");
  ok(manifest.theme_color && manifest.background_color, "and both colours, so the splash screen is not white");

  const sizes = (manifest.icons || []).map((i) => i.sizes);
  ok(sizes.includes("192x192"), "a 192px icon — Android will not offer an install without one", sizes.join(" "));
  ok(sizes.includes("512x512"), "a 512px icon, for the splash screen");
  ok((manifest.icons || []).some((i) => i.purpose === "maskable"), "and a maskable one, or Android crops the logo into a circle");
  for (const icon of manifest.icons || []) {
    if (icon.src.endsWith(".svg")) continue;
    const file = path.join(root, "frontend/public", icon.src.replace(/^\//, ""));
    ok(fs.existsSync(file), `${icon.src} exists`);
    const buf = fs.readFileSync(file);
    ok(buf.slice(1, 4).toString() === "PNG", `${icon.src} is a real PNG`);
    const declared = Number(String(icon.sizes).split("x")[0]);
    ok(buf.readUInt32BE(16) === declared, `${icon.src} is actually ${declared}px wide, not just labelled as it`, buf.readUInt32BE(16));
  }
  ok((manifest.shortcuts || []).length >= 3, "and it offers long-press shortcuts", (manifest.shortcuts || []).length);

  // Every page, not just the home page: a phone can install from whichever
  // page the visitor happens to be on.
  const pages = ["frontend/public/index.html", "frontend/public/contact.html",
                 "frontend/public/blog/six-stages-nobody-priced.html", "frontend/internal/index.html"];
  for (const f of pages) {
    const html = fs.readFileSync(path.join(root, f), "utf8");
    ok(/<link rel="manifest" href="\/manifest.webmanifest">/.test(html), `${f} links the manifest`);
    ok(/<meta name="theme-color"/.test(html), `${f} sets a theme colour`);
    ok(/<link rel="apple-touch-icon"/.test(html), `${f} carries an Apple touch icon — iOS ignores the manifest's icons`);
  }

  // The blog pages are generated, so the template has to carry it or the
  // next regeneration silently drops it from them.
  const gen = fs.readFileSync(path.join(root, "backend/tools/build-blog.mjs"), "utf8");
  ok(/manifest.webmanifest/.test(gen), "the blog generator's template carries it too, so a regeneration does not drop it");

  ok(!fs.existsSync(path.join(root, "frontend/public/sw.js")) && !fs.existsSync(path.join(root, "frontend/public/service-worker.js")),
     "and there is no service worker, because what to serve offline is a decision rather than a file");
}

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
