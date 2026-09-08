const fs = require("fs");
const D = require("/tmp/claude-0/-home-user-etablix/fe91c2e4-7425-5fd0-aa86-a0a156d734f1/scratchpad/docxlib/node_modules/docx");
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType,
        HeadingLevel, BorderStyle, PageBreak, Header, Footer, PageNumber, TableOfContents, AlignmentType } = D;
const C = require("/home/user/etablix/business/tender/p5-content.cjs");
const S = require("/home/user/etablix/business/tender/p5-spec.cjs");
const E = require("/home/user/etablix/business/tender/p5-extra.cjs");
const M = require("/home/user/etablix/business/tender/p5-commercial.cjs");
const Z = require("/home/user/etablix/business/tender/p5-close.cjs");

const INK="14181D", GOLD="9C7A3C", SLATE="5B6672", RED="C0392B", PAPER="F2EFE7", TINT="EFE6D2", WARN="F6E9E6";
const W = 9020, F = "Arial";
const cellB = ["top","bottom","left","right"].reduce((o,k)=>((o[k]={style:BorderStyle.SINGLE,size:2,color:"D5D5D5"}),o),{});

/**
 * The section register — the single source of every number in this document.
 * Clause data carries only its own sub-number; cross-references are tokens
 * resolved here, and an unresolved or out-of-range token fails the build.
 * This is the P2 Rev A fault, designed out rather than watched for.
 */
const SEC = {
  intro:       { n: 1,  list: C.opening },
  definitions: { n: 2 },
  services:    { n: 3 },
  spec:        { n: 4,  list: S.spec },
  management:  { n: 5,  list: E.management },
  iface:       { n: 6,  refs: S.ifaces.map((r) => r[0]) },
  mobilisation:{ n: 7,  list: E.mobilisation },
  team:        { n: 8,  list: E.team },
  statutory:   { n: 9,  list: E.statutory },
  welfare:     { n: 10, list: E.welfare },
  audit:       { n: 11, list: E.audit },
  reporting:   { n: 12, list: M.reporting },
  site:        { n: 13, list: M.site },
  kpis:        { n: 14, refs: C.kpis.map((r) => r[0]) },
  credits:     { n: 15, list: M.credits },
  sustain:     { n: 16, list: M.sustain },
  change:      { n: 17, list: M.change },
  escalation:  { n: 18, list: M.escalation },
  labour:      { n: 19, list: M.labour },
  demob:       { n: 20, list: M.demob },
  prime:       { n: 21, list: M.prime },
  pricing:     { n: 22, list: Z.pricing },
  register:    { n: 23 },
  appendices:  { n: 24 },
};
const kpi = { n: 14, refs: C.kpis.map((r) => r[0]) };

