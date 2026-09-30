/**
 * Render a markdown brief as a readable Word and PDF document, in house style.
 *
 *   node business/tools/render-brief.cjs business/bids/sq-6-1-contract-examples.md
 *   node business/tools/render-brief.cjs <file.md> --kicker "SUBMISSION" --out business/bids
 *
 * WHY THIS EXISTS. There are 38 markdown briefs in business/. They are the
 * right format to write and to keep under version control, and the wrong format
 * to read: raw markdown on screen is pipes, hashes and asterisks. The briefs are
 * working documents the director has to read and act on, so they need to
 * render. This converts one into the same Word and PDF pair every other ETABLIX
 * document is issued as, from the same brand renderer, so there is no second
 * house style to maintain.
 *
 * IT IS A RENDERER, NOT A REWRITER. Nothing is summarised, reordered or
 * reworded: the markdown is the single source of truth and this reads it at
 * build time. Change the .md and re-run. That also means a brief cannot drift
 * out of step with its own rendered copy, which is exactly what happened
 * earlier in this project when generated files were edited by hand.
 *
 * THE SUBSET IT SUPPORTS is the subset the briefs actually use: ATX headings to
 * four levels, paragraphs, **bold**, *italic*, `code`, bullet and numbered
 * lists, pipe tables, blockquotes and horizontal rules. Anything it does not
 * recognise is emitted as a paragraph rather than dropped — losing a line of a
 * bid brief silently would be worse than rendering it plainly. A count of what
 * it rendered prints at the end so an unexpectedly low number is visible.
 */
const fs = require("node:fs");
const path = require("node:path");
const B = require("../policies/brand.cjs");

/* ---------- inline: **bold**, *italic*, `code` -> brand runs ---------- */
function runs(text) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|(?<![*\w])\*[^*\n]+\*(?!\w)|`[^`]+`)/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ t: text.slice(last, m.index) });
    const tok = m[0];
    if (tok.startsWith("**")) out.push({ t: tok.slice(2, -2), b: true });
    else if (tok.startsWith("`")) out.push({ t: tok.slice(1, -1), i: true });
    else out.push({ t: tok.slice(1, -1), i: true });
    last = m.index + tok.length;
  }
  if (last < text.length) out.push({ t: text.slice(last) });
  return out.length ? out : [{ t: text }];
}
const plain = (text) => runs(text).map((r) => r.t).join("");

/* ---------- block scanner ---------- */
function blocks(md) {
  const lines = md.replace(/\r/g, "").split("\n");
  const out = [];
  let i = 0;
  const isTableRow = (l) => /^\s*\|.*\|\s*$/.test(l);
  const isRule = (l) => /^\s*\|?[\s:|-]*-{2,}[\s:|-]*\|?\s*$/.test(l) && l.includes("-");

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i += 1; continue; }

    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) { out.push({ t: "h", level: h[1].length, text: h[2].trim() }); i += 1; continue; }

    if (/^\s*(---+|\*\*\*+|___+)\s*$/.test(line)) { out.push({ t: "hr" }); i += 1; continue; }

    /* pipe table: a header row, a delimiter row, then body rows */
    if (isTableRow(line) && i + 1 < lines.length && isRule(lines[i + 1]) && isTableRow(lines[i + 1])) {
      const cells = (l) => l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
      const head = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && isTableRow(lines[i])) { rows.push(cells(lines[i])); i += 1; }
      out.push({ t: "table", head, rows });
      continue;
    }

    /* blockquote: consecutive "> " lines, blank ">" separating paragraphs */
    if (/^\s*>/.test(line)) {
      const paras = [];
      let buf = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        const body = lines[i].replace(/^\s*>\s?/, "");
        if (!body.trim()) { if (buf.length) { paras.push(buf.join(" ")); buf = []; } }
        else if (/^[-*]\s+/.test(body)) {
          if (buf.length) { paras.push(buf.join(" ")); buf = []; }
          paras.push(body.trim());
        } else buf.push(body.trim());
        i += 1;
      }
      if (buf.length) paras.push(buf.join(" "));
      out.push({ t: "quote", paras });
      continue;
    }

    /* list: bullets and numbered items, continuation lines folded in */
    const li = /^\s*([-*]|\d+[.)])\s+(.*)$/.exec(line);
    if (li) {
      const items = [];
      while (i < lines.length) {
        const m2 = /^\s*([-*]|\d+[.)])\s+(.*)$/.exec(lines[i]);
        if (m2) {
          const num = /^\d/.test(m2[1]) ? m2[1].replace(/[.)]$/, "") : null;
          items.push({ num, text: m2[2].trim() });
          i += 1;
        } else if (lines[i].trim() && /^\s{2,}\S/.test(lines[i]) && items.length) {
          items[items.length - 1].text += " " + lines[i].trim();
          i += 1;
        } else break;
      }
      out.push({ t: "list", items });
      continue;
    }

    /* paragraph: to the next blank line or block opener */
    const buf = [];
    while (i < lines.length && lines[i].trim()
           && !/^(#{1,6})\s/.test(lines[i]) && !/^\s*>/.test(lines[i])
           && !/^\s*([-*]|\d+[.)])\s+/.test(lines[i]) && !isTableRow(lines[i])
           && !/^\s*(---+|\*\*\*+|___+)\s*$/.test(lines[i])) {
      buf.push(lines[i].trim()); i += 1;
    }
    if (buf.length) out.push({ t: "p", text: buf.join(" ") });
  }
  return out;
}

