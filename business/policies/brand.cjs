/**
 * ETABLIX document branding — the house style, as a renderer.
 *
 * One content list, two outputs. Every block is recorded as data as it is
 * built and rendered twice: through the `docx` library for Word, and as HTML
 * that Playwright prints to PDF.
 *
 * That is not a flourish. LibreOffice in this environment ships without its
 * Writer module — `libswlo.so` is absent — so `soffice` cannot load a .docx
 * at all and the PDF cannot be converted from the Word file. Rendering both
 * from one list is also the only way to guarantee the two files say the same
 * thing, which matters more for a policy than for anything else: a Word copy
 * and a PDF copy of the same policy that differ is a governance defect.
 *
 * The print runs through Playwright rather than the Chromium command line
 * because only the protocol print exposes a footer template, and a policy of
 * any length with no page numbers cannot be referenced in a meeting.
 *
 *   const B = require("./brand.cjs");
 *   const d = B.doc({ slug: "edi", kicker: "...", title: "...", sub: "...",
 *                     control: [["Document", "..."]] });
 *   d.h1("1. Heading");  d.p("Words.");  d.bullet("A point.");
 *   d.build();
 *
 * `docx` is not a project dependency and is not in package.json. It lives in
 * the session scratchpad; set ETABLIX_DOCX to point elsewhere.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const DOCX = process.env.ETABLIX_DOCX
  || "/tmp/claude-0/-home-user-etablix/fe91c2e4-7425-5fd0-aa86-a0a156d734f1/scratchpad/docxlib/node_modules/docx";
const PLAYWRIGHT = process.env.ETABLIX_PLAYWRIGHT
  || path.join(execSync("npm root -g").toString().trim(), "playwright");

const D = require(DOCX);
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        WidthType, ShadingType, BorderStyle, PageBreak, Header, Footer,
        PageNumber, AlignmentType, LevelFormat, HeadingLevel } = D;

const INK = "14181D", GOLD = "9C7A3C", SLATE = "5B6672", PAPER = "F2EFE7", TINT = "EFE6D2";
const F = "Arial";
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const COMPANY = "A trading name of JNN GLOBAL LTD · Company number 15405437";
const FOOTER_ID = "JNN GLOBAL LTD · 15405437";

function doc(meta) {
  const { slug, kicker, title, sub, rev = "1", running, control = [],
          outDir = __dirname, kind = "policy" } = meta;
  const outBase = path.join(outDir, "ETABLIX-" + slug);
  const blocks = [];
  const body = [];
  const push = (kind, data, node) => { blocks.push({ kind, ...data }); body.push(node); return node; };

  /* ---------- paragraph primitives ---------- */
  const p = (text, o = {}) => push("p", { text, o }, new Paragraph({
    spacing: { before: o.before ?? 90, after: o.after ?? 90, line: 280 },
    border: o.rule ? { bottom: { style: BorderStyle.SINGLE, size: 6, color: GOLD, space: 6 } } : undefined,
    children: [new TextRun({ text, font: F, size: o.size ?? 20, bold: o.bold,
                             italics: o.italics, color: o.color ?? INK })],
  }));

  const rich = (runs, o = {}) => push("rich", { runs }, new Paragraph({
    spacing: { before: o.before ?? 90, after: o.after ?? 90, line: 280 },
    children: runs.map((r) => new TextRun({ text: r.t, font: F, size: 20,
      bold: r.b, italics: r.i, color: r.c ?? INK })),
  }));

  const h1 = (text) => push("h1", { text }, new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 380, after: 150 }, keepNext: true,
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: GOLD, space: 6 } },
    children: [new TextRun({ text, font: F, size: 26, bold: true, color: INK })],
  }));

  const h2 = (text) => push("h2", { text }, new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 260, after: 110 }, keepNext: true,
    children: [new TextRun({ text, font: F, size: 21, bold: true, color: GOLD })],
  }));

  const bullet = (text) => push("bullet", { text }, new Paragraph({
    numbering: { reference: "etx-bullets", level: 0 },
    spacing: { before: 50, after: 50, line: 280 },
    children: [new TextRun({ text, font: F, size: 20, color: INK })],
  }));

  const richBullet = (runs) => push("richBullet", { runs }, new Paragraph({
    numbering: { reference: "etx-bullets", level: 0 },
    spacing: { before: 50, after: 50, line: 280 },
    children: runs.map((r) => new TextRun({ text: r.t, font: F, size: 20,
      bold: r.b, italics: r.i, color: r.c ?? INK })),
  }));

  const note = (text) => push("note", { text }, new Paragraph({
    spacing: { before: 150, after: 150, line: 280 },
    shading: { type: ShadingType.CLEAR, fill: TINT, color: "auto" },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: GOLD, space: 10 } },
    indent: { left: 170, right: 170 },
    children: [new TextRun({ text, font: F, size: 19, color: INK })],
  }));

  const fillIn = (text) => push("fill", { text }, new Paragraph({
    spacing: { before: 90, after: 90, line: 280 }, indent: { left: 170 },
    children: [new TextRun({ text, font: F, size: 19, italics: true, color: SLATE })],
  }));

  const pageBreak = () => push("break", {}, new Paragraph({ children: [new PageBreak()] }));

  /* ---------- tables ---------- */
  const cell = (text, o = {}) => new TableCell({
    width: { size: o.w, type: WidthType.DXA },
    shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill, color: "auto" } : undefined,
    margins: { top: 70, bottom: 70, left: 110, right: 110 },
    children: [new Paragraph({
      spacing: { before: 0, after: 0, line: 250 },
      children: [new TextRun({ text, font: F, size: o.size ?? 18, bold: o.bold, color: o.color ?? INK })],
    })],
  });

  const table = (widths, head, rows) => push("table", { head, rows }, new Table({
    width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true,
        children: head.map((t, i) => cell(t, { w: widths[i], bold: true, fill: INK, color: "FFFFFF", size: 17 })) }),
      ...rows.map((r, ri) => new TableRow({
        children: r.map((t, i) => cell(t, { w: widths[i], fill: ri % 2 ? PAPER : undefined })) })),
    ],
  }));

  /* ---------- cover ---------- */
  push("brand", {}, new Paragraph({ spacing: { before: 760, after: 0 },
    children: [new TextRun({ text: "ETABLIX", font: F, size: 56, bold: true, color: INK })] }));
  push("strap", {}, new Paragraph({ spacing: { before: 0, after: 60 },
    children: [new TextRun({ text: "INTEGRATED SITE SERVICES", font: F, size: 18, bold: true, color: GOLD })] }));
  p(COMPANY, { size: 18, color: SLATE, rule: true, after: 380 });
  push("kicker", { text: kicker }, new Paragraph({ spacing: { before: 260, after: 0 },
    children: [new TextRun({ text: kicker, font: F, size: 30, bold: true, color: GOLD })] }));
  push("title", { text: title }, new Paragraph({ spacing: { before: 0, after: 0 },
    children: [new TextRun({ text: title, font: F, size: 44, bold: true, color: INK })] }));
  if (sub) push("sub", { text: sub }, new Paragraph({ spacing: { before: 60, after: 420 },
    children: [new TextRun({ text: sub, font: F, size: 26, color: SLATE })] }));
  if (control.length) table([2300, 6000], ["", ""], control);
  p("", { after: 300 });
  note("This document is issued in draft until every bracketed field is completed and it is "
     + `signed and dated. An unsigned, undated ${kind} is treated at a selection stage as a `
     + "draft, and a draft evidences nothing.");
  pageBreak();

  /* ---------- signature ---------- */
  const approval = () => {
    h1("Approval");
    p("This policy is a live document. It is reviewed on the dates recorded on the cover and "
    + "reissued whenever the work, the people or the law changes.", { after: 380 });
    p("Signed  ..............................................................", { after: 140 });
    p("Name  [name]", { after: 60 });
    p("Position  Managing Director", { after: 60 });
    p("Date  ....................................", { after: 300 });
  };

  /* ---------- html ---------- */
  const runsHtml = (runs) => runs.map((r) =>
    `<span${r.b ? ' class="b"' : r.i ? ' class="i"' : ""}>${esc(r.t)}</span>`).join("");

  function html() {
    const out = [];
    let inList = false;
    const closeList = () => { if (inList) { out.push("</ul>"); inList = false; } };
    const openList = () => { if (!inList) { out.push("<ul>"); inList = true; } };

    for (const b of blocks) {
      if (b.kind !== "bullet" && b.kind !== "richBullet") closeList();
      switch (b.kind) {
        case "brand":  out.push('<p class="brand">ETABLIX</p>'); break;
        case "strap":  out.push('<p class="strap">INTEGRATED SITE SERVICES</p>'); break;
        case "kicker": out.push(`<p class="kicker">${esc(b.text)}</p>`); break;
        case "title":  out.push(`<h1 class="doctitle">${esc(b.text)}</h1>`); break;
        case "sub":    out.push(`<p class="docsub">${esc(b.text)}</p>`); break;
        case "break":  out.push('<div class="pb"></div>'); break;
        case "h1":     out.push(`<h2>${esc(b.text)}</h2>`); break;
        case "h2":     out.push(`<h3>${esc(b.text)}</h3>`); break;
        case "note":   out.push(`<div class="note">${esc(b.text)}</div>`); break;
        case "fill":   out.push(`<p class="fillin">${esc(b.text)}</p>`); break;
        case "bullet": openList(); out.push(`<li>${esc(b.text)}</li>`); break;
        case "richBullet": openList(); out.push(`<li>${runsHtml(b.runs)}</li>`); break;
        case "rich":   out.push(`<p>${runsHtml(b.runs)}</p>`); break;
        case "p": {
          if (!b.text) { out.push('<p class="spacer"></p>'); break; }
          const cls = [];
          if (b.o && b.o.rule) cls.push("rule");
          if (b.o && b.o.color === SLATE) cls.push("muted");
          out.push(`<p${cls.length ? ` class="${cls.join(" ")}"` : ""}>${esc(b.text)}</p>`);
          break;
        }
        case "table": {
          const blank = b.head.every((h) => h === "");
          const rows = b.rows.map((r) =>
            `<tr>${r.map((c, i) => `<td${blank && i === 0 ? ' class="k"' : ""}>${esc(c)}</td>`).join("")}</tr>`).join("");
          const head = blank ? ""
            : `<thead><tr>${b.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>`;
          out.push(`<table${blank ? ' class="plain"' : ""}>${head}<tbody>${rows}</tbody></table>`);
          break;
        }
        default: break;
      }
    }
    closeList();

    return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8">
<title>ETABLIX — ${esc(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; line-height: 1.5;
         color: #${INK}; margin: 0; }
  p { margin: 0 0 7pt; }
  .spacer { margin: 0 0 10pt; }
  .b { font-weight: 700; } .i { font-style: italic; }
  .muted { color: #${SLATE}; }
  .brand { font-size: 30pt; font-weight: 700; letter-spacing: -0.5pt; margin: 26mm 0 0; }
  .strap { font-size: 9pt; font-weight: 700; letter-spacing: 2pt; color: #${GOLD}; margin: 0 0 3pt; }
  .rule { border-bottom: 1.2pt solid #${GOLD}; padding-bottom: 6pt; margin-bottom: 16pt; }
  .kicker { font-size: 15pt; font-weight: 700; color: #${GOLD}; margin: 12pt 0 0; letter-spacing: 0.5pt; }
  .doctitle { font-size: 25pt; font-weight: 700; margin: 0; line-height: 1.1; letter-spacing: -0.5pt; }
  .docsub { font-size: 13pt; color: #${SLATE}; margin: 3pt 0 18pt; }
  h2 { font-size: 13.5pt; margin: 20pt 0 7pt; padding-bottom: 4pt;
       border-bottom: 1.4pt solid #${GOLD}; page-break-after: avoid; }
  h3 { font-size: 11pt; color: #${GOLD}; margin: 14pt 0 5pt; page-break-after: avoid; }
  ul { margin: 4pt 0 8pt; padding-left: 16pt; }
  li { margin: 0 0 3.5pt; padding-left: 3pt; }
  li::marker { color: #${GOLD}; font-weight: 700; content: "– "; }
  .note { background: #${TINT}; border-left: 3pt solid #${GOLD}; padding: 8pt 11pt;
          margin: 9pt 0; font-size: 9.5pt; page-break-inside: avoid; }
  .fillin { font-style: italic; color: #${SLATE}; font-size: 9.5pt; padding-left: 9pt; }
  table { width: 100%; border-collapse: collapse; margin: 7pt 0 11pt;
          font-size: 8.8pt; page-break-inside: avoid; }
  th { background: #${INK}; color: #fff; text-align: left; padding: 5pt 7pt;
       font-size: 8.4pt; font-weight: 700; }
  td { padding: 5pt 7pt; vertical-align: top; border-bottom: 0.5pt solid #d8d3c6; }
  tbody tr:nth-child(even) td { background: #${PAPER}; }
  table.plain th { display: none; }
  td.k { font-weight: 700; width: 28%; }
  .pb { page-break-after: always; }
</style></head><body>
${out.join("\n")}
</body></html>`;
  }

  /* ---------- build ---------- */
  async function build() {
    const head = (running || title) + " · Rev " + rev;
    const document = new Document({
      creator: "ETABLIX — Integrated Site Services",
      title, description: "ETABLIX " + title,
      numbering: { config: [{ reference: "etx-bullets", levels: [{
        level: 0, format: LevelFormat.BULLET, text: "–", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 360, hanging: 200 } },
                 run: { color: GOLD, font: F, bold: true } } }] }] },
      styles: { default: { document: { run: { font: F, size: 20, color: INK } } } },
      sections: [{
        properties: { page: { margin: { top: 1100, right: 1100, bottom: 1100, left: 1100 } } },
        headers: { default: new Header({ children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: TINT, space: 4 } },
          children: [new TextRun({ text: "ETABLIX · " + head, font: F, size: 14, color: SLATE })] })] }) },
        footers: { default: new Footer({ children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({ text: FOOTER_ID + "          ", font: F, size: 14, color: SLATE }),
            new TextRun({ children: [PageNumber.CURRENT], font: F, size: 14, color: SLATE }),
            new TextRun({ text: " of ", font: F, size: 14, color: SLATE }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], font: F, size: 14, color: SLATE }),
          ] })] }) },
        children: body,
      }],
    });

    fs.writeFileSync(outBase + ".docx", await Packer.toBuffer(document));
    console.log("wrote " + outBase + ".docx");

    const htmlPath = path.join(outDir, "." + slug + ".html");
    fs.writeFileSync(htmlPath, html());
    const { chromium } = require(PLAYWRIGHT);
    const rule = `color:#${SLATE};font-family:Arial,Helvetica,sans-serif;font-size:7pt;width:100%;padding:0 19mm;`;
    const browser = await chromium.launch({ args: ["--no-sandbox"] });
    const page = await browser.newPage();
    await page.goto("file://" + htmlPath, { waitUntil: "load" });
    await page.pdf({
      path: outBase + ".pdf", format: "A4", printBackground: true,
      margin: { top: "22mm", right: "19mm", bottom: "17mm", left: "19mm" },
      displayHeaderFooter: true,
      headerTemplate: `<div style="${rule}text-align:right;">ETABLIX · ${esc(head)}</div>`,
      footerTemplate: `<div style="${rule}display:flex;justify-content:space-between;">`
        + `<span>${FOOTER_ID}</span>`
        + `<span><span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`,
    });
    await browser.close();
    if (!process.env.ETABLIX_KEEP_HTML) fs.unlinkSync(htmlPath);
    console.log("wrote " + outBase + ".pdf");
  }

  return { p, rich, h1, h2, bullet, richBullet, note, fillIn, table, pageBreak,
           approval, build, blocks };
}

module.exports = { doc, INK, GOLD, SLATE, PAPER, TINT, F };
