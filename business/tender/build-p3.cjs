const fs = require("fs");
const D = require("/tmp/claude-0/-home-user-etablix/fe91c2e4-7425-5fd0-aa86-a0a156d734f1/scratchpad/docxlib/node_modules/docx");
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType,
        HeadingLevel, BorderStyle, PageBreak, Header, Footer, PageNumber, TableOfContents, AlignmentType } = D;
const C = require("/home/user/etablix/business/tender/p3-content.cjs");
const S = require("/home/user/etablix/business/tender/p3-spec.cjs");
const E = require("/home/user/etablix/business/tender/p3-extra.cjs");
const Z = require("/home/user/etablix/business/tender/p3-close.cjs");

const INK="14181D", GOLD="9C7A3C", SLATE="5B6672", RED="C0392B", PAPER="F2EFE7", TINT="EFE6D2", WARN="F6E9E6";
const W = 9020, F = "Arial";
const cellB = ["top","bottom","left","right"].reduce((o,k)=>((o[k]={style:BorderStyle.SINGLE,size:2,color:"D5D5D5"}),o),{});

const SEC = {
  intro:       { n: 1,  list: C.opening },
  definitions: { n: 2 },
  demand:      { n: 3 },
  areas:       { n: 4 },
  equipment:   { n: 5,  refs: C.equipment.filter((r) => r[3]).map((r) => r[0]) },
  spec:        { n: 6,  list: S.spec },
  freeze:      { n: 7,  list: E.freeze },
  iface:       { n: 8,  refs: S.ifaces.map((r) => r[0]) },
  performance: { n: 9 },
  handover:    { n: 10 },
  programme:   { n: 11, list: E.programme },
  hse:         { n: 12, list: E.hse },
  info:        { n: 13, list: E.info },
  change:      { n: 14, list: E.change },
  defects:     { n: 15, list: E.defects },
  sustain:     { n: 16, list: E.sustain },
  labour:      { n: 17, list: E.labour },
  relocation:  { n: 18, list: E.relocation },
  pricing:     { n: 19, list: Z.pricing },
  register:    { n: 20 },
  appendices:  { n: 21 },
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
  ["The shell", meta.shell], ["Document reference", meta.ref], ["Revision", meta.rev],
  ["Date", meta.date], ["Status", "Issued for tender"],
], { bold: [0], size: 18, fill: (r, i) => (i === 0 ? PAPER : undefined) })));
doc.push(p("This package fits out a building it does not build. Every serious risk in it is at its boundary, and section 7 — the shell freeze — is the most important section in the document. A tenderer should read it before pricing anything else.",
  { before: 600, italics: true, color: SLATE, size: 18 }));
