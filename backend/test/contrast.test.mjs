/**
 * Text people have to read must be readable.
 *
 *   node backend/test/contrast.test.mjs
 *
 * WHY. The supplier registration form faded sixteen of its twenty-one service
 * options to opacity 0.45 the moment somebody ticked the fifth, which is
 * about 3.2:1 against the panel behind them — under the 4.5:1 that ordinary
 * text needs. It was reported as "hard to see", which is what a contrast
 * failure feels like from the outside, and nothing in the build disagreed
 * because nothing was measuring.
 *
 * So this measures. It reads the palette out of the stylesheet, computes the
 * WCAG 2.1 ratio for the pairs that actually appear on screen, and fails on
 * anything a person is expected to read at under 4.5:1 — or 3:1 for large
 * text, which is where the standard draws it.
 *
 * It is deliberately a short list of real pairs rather than a crawl of every
 * possible combination: a test that flags theoretical pairs nobody renders
 * gets switched off within a month.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const css = fs.readFileSync(path.join(root, "frontend", "public", "css", "styles.css"), "utf8");

let pass = 0, fail = 0;
const ok = (c, m, x) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m + (x !== undefined ? "\n      → " + x : ""))); };

/** The palette, read from :root rather than copied and left to drift. */
const palette = Object.fromEntries(
  [...css.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{3,8})\s*;/gi)].map((m) => [m[1], m[2]])
);

const srgb = (hex) => {
  let h = hex.replace("#", "");
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
};
const lum = (hex) => {
  const [r, g, b] = srgb(hex).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (fg, bg) => {
  const a = lum(fg), b = lum(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};
/** What a colour becomes when it is drawn at partial opacity over another. */
const over = (fg, bg, alpha) => {
  const f = srgb(fg), b = srgb(bg);
  const mix = f.map((c, i) => c * alpha + b[i] * (1 - alpha));
  return "#" + mix.map((c) => Math.round(c * 255).toString(16).padStart(2, "0")).join("");
};

console.log("\n=== the palette is readable where it is actually used ===\n");

const P = (n) => { const v = palette[n]; if (!v) throw new Error(`no --${n} in the stylesheet`); return v; };

/* Real pairs, each one something a visitor reads. */
const PAIRS = [
  ["body text on the page", P("ink"), P("paper"), 4.5],
  ["body text on a card", P("ink"), P("white"), 4.5],
  ["muted text on the page", P("slate"), P("paper"), 4.5],
  ["muted text on a card", P("slate"), P("white"), 4.5],
  ["a disabled service option on its panel", P("slate"), P("white"), 4.5],
];

for (const [what, fg, bg, min] of PAIRS) {
  const r = ratio(fg, bg);
  ok(r >= min, `${what} — ${r.toFixed(2)}:1 (needs ${min}:1)`, `${fg} on ${bg}`);
}

console.log("\n--- the regression: fading text instead of recolouring it\n");
{
  // What the old rule produced, kept as the worked example of why the rule
  // changed rather than as a description of it.
  const faded = over(P("ink"), P("white"), 0.45);
  const was = ratio(faded, P("white"));
  ok(was < 4.5, `opacity 0.45 on the panel gave ${was.toFixed(2)}:1, which is why it was unreadable`);

  ok(!/\.cap-opt input:disabled \+ span \{[^}]*opacity/.test(css),
     "the disabled service option no longer fades");
  ok(/\.cap-opt input:disabled \+ span \{[^}]*color:\s*var\(--slate\)/.test(css),
     "it changes colour instead, which carries the same meaning and stays legible");

  // Any other opacity applied to text is worth a second look.
  const faders = [...css.matchAll(/([^{}]+)\{[^}]*opacity:\s*(0?\.\d+)[^}]*\}/g)]
    .map((m) => ({ sel: m[1].trim().split("\n").pop().trim(), a: Number(m[2]) }))
    .filter((d) => d.a < 0.6 && !/::?(before|after)|\.reveal|overlay|backdrop|scrim|hp-|spinner|loading/i.test(d.sel));
  ok(faders.length === 0,
     "and no other rule drops text below 60% opacity, which is where legibility goes",
     faders.map((d) => `${d.sel} → ${d.a}`).join("  |  "));
}

console.log("\n--- the service grid states its own colours\n");
{
  const block = (/\.cap-opt\s*\{[^}]*\}/.exec(css) || [""])[0];
  ok(/color:\s*var\(--ink\)/.test(block),
     "the options set a colour rather than inheriting one from whatever surrounds them");
  ok(/\.cap-grid\s*\{[^}]*background:\s*var\(--white\)/.test(css),
     "and the panel they sit on sets its background, so the pair is known");
}

console.log("\n--- every internal page uses a header class the stylesheet knows\n");
{
  // THE DEFECT THIS PINS. signals.html was written from scratch with
  // <header class="desk-header">. The stylesheet scopes every header rule
  // under .topbar, so none of it applied — including the one sizing the
  // logo. logo-mark-reverse.svg has a viewBox and no width, so it grew to
  // fill the page, pushed the content below the fold, and the page was
  // reported as missing. It had been served correctly the whole time.
  const internalCss = fs.readFileSync(path.join(root, "frontend", "internal", "css", "internal.css"), "utf8");
  const dir = path.join(root, "frontend", "internal");
  const pages = fs.readdirSync(dir).filter((f) => f.endsWith(".html"));
  ok(pages.length >= 3, `${pages.length} internal pages to check`);

  for (const f of pages) {
    const html = fs.readFileSync(path.join(dir, f), "utf8");
    const m = /<header[^>]*class="([^"]+)"/.exec(html);
    if (!m) continue;
    const cls = m[1].split(/\s+/)[0];
    ok(new RegExp(`\\.${cls}\\b`).test(internalCss),
       `${f}: header class "${cls}" is styled in internal.css`,
       `nothing in internal.css matches .${cls}`);
  }

  ok(/\.logo \.logo-mark \{[^}]*width:/.test(internalCss),
     "and the logo mark has a size that does not depend on its wrapper");
}

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
