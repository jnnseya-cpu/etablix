const fs = require("fs");
const D = require("/tmp/claude-0/-home-user-etablix/fe91c2e4-7425-5fd0-aa86-a0a156d734f1/scratchpad/docxlib/node_modules/docx");
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType,
        HeadingLevel, BorderStyle, PageBreak, Header, Footer, PageNumber, TableOfContents, AlignmentType } = D;
const C = require("/home/user/etablix/business/tender/p4-content.cjs");
const S = require("/home/user/etablix/business/tender/p4-spec.cjs");
const E = require("/home/user/etablix/business/tender/p4-extra.cjs");
const Z = require("/home/user/etablix/business/tender/p4-close.cjs");

const INK="14181D", GOLD="9C7A3C", SLATE="5B6672", RED="C0392B", PAPER="F2EFE7", TINT="EFE6D2", WARN="F6E9E6";
const W = 9020, F = "Arial";
const cellB = ["top","bottom","left","right"].reduce((o,k)=>((o[k]={style:BorderStyle.SINGLE,size:2,color:"D5D5D5"}),o),{});

const SEC = {
  intro:       { n: 1,  list: C.opening },
  definitions: { n: 2 },
  rooms:       { n: 3,  refs: C.rooms.filter((r) => r[1]).map((r) => r[0]) },
  boundary:    { n: 4,  list: E.boundary },
  schedule:    { n: 5,  refs: C.furniture.filter((r) => r[1]).map((r) => r[0]) },
  spec:        { n: 6,  list: S.spec },
  iface:       { n: 7,  refs: S.ifaces.map((r) => r[0]) },
  performance: { n: 8 },
  handover:    { n: 9 },
  programme:   { n: 10, list: E.programme },
  hse:         { n: 11, list: E.hse },
  info:        { n: 12, list: E.info },
  change:      { n: 13, list: E.change },
  defects:     { n: 14, list: E.defects },
  sustain:     { n: 15, list: E.sustain },
  labour:      { n: 16, list: E.labour },
  relocation:  { n: 17, list: E.relocation },
  pricing:     { n: 18, list: Z.pricing },
  register:    { n: 19 },
  appendices:  { n: 20 },
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
doc.push(p("This is the smallest package on this project and the only one every resident touches every day. It has almost no work of its own: its entire risk lives at its boundary with P2, and section 4 — the Common Schedule — is the first thing a tenderer should read.",
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

doc.push(h1(`${SEC.rooms.n}  What this package furnishes`));
doc.push(...paras(C.roomsNote));
{ const w = [620, 1900, 1200, 2700, 2600];
  doc.push(grid(w, ["Ref", "Space", "Quantity or area", "What this package provides", "Note"], C.rooms, { bold: [0, 1, 2],
    fill: (r) => (r[1] === "" ? PAPER : (r[0] === "R-02" ? TINT : undefined)) })); }
{ const w = [3400, 5620]; doc.push(table(w, bodyRows(w, C.roomsTotals, { bold: [0], size: 17, fill: (r, i) => (i === 0 ? PAPER : undefined) }))); }
doc.push(br());

doc.push(h1(`${SEC.boundary.n}  The boundary with P2, and the Common Schedule`));
doc.push(...clauses("boundary"));
{ const w = [620, 1620, 2200, 2200, 2380];
  doc.push(grid(w, ["", "The item", "P2 provides — fitted", "P4 provides — loose", "If this line is missed"], E.boundaryReg, { bold: [0, 1] })); }
doc.push(flag("Every one of these lines is free to fix before either package is let and impossible to fix after P2 has manufactured. That is the whole reason this section exists, and it is why the sample rooms and the dimensional confirmation are priced separately at items A2 and A3."));
doc.push(br());

doc.push(h1(`${SEC.schedule.n}  Furniture schedule`));
doc.push(...paras(C.scheduleNote));
{ const w = [620, 1620, 3520, 440, 2820];
  doc.push(grid(w, ["Ref", "Item", "The duty, or the specification", "", "Note"], C.furniture, { bold: [0, 1, 3],
    fill: (r, i) => (r[1] === "" ? PAPER : (i === 3 && r[3] === "C" ? TINT : undefined)) })); }
doc.push(note("A shaded row is a group heading. A tinted basis cell is a Contractor-selected line."));
doc.push(br());

doc.push(h1(`${SEC.spec.n}  Specification, element by element`));
doc.push(...clauses("spec"));
doc.push(br());

doc.push(h1(`${SEC.iface.n}  Interfaces`));
doc.push(p("This package supplies nothing that is not touched by another package's work. Each interface states what crosses it, who certifies it and when."));
{ const w = [700, 1750, 2900, 2150, 1520];
  doc.push(grid(w, ["Ref", "With", "What crosses it", "Who certifies", "When"], S.ifaces, { bold: [0, 1],
    fill: (r) => (r[0] === "IF-01" ? WARN : undefined) })); }
doc.push(flag("IF-01 is shaded because it is the only interface on this project that has to be closed BEFORE either of the two packages either side of it is let. Everything else in this document can be fixed later. That one cannot."));
doc.push(br());

doc.push(h1(`${SEC.performance.n}  Performance schedule`));
doc.push(p("These are the Employer's requirements. Compliance with statute is the Contractor's duty and is not discharged by meeting them."));
{ const w = [2600, 3400, 3020];
  doc.push(grid(w, ["Criterion", "Requirement", "How it is verified"], E.perf, { bold: [0] })); }
doc.push(br());

doc.push(h1(`${SEC.handover.n}  Handover to the Operator`));
doc.push(p("P5 operates this furniture for 38 months and replaces it one item at a time. Handover is complete when P5 acknowledges receipt against the checklist, room by room, not when the last delivery is made."));
{ const w = [2700, 6320];
  doc.push(grid(w, ["Deliverable", "Requirement"], E.handover, { bold: [0] })); }
doc.push(br());

for (const [key, title] of [
  ["programme", "Programme, delay and damages"],
  ["hse", "Health, safety and working in an occupied village"],
  ["info", "Information and asset data"],
  ["change", "Change control"],
  ["defects", "Defects, response and the systemic rule"],
  ["sustain", "Materials, packaging and end of life"],
  ["labour", "Labour standards and the place of manufacture"],
  ["relocation", "Removal and reuse"],
  ["pricing", "Pricing"],
]) {
  doc.push(h1(`${SEC[key].n}  ${title}`));
  doc.push(...clauses(key));
  if (key === "pricing") {
    const w = [640, 3700, 1700, 2980];
    doc.push(grid(w, ["Item", "Description", "Basis", "Note"], Z.schedule, { bold: [0],
      fill: (r) => (r[2] === "" && r[3] === "" ? PAPER : undefined) }));
    doc.push(note("A blank basis and note mark a section heading. Every other line is priced."));
  }
  doc.push(br());
}

doc.push(h1(`${SEC.register.n}  The twenty-five questions, answered`));
doc.push(p("Written against the same twenty-five findings raised against Revision A of the P2 Employer's Requirements. Four of the twenty-five do not apply to a loose furniture package. They are answered by saying so and saying why, rather than by inventing a requirement to fill the row — a register that answers a question that was never asked is a register nobody trusts on the questions that were."));
{ const w = [560, 2800, 5660];
  doc.push(grid(w, ["Ref", "The finding", "Where this document answers it"], Z.register, { bold: [0],
    fill: (r) => (/Not applicable/.test(r[2]) ? PAPER : undefined) })); }
doc.push(br());

doc.push(h1(`${SEC.appendices.n}  Appendices`));
doc.push(p("The P2 appendices apply to this package as they stand and are not reissued — duplicating a figure creates two versions of it."));
{ const w = [700, 3800, 4520];
  doc.push(grid(w, ["", "Appendix", "Status"], [
    ["1", "Activity schedule", "Section " + SEC.pricing.n + " is the structure; the schedule is issued with the ITT"],
    ["2", "THE COMMON SCHEDULE", "Section " + SEC.boundary.n + " is the Employer's starting position. The signed schedule is issued by the Employer BEFORE EITHER PACKAGE IS LET"],
    ["3", "P2 room data sheets", "The fitted joinery this package's furniture works around — " + SEC.boundary.n + ".3. Not reissued here. TO BE CORRECTED: the glazing standard cited is BS 6206, which is withdrawn — see " + SEC.spec.n + ".10"],
    ["4", "Fire strategy", "P2 Appendix 2. The amenity seating fire load is confirmed against it at IF-12"],
    ["5", "Bed demand curve and the sectional occupation dates", "P2 Appendix 6. Section " + SEC.programme.n + " is derived from it"],
    ["6", "Planning consent and site rules", "P2 Appendix 3. The noise rule near occupied blocks applies to flat-pack assembly — " + SEC.hse.n + ".2"],
    ["7", "Asset information requirements and the data schema", "P2 Appendix 11 applies unamended. The GRANULARITY decision is made at " + SEC.info.n + ".1"],
    ["8", "Social value framework", "P2 Appendix 12 applies unamended"],
  ], { bold: [0, 1], fill: (r) => (/BEFORE EITHER PACKAGE IS LET|TO BE CORRECTED/.test(r[2]) ? WARN : undefined) })); }

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
  fs.writeFileSync("/home/user/etablix/business/tender/ETABLIX-ER-P4-Furniture.docx", buf);
  console.log(`written: ${Math.round(buf.length / 1024)} KB · ${doc.length} body elements`);
});