function resolve(text) {
  return String(text).replace(/\{\{(§?)([a-z]+)(?:\.([A-Za-z0-9-]+))?\}\}/g, (whole, sect, name, sub) => {
    if (name === "kpi") {
      if (!kpi.refs.includes(sub)) throw new Error(`Unknown KPI in "${whole}"`);
      return sub;  // the KPI reference is unique; the section number would read as noise
    }
    const s = SEC[name];
    if (!s) throw new Error(`Unknown reference target in "${whole}"`);
    if (sect) return String(s.n);
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

// cover
doc.push(new Paragraph({ spacing: { before: 1600, after: 0 }, children: [new TextRun({ text: "ETABLIX", font: F, size: 54, bold: true, color: INK })] }));
doc.push(new Paragraph({ spacing: { after: 760 }, children: [new TextRun({ text: "I N T E G R A T E D   S I T E   S E R V I C E S   ·   P A R T   O F   G R O U P E   N S E Y A", font: F, size: 14, bold: true, color: GOLD })] }));
doc.push(p("EMPLOYER'S REQUIREMENTS", { size: 38, bold: true, before: 0, after: 50 }));
doc.push(p(meta.package, { size: 28, color: GOLD, bold: true, after: 640 }));
doc.push(table([2400, 6620], bodyRows([2400, 6620], [
  ["Client", meta.client], ["Project", meta.project], ["Package", meta.package],
  ["Document reference", meta.ref], ["Revision", meta.rev], ["Date", meta.date],
  ["Term", meta.term], ["Status", "Issued for tender"],
], { bold: [0], size: 18, fill: (r, i) => (i === 0 ? PAPER : undefined) })));
doc.push(p("This document states the outcomes required. Where it states a method, a frequency or a ratio instead, it says so and gives the reason — see clause 1.2, which is the most consequential clause in the document. Where a tenderer's proposal departs from this document, the departure shall be listed in the Schedule of Departures and priced separately, so that what is compared is comparable.",
  { before: 600, italics: true, color: SLATE, size: 18 }));
doc.push(br());

doc.push(h1("Contents"));
doc.push(new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-2" }));
doc.push(br());

// 1
doc.push(h1(`${SEC.intro.n}  Introduction, and the basis of this specification`));
doc.push(...clauses("intro"));
doc.push(br());

// 2 definitions
doc.push(h1(`${SEC.definitions.n}  Definitions`));
doc.push(p("Terms used in this document have the meanings below. Where a term is defined in the subcontract conditions and also here, the subcontract definition prevails."));
{ const w = [2200, 6820]; doc.push(grid(w, ["Term", "Meaning"], C.defs, { bold: [0], size: 16 })); }
doc.push(br());

// 3 services
doc.push(h1(`${SEC.services.n}  The services`));
doc.push(p("Twenty-three services. The code in the fourth column is the basis at clause 1.2 and it decides who carries the risk that the method achieves the outcome."));
doc.push(p("O — OUTPUT SPECIFIED. The Employer states the outcome and the measure; the Contractor designs the service and carries the risk that its design achieves it.    I — INPUT SPECIFIED. The Employer states the method, frequency or ratio; the Contractor delivers it as described, and the Employer carries the risk that doing it produces the outcome.", { bold: true }));
{ const w = [620, 1560, 3300, 440, 3100];
  doc.push(grid(w, ["Ref", "Service", "The outcome required", "", "Note"], C.services, { bold: [0, 1, 3],
    fill: (r, i) => (i === 3 ? (r[3] === "I" ? TINT : undefined) : undefined) })); }
doc.push(note(`Fifteen services are output-specified and eight are input-specified. Each of the eight is an Employer decision with a reason stated where it appears — a statutory duty, a safety margin, or a dignity floor beneath which the service does not go whatever an efficiency model says.`));
doc.push(br());

// 4 spec
doc.push(h1(`${SEC.spec.n}  The services, element by element`));
doc.push(...clauses("spec"));
doc.push(br());

// 5 management
doc.push(h1(`${SEC.management.n}  Management responsibility`));
doc.push(...clauses("management"));
{ const w = [2150, 560, 3100, 3210];
  doc.push(grid(w, ["Element", "", "What the Employer has stated", "What the Contractor is responsible for"], E.matrix, { bold: [0, 1],
    fill: (r, i) => (i === 1 ? (r[1] === "ED" ? "E8E2D4" : r[1] === "CD" ? TINT : "F7F0DC") : undefined) })); }
doc.push(note("An element not in this matrix is the Contractor's to design. Where the Contractor believes an element is missing, it shall raise a tender query rather than assume the omission is in its favour."));
doc.push(br());

// 6 interfaces
doc.push(h1(`${SEC.iface.n}  Interfaces — what this package receives`));
doc.push(p("This package builds nothing. It receives a village from four other packages and operates it. Each interface below states what is handed over, in what state, and when."));
{ const w = [700, 1500, 2900, 2320, 1600];
  doc.push(grid(w, ["Ref", "From", "What is handed over", "In what state", "When"], S.ifaces, { bold: [0, 1] })); }
doc.push(flag("Where a service in this document cannot be delivered because something handed over is inadequate, the Contractor's duty is to report it under section " + SEC.escalation.n + ", not to work around it. A workaround becomes the standard within a month and the defect is never fixed."));
doc.push(br());

// 7-13
for (const [key, title] of [
  ["mobilisation", "Mobilisation and service commencement"],
  ["team", "The management team"],
  ["statutory", "Statutory duties: fire, water and food"],
  ["welfare", "Residents: welfare, dignity and safeguarding"],
  ["audit", "Quality, audit and asking the residents"],
  ["reporting", "Reporting, the CAFM and information"],
  ["site", "Site constraints and conduct"],
]) {
  doc.push(h1(`${SEC[key].n}  ${title}`));
  doc.push(...clauses(key));
  if (key === "team") {
    const w = [2300, 3200, 3520];
    doc.push(grid(w, ["Post", "Cover required", "Minimum competence"], E.posts, { bold: [0] }));
    doc.push(note("A minimum establishment, and an input. The Contractor may exceed it and shall state where its Service Delivery Plan does."));
  }
  doc.push(br());
}

// 14 KPIs
doc.push(h1(`${SEC.kpis.n}  The performance regime`));
doc.push(p("Twenty key performance indicators. Each carries a target, the method by which it is measured and the frequency, and a weighting used to allocate the service credit pool at section " + SEC.credits.n + "."));
{ const w = [560, 1700, 2500, 1900, 1100, 1260];
  doc.push(grid(w, ["Ref", "Indicator", "Target", "How measured", "Frequency", "Weight"],
    C.kpis.map((r) => [r[0], r[1], r[2], r[3], r[4], r[5] + "%"]), { bold: [0, 1, 5], size: 14 })); }
const wsum = C.kpis.reduce((s, k) => s + k[5], 0);
if (wsum !== 100) throw new Error(`KPI weightings total ${wsum}%, not 100%`);
doc.push(note(`The weightings total ${wsum}%. The build fails if they do not — an evaluation model earlier in this project was issued with weightings totalling 120% and nobody noticed until it was arithmetically checked.`));
doc.push(br());

// 15-22
for (const [key, title] of [
  ["credits", "Service credits, and the failures a credit does not remedy"],
  ["sustain", "Energy, waste and social value"],
  ["change", "Change control"],
  ["escalation", "Early warning, escalation and step-in"],
  ["labour", "Labour standards and ethical employment"],
  ["demob", "Term, demobilisation and relocation"],
  ["prime", "The prime option"],
  ["pricing", "Pricing"],
]) {
  doc.push(h1(`${SEC[key].n}  ${title}`));
  doc.push(...clauses(key));
  if (key === "pricing") {
    const w = [700, 3900, 1700, 2720];
    doc.push(grid(w, ["Item", "Description", "Basis", "Note"], Z.schedule, { bold: [0],
      fill: (r) => (r[2] === "" && r[3] === "" ? PAPER : undefined) }));
    doc.push(note("A blank basis and note mark a section heading. Every other line is priced."));
  }
  doc.push(br());
}

// 23 register
doc.push(h1(`${SEC.register.n}  The twenty-five questions, answered`));
doc.push(p("This document was written against the same twenty-five findings raised against Revision A of the P2 Employer's Requirements. They land differently on a service contract, and two of them do not apply at all — which is stated rather than passed over, because a register with two silent omissions is a register nobody can rely on."));
{ const w = [560, 2900, 5560];
  doc.push(grid(w, ["Ref", "The finding", "Where this document answers it"], Z.register, { bold: [0],
    fill: (r) => (/Not applicable/.test(r[2]) ? WARN : undefined) })); }
doc.push(br());

// 24 appendices
doc.push(h1(`${SEC.appendices.n}  Appendices`));
doc.push(p("Four are issued with this document. The remainder are the P2 appendices, which apply to this package as they stand and are not reissued — the bed demand curve, the design data and the asset schema are the same documents and duplicating them would create two versions of one number."));
{ const w = [700, 3600, 4720];
  doc.push(grid(w, ["", "Appendix", "Status"], [
    ["1", "Activity schedule, in the structure to be priced", "Section " + SEC.pricing.n + " is the structure. The schedule itself is issued with the ITT"],
    ["2", "The Employer's village rules, as issued to residents", "Issued with this document"],
    ["3", "The resident survey question set", "Issued with this document. Not to be changed between rounds without agreement"],
    ["4", "The social value framework and travel-to-work area", "P2 Appendix 12 applies unamended"],
    ["5", "Bed demand curve and sectional completion dates", "P2 Appendix 6 applies unamended — this is the document every service in section " + SEC.spec.n + " is sized from"],
    ["6", "Design loadings and service supply characteristics", "P2 Appendix 8 applies unamended"],
    ["7", "Asset information requirements and the data schema", "P2 Appendix 11 applies unamended. The register is received, not re-created"],
    ["8", "Fire strategy", "P2 Appendix 2. The fire risk assessment at " + SEC.statutory.n + ".2 is written to it"],
  ], { bold: [0, 1] })); }

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
  fs.writeFileSync("/home/user/etablix/business/tender/ETABLIX-ER-P5-FM-and-Operation.docx", buf);
  console.log(`written: ${Math.round(buf.length / 1024)} KB · ${doc.length} body elements`);
});
