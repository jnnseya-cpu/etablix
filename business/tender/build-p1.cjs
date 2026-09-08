const fs = require("fs");
const D = require("/tmp/claude-0/-home-user-etablix/fe91c2e4-7425-5fd0-aa86-a0a156d734f1/scratchpad/docxlib/node_modules/docx");
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType,
        HeadingLevel, BorderStyle, PageBreak, Header, Footer, PageNumber, TableOfContents, AlignmentType } = D;
const C = require("/home/user/etablix/business/tender/p1-content.cjs");
const S = require("/home/user/etablix/business/tender/p1-spec.cjs");
const E = require("/home/user/etablix/business/tender/p1-extra.cjs");
const Z = require("/home/user/etablix/business/tender/p1-close.cjs");

const INK="14181D", GOLD="9C7A3C", SLATE="5B6672", RED="C0392B", PAPER="F2EFE7", TINT="EFE6D2", WARN="F6E9E6";
const W = 9020, F = "Arial";
const cellB = ["top","bottom","left","right"].reduce((o,k)=>((o[k]={style:BorderStyle.SINGLE,size:2,color:"D5D5D5"}),o),{});

const SEC = {
  intro:       { n: 1,  list: C.opening },
  definitions: { n: 2 },
  works:       { n: 3,  refs: C.works.filter((r) => r[1]).map((r) => r[0]) },
  tolerance:   { n: 4,  rows: C.tolerances },
  spec:        { n: 5,  list: S.spec },
  iface:       { n: 6,  refs: S.ifaces.map((r) => r[0]) },
  performance: { n: 7 },
  occupied:    { n: 8,  list: E.occupied },
  programme:   { n: 9,  list: E.programme },
  hse:         { n: 10, list: E.hse },
  info:        { n: 11, list: E.info },
  change:      { n: 12, list: E.change },
  defects:     { n: 13, list: E.defects },
  sustain:     { n: 14, list: E.sustain },
  labour:      { n: 15, list: E.labour },
  demob:       { n: 16, list: E.demob },
  pricing:     { n: 17, list: Z.pricing },
  register:    { n: 18 },
  appendices:  { n: 19 },
};

function resolve(text) {
  return String(text).replace(/\{\{(§?)([a-z]+)(?:\.([A-Za-z0-9-]+))?\}\}/g, (whole, sect, name, sub) => {
    const s = SEC[name];
    if (!s) throw new Error(`Unknown reference target in "${whole}"`);
    if (sect) return `section ${s.n}`;  // a bare number reads as a stray digit in prose
    if (s.refs) {
      if (!s.refs.includes(sub)) throw new Error(`Unknown reference "${whole}"`);
      return sub;
    }
    if (s.rows) {                        // a schedule row — return its own reference, e.g. T-04
      const i = Number(sub);
      if (!(i >= 1 && i <= s.rows.length)) throw new Error(`"${whole}" out of range — ${name} has ${s.rows.length} rows`);
      return s.rows[i - 1][0];
    }
    if (!s.list) throw new Error(`Section ${name} has no clauses but "${whole}" points at one`);
    if (Number(sub) < 1 || Number(sub) > s.list.length) throw new Error(`"${whole}" out of range — ${name} has ${s.list.length}`);
    return `${s.n}.${sub}`;
  });
}

const p = (t, o = {}) => new Paragraph({ spacing: { before: o.before ?? 60, after: o.after ?? 60, line: 260 }, indent: o.indent,
  children: [new TextRun({ text: resolve(t), font: F, size: o.size ?? 19, bold: o.bold, italics: o.italics, color: o.color ?? INK })] });
const paras = (t, o = {}) => String(t).split("\n").filter((l) => l.trim()).map((l) => p(l, o));
const h1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 340, after: 130 },
  children: [new TextRun({ text: t, font: F, size: 28, bold: true, color: INK })] });
const h2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 230, after: 95 },
  children: [new TextRun({ text: t, font: F, size: 21, bold: true, color: GOLD })] });
const cell = (t, o = {}) => new TableCell({ width: { size: o.w, type: WidthType.DXA }, borders: cellB,
  margins: { top: 55, bottom: 55, left: 85, right: 85 }, columnSpan: o.span,
  shading: o.fill ? { type: ShadingType.CLEAR, color: "auto", fill: o.fill } : undefined,
  children: (Array.isArray(t) ? t : [t]).map((x) => new Paragraph({ spacing: { before: 18, after: 18, line: 235 },
    children: [new TextRun({ text: resolve(x), font: F, size: o.size ?? 15, bold: o.bold, italics: o.italics, color: o.color ?? INK })] })) });
const table = (w, rs) => new Table({ columnWidths: w, width: { size: W, type: WidthType.DXA }, rows: rs });
const hdr = (w, l) => new TableRow({ tableHeader: true, children: l.map((x, i) => cell(x, { w: w[i], bold: true, fill: INK, color: "FFFFFF", size: 15 })) });
const bodyRows = (w, d, o = {}) => d.map((r) => new TableRow({ children: r.map((v, i) =>
  cell(v, { w: w[i], bold: (o.bold || []).includes(i), size: o.size ?? 15, fill: o.fill ? o.fill(r, i) : undefined })) }));