/* ---------- column widths: proportional to the longest cell ---------- */
function widths(head, rows, total = 8300) {
  const n = head.length;
  const longest = head.map((h, c) =>
    Math.max(plain(h).length, ...rows.map((r) => plain(r[c] || "").length)));
  const sum = longest.reduce((a, b) => a + b, 0) || n;
  const min = Math.floor(total / (n * 3));
  const raw = longest.map((L) => Math.max(min, Math.round((L / sum) * total)));
  const drift = total - raw.reduce((a, b) => a + b, 0);
  raw[raw.length - 1] += drift;
  return raw;
}

/* ---------- render ---------- */
function render(mdPathIn, opts = {}) {
  /* brand.cjs renders the PDF by pointing a browser at a file:// URL, so the
     output directory has to be absolute or the navigation fails. */
  const mdPath = path.resolve(mdPathIn);
  const md = fs.readFileSync(mdPath, "utf8");
  const bs = blocks(md);

  const first = bs.find((b) => b.t === "h" && b.level === 1);
  const title = (opts.title || (first && first.text) || path.basename(mdPath, ".md")).trim();
  const slug = (opts.slug || path.basename(mdPath, ".md"))
    .replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const d = B.doc({
    slug,
    running: title,
    kicker: opts.kicker || "WORKING BRIEF",
    title: title.toUpperCase(),
    sub: opts.sub || "internal working document — not for issue to a client or a buyer",
    rev: opts.rev || "1",
    outDir: path.resolve(opts.outDir || path.dirname(mdPath)),
    kind: "brief",
    draftNote: false,
    control: [
      ["Document", title],
      ["Source", path.relative(process.cwd(), mdPath)],
      ["Rendered", new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })],
      ["Status", "Rendered from the markdown source. Edit the source and re-run; do not edit this file."],
    ],
  });

  const counts = {};
  const bump = (k) => { counts[k] = (counts[k] || 0) + 1; };
  let seenTitle = false;

  for (const b of bs) {
    if (b.t === "h") {
      if (b.level === 1 && !seenTitle && b.text.trim() === title) { seenTitle = true; continue; }
      if (b.level <= 2) d.h1(b.text);
      else if (b.level === 3) d.h2(b.text);
      else d.rich(runs(b.text).map((r) => ({ ...r, b: true })));
      bump("heading");
    } else if (b.t === "p") {
      d.rich(runs(b.text)); bump("paragraph");
    } else if (b.t === "list") {
      for (const it of b.items) {
        d.richBullet(it.num ? [{ t: `${it.num}. `, b: true }, ...runs(it.text)] : runs(it.text));
        bump("bullet");
      }
    } else if (b.t === "table") {
      d.table(widths(b.head, b.rows), b.head.map(plain),
              b.rows.map((r) => b.head.map((_, c) => plain(r[c] || ""))), { size: 16 });
      bump("table");
    } else if (b.t === "quote") {
      for (const q of b.paras) {
        if (/^[-*]\s+/.test(q)) d.richBullet(runs(q.replace(/^[-*]\s+/, "")));
        else d.note(plain(q));
        bump("quote");
      }
    } else if (b.t === "hr") {
      bump("rule");
    }
  }

  return d.build().then(() => ({ title, counts, bs }));
}

module.exports = { render, blocks, runs, plain, widths };

/* ---------- CLI ---------- */
if (require.main === module) {
  const args = process.argv.slice(2);
  const files = [];
  const opts = {};
  for (let i = 0; i < args.length; i += 1) {
    if (args[i].startsWith("--")) { opts[args[i].slice(2)] = args[i + 1]; i += 1; }
    else files.push(args[i]);
  }
  if (!files.length) {
    console.error("usage: node business/tools/render-brief.cjs <file.md> [...] [--kicker T] [--out DIR]");
    process.exit(2);
  }
  if (opts.out) opts.outDir = opts.out;
  (async () => {
    for (const f of files) {
      const { title, counts, bs } = await render(f, { ...opts });
      const n = Object.entries(counts).map(([k, v]) => `${v} ${k}${v === 1 ? "" : "s"}`).join(", ");
      console.log(`  ${title}\n    ${bs.length} blocks in, rendered: ${n || "nothing"}\n`);
    }
  })().catch((err) => { console.error(err); process.exit(1); });
}