doc.push(br());
doc.push(h1("Contents"));
doc.push(new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-2" }));
doc.push(br());

doc.push(h1(`${SEC.intro.n}  Introduction, and the one risk in this package`));
doc.push(...clauses("intro"));
doc.push(br());

doc.push(h1(`${SEC.definitions.n}  Definitions`));
{ const w = [2100, 6920]; doc.push(grid(w, ["Term", "Meaning"], C.defs, { bold: [0], size: 16 })); }
doc.push(br());

doc.push(h1(`${SEC.demand.n}  The demand this kitchen serves`));
doc.push(...paras(C.demandNote));
{ const w = [620, 1900, 1450, 1900, 780, 2370];
  doc.push(grid(w, ["Ref", "Service period", "Times", "Who", "Covers", "Note"], C.demand, { bold: [0, 1, 4],
    fill: (r) => (r[0] === "SP4" ? TINT : undefined) })); }
{ const w = [3400, 5620]; doc.push(table(w, bodyRows(w, C.demandTotals, { bold: [0], size: 17, fill: (r, i) => (i === 0 ? PAPER : undefined) }))); }
doc.push(br());

doc.push(h1(`${SEC.areas.n}  Area schedule`));
doc.push(...paras(C.areasNote));
{ const w = [2100, 900, 2900, 3120];
  doc.push(grid(w, ["Area", "m²", "Basis", "Note"], C.areas, { bold: [0, 1],
    fill: (r) => (r[0] === "TOTAL" ? PAPER : undefined) })); }
doc.push(br());

doc.push(h1(`${SEC.equipment.n}  Equipment schedule`));
doc.push(p("Every line carries a basis code. E means the Employer prescribed it and carries the risk that what is described achieves the duty; C means the Employer stated a duty and the Contractor selects, sizes and warrants the means. Clause 1.2 states why 25 of the 38 lines are prescribed and what the three groups are."));
{ const w = [620, 1700, 3500, 440, 2760];
  doc.push(grid(w, ["Ref", "Item", "The duty, or the specification", "", "Note"], C.equipment, { bold: [0, 1, 3],
    fill: (r, i) => (r[1] === "" ? PAPER : (i === 3 && r[3] === "C" ? TINT : undefined)) })); }
doc.push(br());

doc.push(h1(`${SEC.spec.n}  Specification, element by element`));
doc.push(...clauses("spec"));
doc.push(br());

doc.push(h1(`${SEC.freeze.n}  The shell freeze`));
doc.push(...clauses("freeze"));
{ const w = [560, 2700, 1300, 1300, 3160];
  doc.push(grid(w, ["", "What is fixed", "Produced by", "Confirmed by", "If it changes after the freeze"], E.freezeReg, { bold: [0] })); }
doc.push(flag("Every one of these is cheap to fix eight weeks before manufacture and expensive to fix eight weeks after. That is the whole of the reason this section exists, and it is why it is priced separately at item A3."));
doc.push(br());

doc.push(h1(`${SEC.iface.n}  Interfaces`));
doc.push(p("This package builds nothing and operates nothing. Each interface states what crosses it, who certifies it and when."));
{ const w = [700, 1700, 2900, 2200, 1520];
  doc.push(grid(w, ["Ref", "With", "What crosses it", "Who certifies", "When"], S.ifaces, { bold: [0, 1] })); }
doc.push(br());

doc.push(h1(`${SEC.performance.n}  Performance schedule`));
doc.push(p("These are the Employer's requirements. Compliance with statute is the Contractor's duty and is not discharged by meeting them."));
{ const w = [2400, 3600, 3020];
  doc.push(grid(w, ["Criterion", "Requirement", "How it is verified"], E.perf, { bold: [0] })); }
doc.push(br());

doc.push(h1(`${SEC.handover.n}  Handover to the Operator`));
doc.push(p("This kitchen is operated by P5 from the day it opens. Handover is a deliverable of this package and it is complete when P5 acknowledges receipt against a checklist, not when the documents are sent. The commissioning and test meal requirements are at " + SEC.spec.n + ".7 and the training at " + SEC.spec.n + ".17."));
{ const w = [2700, 6320];
  doc.push(grid(w, ["Deliverable", "Requirement"], E.handover, { bold: [0] })); }
doc.push(br());

for (const [key, title] of [
  ["programme", "Programme and delay"],
  ["hse", "Health, safety and working next to an occupied village"],
  ["info", "Information and asset data"],
  ["change", "Change control"],
  ["defects", "Defects, response and support"],
  ["sustain", "Energy, water and waste"],
  ["labour", "Labour standards"],
  ["relocation", "Relocation"],
  ["pricing", "Pricing"],
]) {
  doc.push(h1(`${SEC[key].n}  ${title}`));
  doc.push(...clauses(key));
  if (key === "pricing") {
    const w = [640, 3800, 1500, 3080];
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
    fill: (r) => (/Appendix 8 does not currently carry/.test(r[2]) ? WARN : undefined) })); }
doc.push(br());

doc.push(h1(`${SEC.appendices.n}  Appendices`));
doc.push(p("The P2 appendices apply to this package as they stand and are not reissued — duplicating a figure creates two versions of it."));
{ const w = [700, 3800, 4520];
  doc.push(grid(w, ["", "Appendix", "Status"], [
    ["1", "Activity schedule", "Section " + SEC.pricing.n + " is the structure; the schedule is issued with the ITT"],
    ["2", "Fire strategy", "P2 Appendix 2. The extract failure mode at " + SEC.spec.n + ".12 is confirmed against it at F-11"],
    ["3", "Bed demand curve and the day-shift proportion", "P2 Appendix 6. Section " + SEC.demand.n + " is derived from it"],
    ["4", "Design loadings and service supply characteristics", "P2 Appendix 8 — TO BE UPDATED to carry the kitchen floor loading at " + SEC.freeze.n + ".3 before P2 manufactures"],
    ["5", "Asset information requirements and the data schema", "P2 Appendix 11 applies unamended"],
    ["6", "Social value framework", "P2 Appendix 12 applies unamended"],
    ["7", "Planning consent and site rules", "P2 Appendix 3. The plant noise limit at " + SEC.spec.n + ".16 is taken from it"],
  ], { bold: [0, 1], fill: (r) => (/TO BE UPDATED/.test(r[2]) ? WARN : undefined) })); }

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
  fs.writeFileSync("/home/user/etablix/business/tender/ETABLIX-ER-P3-Kitchen.docx", buf);
  console.log(`written: ${Math.round(buf.length / 1024)} KB · ${doc.length} body elements`);
});