const grid = (w, l, d, o = {}) => table(w, [hdr(w, l), ...bodyRows(w, d, o)]);
const br = () => new Paragraph({ children: [new PageBreak()] });
const note = (t) => p(t, { italics: true, color: SLATE, size: 17, before: 90 });
const flag = (t) => p(t, { italics: true, color: RED, size: 17, before: 90 });
function clauses(name) {
  const s = SEC[name];
  return s.list.flatMap(([sub, title, body], i) => {
    if (Number(sub) !== i + 1) throw new Error(`${name} clause ${i + 1} is labelled ${sub} — data out of order`);
    return [h2(`${s.n}.${sub}  ${title}`), ...(body ? paras(body) : [])];
  });
}

const doc = [];
const meta = C.meta;
doc.push(new Paragraph({ spacing: { before: 1600, after: 0 }, children: [new TextRun({ text: "ETABLIX", font: F, size: 54, bold: true, color: INK })] }));
doc.push(new Paragraph({ spacing: { after: 760 }, children: [new TextRun({ text: "I N T E G R A T E D   S I T E   S E R V I C E S   ·   P A R T   O F   G R O U P E   N S E Y A", font: F, size: 14, bold: true, color: GOLD })] }));
doc.push(p("EMPLOYER'S REQUIREMENTS", { size: 38, bold: true, before: 0, after: 50 }));
doc.push(p(meta.package, { size: 28, color: GOLD, bold: true, after: 640 }));
doc.push(table([2400, 6620], bodyRows([2400, 6620], [
  ["Client", meta.client], ["Project", meta.project], ["Package", meta.package],
  ["Scope", meta.scope], ["Document reference", meta.ref], ["Revision", meta.rev],
  ["Date", meta.date], ["Status", "Issued for tender"],
], { bold: [0], size: 18, fill: (r, i) => (i === 0 ? PAPER : undefined) })));
doc.push(p("This package is on site first and leaves last, and every other package is built on what it leaves behind. Section 4 — the tolerances — is the most important section in this document, and a tenderer should read it before pricing anything else.",
  { before: 600, italics: true, color: SLATE, size: 18 }));
doc.push(br());
doc.push(h1("Contents"));
doc.push(new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-2" }));
doc.push(br());

doc.push(h1(`${SEC.intro.n}  Introduction, and what this package really is`));
doc.push(...clauses("intro"));
doc.push(br());

doc.push(h1(`${SEC.definitions.n}  Definitions`));
{ const w = [2100, 6920]; doc.push(grid(w, ["Term", "Meaning"], C.defs, { bold: [0], size: 16 })); }
doc.push(br());

doc.push(h1(`${SEC.works.n}  The works`));
doc.push(p("Every line carries a basis code. E means the Employer has prescribed the thing and carries the risk that what is described achieves the outcome; C means the Employer has stated a duty and the Contractor investigates, designs, selects and warrants the means. Clause 1.2 states the only two reasons a line here is prescribed."));
{ const w = [620, 1750, 3520, 440, 2690];
  doc.push(grid(w, ["Ref", "Work", "The requirement, or the duty", "", "Note"], C.works, { bold: [0, 1, 3],
    fill: (r, i) => (r[1] === "" ? PAPER : (i === 3 && r[3] === "C" ? TINT : undefined)) })); }
doc.push(note("A shaded row is a group heading. A tinted basis cell is a Contractor-designed line."));
doc.push(br());

doc.push(h1(`${SEC.tolerance.n}  Tolerances — the section the rest of the project is built on`));
doc.push(...paras(C.toleranceNote));
{ const w = [620, 2100, 1400, 1900, 3000];
  doc.push(grid(w, ["Ref", "What", "Tolerance", "Measured how", "Why it matters"], C.tolerances, { bold: [0, 2],
    fill: (r) => (/T-03|T-12/.test(r[0]) ? WARN : undefined) })); }
doc.push(flag("The two shaded rows are the ones that damage a building rather than merely annoy a surveyor: T-03, because a module spanning two bases at different levels is racked before it is loaded, and T-12, because differential settlement opens the joint and breaks the service connection two years after everybody has left."));
doc.push(br());

doc.push(h1(`${SEC.spec.n}  Specification, element by element`));
doc.push(...clauses("spec"));
doc.push(br());

doc.push(h1(`${SEC.iface.n}  Interfaces`));
doc.push(p("This package hands over to every other package on the project and receives almost nothing back. Each interface states what crosses it, who certifies it and when."));
{ const w = [700, 1750, 2900, 2150, 1520];
  doc.push(grid(w, ["Ref", "With", "What crosses it", "Who certifies", "When"], S.ifaces, { bold: [0, 1],
    fill: (r) => (r[0] === "IF-04" ? WARN : undefined) })); }
doc.push(flag("IF-04 is shaded because it is the only interface on this project where getting it wrong kills somebody. See " + SEC.spec.n + ".7."));
doc.push(br());

doc.push(h1(`${SEC.performance.n}  Performance schedule`));
doc.push(p("These are the Employer's requirements. Compliance with statute is the Contractor's duty and is not discharged by meeting them."));
{ const w = [2600, 3400, 3020];
  doc.push(grid(w, ["Criterion", "Requirement", "How it is verified"], E.perf, { bold: [0] })); }
doc.push(br());

for (const [key, title] of [
  ["occupied", "Working alongside an occupied village"],
  ["programme", "Programme, delay and damages"],
  ["hse", "Health and safety"],
  ["info", "Information and asset data"],
  ["change", "Change control"],
  ["defects", "Defects, response and settlement"],
  ["sustain", "Earthworks carbon, water and waste"],
  ["labour", "Labour standards"],
  ["demob", "Removal and reinstatement"],
  ["pricing", "Pricing"],
]) {
  doc.push(h1(`${SEC[key].n}  ${title}`));
  doc.push(...clauses(key));
  if (key === "pricing") {
    const w = [640, 3800, 1560, 3020];
    doc.push(grid(w, ["Item", "Description", "Basis", "Note"], Z.schedule, { bold: [0],
      fill: (r) => (r[2] === "" && r[3] === "" ? PAPER : undefined) }));
    doc.push(note("A blank basis and note mark a section heading. Every other line is priced."));
  }
  doc.push(br());
}

doc.push(h1(`${SEC.register.n}  The twenty-five questions, answered`));
doc.push(p("Written against the same twenty-five findings raised against Revision A of the P2 Employer's Requirements. G14 is answered by stating a fault in the Employer's own pack rather than by passing over it."));
{ const w = [560, 2800, 5660];
  doc.push(grid(w, ["Ref", "The finding", "Where this document answers it"], Z.register, { bold: [0],
    fill: (r) => (/Appendix 8 gives 3.0/.test(r[2]) ? WARN : undefined) })); }
doc.push(br());

doc.push(h1(`${SEC.appendices.n}  Appendices`));
doc.push(p("The P2 appendices apply to this package as they stand and are not reissued — duplicating a figure creates two versions of it."));
{ const w = [700, 3800, 4520];
  doc.push(grid(w, ["", "Appendix", "Status"], [
    ["1", "Activity schedule", "Section " + SEC.pricing.n + " is the structure; the schedule is issued with the ITT"],
    ["2", "Ground investigation — factual report NR-GI-001", "FACTUAL ONLY. No interpretative report will be issued — " + SEC.spec.n + ".2"],
    ["3", "Planning consent, the CEMP and site rules", "P2 Appendix 3. The working hours, the noise limits and the seasonal ecological constraints all come from it"],
    ["4", "Bed demand curve and the sectional occupation dates", "P2 Appendix 6. Sections " + SEC.programme.n + " and " + SEC.occupied.n + " are derived from it"],
    ["5", "Design loadings and service supply characteristics", "P2 Appendix 8 — TO BE UPDATED to carry the kitchen floor loading at " + SEC.spec.n + ".4 before P2 manufactures"],
    ["6", "Asset information requirements and the data schema", "P2 Appendix 11 applies unamended — section " + SEC.info.n],
    ["7", "Social value framework", "P2 Appendix 12 applies unamended — " + SEC.labour.n + ".2"],
    ["8", "Site layout NR-TW-VIL-0201", "The laydown extent, the gatehouse position and the segregation line are taken from it"],
  ], { bold: [0, 1], fill: (r) => (/TO BE UPDATED|FACTUAL ONLY/.test(r[2]) ? WARN : undefined) })); }

const document = new Document({
  creator: "ETABLIX — Integrated Site Services",
  title: "Employer's Requirements — " + meta.package,
  description: meta.project,
  styles: { default: { document: { run: { font: F, size: 19, color: INK } } } },
  sections: [{
    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: `${meta.ref} Rev ${meta.rev}  ·  ${meta.package}`, font: F, size: 14, color: SLATE })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: "Page ", font: F, size: 14, color: SLATE }),
                 new TextRun({ children: [PageNumber.CURRENT], font: F, size: 14, color: SLATE }),
                 new TextRun({ text: " of ", font: F, size: 14, color: SLATE }),
                 new TextRun({ children: [PageNumber.TOTAL_PAGES], font: F, size: 14, color: SLATE })] })] }) },
    children: doc,
  }],
});
Packer.toBuffer(document).then((buf) => {
  fs.writeFileSync("/home/user/etablix/business/tender/ETABLIX-ER-P1-CivilWorks.docx", buf);
  console.log(`written: ${Math.round(buf.length / 1024)} KB · ${doc.length} body elements`);
});
