const fs = require("fs");
const D = require("/tmp/claude-0/-home-user-etablix/fe91c2e4-7425-5fd0-aa86-a0a156d734f1/scratchpad/docxlib/node_modules/docx");
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType,
        HeadingLevel, BorderStyle, PageBreak, Header, Footer, PageNumber, TableOfContents, AlignmentType } = D;
const A = require("/home/user/etablix/business/tender/appendices-content.cjs");
const B = require("/home/user/etablix/business/tender/appendices-b.cjs");

const INK = "14181D", GOLD = "9C7A3C", SLATE = "5B6672", RED = "C0392B", PAPER = "F2EFE7", TINT = "EFE6D2", WARN = "F6E9E6";
const W = 9020, F = "Arial";
const cellB = ["top","bottom","left","right"].reduce((o,k)=>((o[k]={style:BorderStyle.SINGLE,size:2,color:"D5D5D5"}),o),{});

const p = (t, o = {}) => new Paragraph({ spacing: { before: o.before ?? 60, after: o.after ?? 60, line: 260 }, indent: o.indent,
  children: [new TextRun({ text: t, font: F, size: o.size ?? 19, bold: o.bold, italics: o.italics, color: o.color ?? INK })] });
const paras = (t, o = {}) => String(t).split("\n").filter((l) => l.trim()).map((l) => p(l, o));
const h1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 340, after: 130 },
  children: [new TextRun({ text: t, font: F, size: 28, bold: true, color: INK })] });
const h2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 230, after: 95 },
  children: [new TextRun({ text: t, font: F, size: 21, bold: true, color: GOLD })] });
const cell = (t, o = {}) => new TableCell({ width: { size: o.w, type: WidthType.DXA }, borders: cellB,
  margins: { top: 55, bottom: 55, left: 85, right: 85 }, columnSpan: o.span,
  shading: o.fill ? { type: ShadingType.CLEAR, color: "auto", fill: o.fill } : undefined,
  children: (Array.isArray(t) ? t : [t]).map((x) => new Paragraph({ spacing: { before: 18, after: 18, line: 235 },
    children: [new TextRun({ text: String(x), font: F, size: o.size ?? 15, bold: o.bold, italics: o.italics, color: o.color ?? INK })] })) });
const table = (w, rs) => new Table({ columnWidths: w, width: { size: W, type: WidthType.DXA }, rows: rs });
const hdr = (w, l) => new TableRow({ tableHeader: true, children: l.map((x, i) => cell(x, { w: w[i], bold: true, fill: INK, color: "FFFFFF", size: 15 })) });
const rows = (w, d, o = {}) => d.map((r) => new TableRow({ children: r.map((v, i) =>
  cell(v, { w: w[i], bold: (o.bold || []).includes(i), size: o.size ?? 15, fill: o.fill ? o.fill(r, i) : undefined })) }));
const grid = (w, l, d, o = {}) => table(w, [hdr(w, l), ...rows(w, d, o)]);
const br = () => new Paragraph({ children: [new PageBreak()] });
const note = (t) => p(t, { italics: true, color: SLATE, size: 17, before: 90 });
const flag = (t) => p(t, { italics: true, color: RED, size: 17, before: 90 });
const bullets = (list) => list.map((t) => p("·   " + t, { indent: { left: 280 }, before: 18, after: 18, size: 18 }));

const doc = [];
const M = A.meta;

// ── cover
doc.push(new Paragraph({ spacing: { before: 1600, after: 0 }, children: [new TextRun({ text: "ETABLIX", font: F, size: 54, bold: true, color: INK })] }));
doc.push(new Paragraph({ spacing: { after: 760 }, children: [new TextRun({ text: "I N T E G R A T E D   S I T E   S E R V I C E S   ·   P A R T   O F   G R O U P E   N S E Y A", font: F, size: 14, bold: true, color: GOLD })] }));
doc.push(p("EMPLOYER'S REQUIREMENTS", { size: 34, bold: true, before: 0, after: 40 }));
doc.push(p("THE TWELVE APPENDICES", { size: 30, bold: true, color: GOLD, after: 40 }));
doc.push(p("P2 — Modular Accommodation", { size: 22, color: SLATE, after: 620 }));
doc.push(table([2400, 6620], rows([2400, 6620], [
  ["Client", M.client], ["Project", M.project], ["Parent document", M.parent],
  ["Document reference", M.ref], ["Revision", M.rev], ["Date", M.date], ["Status", "Issued for tender"],
], { bold: [0], size: 18, fill: (r, i) => (i === 0 ? PAPER : undefined) })));
doc.push(p("Eight of the twelve are the Employer's own documents and are written here in full. Four are produced by others — the fire engineer, the planning authority, the environmental consultant, the highway authority. Those are issued as controlled insertion sheets stating what must be inserted, by whom, what this document depends on it for, and WHAT A TENDERER PRICES UNTIL IT ARRIVES. An appendix that says only “to be issued” transfers an unpriced risk to a tenderer, who will either price its worst case or qualify its return — and both defeat the evaluation.",
  { before: 600, italics: true, color: SLATE, size: 18 }));
doc.push(br());

doc.push(h1("Contents"));
doc.push(new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-2" }));
doc.push(br());

// ── register
doc.push(h1("Register of appendices"));
doc.push(p("Every appendix, who authors it, its status, and the clauses of the Employer's Requirements that depend on it. A clause that depends on an appendix which is not yet issued is listed here rather than left for a tenderer to discover."));
{ const w = [520, 2600, 1900, 2200, 1800];
  doc.push(grid(w, ["", "Appendix", "Authored by", "Status", "Depended on by"], A.register, { bold: [0, 1],
    fill: (r, i) => (i === 3 && /INSERTION|DRAFT|CONTENT SCHEDULE/.test(String(r[3])) ? WARN : i === 3 ? TINT : undefined) })); }
doc.push(flag("The four insertion sheets are not placeholders. Each one states the basis a tenderer prices on until the document arrives, and what happens if the issued document differs from that basis. Read them before pricing."));
doc.push(br());

// ── A1
doc.push(h1("Appendix 1  Activity schedule"));
doc.push(...paras(A.a1.intro));
doc.push(h2("Rules of pricing"));
{ const w = [2000, 7020]; doc.push(table(w, rows(w, A.a1.rules, { bold: [0], size: 17, fill: (r, i) => (i === 0 ? PAPER : undefined) }))); }
doc.push(h2("The schedule"));
{ const w = [700, 4000, 780, 780, 2760];
  doc.push(grid(w, ["Item", "Description", "Unit", "Qty", "Note"], A.a1.lines, { bold: [0],
    fill: (r) => (r[2] === "" && r[3] === "" ? PAPER : undefined) })); }
doc.push(note("Blank unit and quantity mark a section heading. Every other line is priced."));
doc.push(br());

// ── A2, A3, A4, A7 — insertion sheets, in register order alongside the written ones
function insertion(x) {
  const out = [h1(`Appendix ${x.n}  ${x.title}`)];
  out.push(table([2000, 7020], rows([2000, 7020], [
    ["Authored by", x.author], ["Status", x.status],
  ], { bold: [0], size: 18, fill: (r, i) => (i === 0 ? PAPER : undefined) })));
  out.push(h2(`${x.n}.1  What the Employer's Requirements depend on it for`));
  out.push(...bullets(x.depends));
  out.push(h2(`${x.n}.2  What a tenderer prices until it arrives`));
  out.push(p("Price on this basis. State in the tender that you have done so. Do not price a worst case against it.", { bold: true }));
  out.push(...bullets(x.priceOn));
  out.push(h2(`${x.n}.3  If the issued document differs`));
  out.push(...paras(x.ifDifferent));
  return out;
}
doc.push(...insertion(B.insertions[0])); doc.push(br());

// ── A3 = insertion + site rules
doc.push(...insertion(B.insertions[1]));
doc.push(h2("3.4  The Employer's site rules"));
doc.push(p("These are the Employer's and are issued in full. They apply from mobilisation and they change once the first block is occupied — the rule about noise near occupied blocks is the one people forget, and it is a safety rule rather than a courtesy."));
{ const w = [1700, 5900, 1420];
  doc.push(grid(w, ["Rule", "What it requires", "Clause"], B.siteRules.map((r) => [r[0], r[1], r[2] || "—"]), { bold: [0] })); }
doc.push(br());

doc.push(...insertion(B.insertions[2])); doc.push(br());

// ── A5
doc.push(h1("Appendix 5  Approved external colour and finish range"));
doc.push(...paras(A.a5.intro));
{ const w = [620, 1400, 900, 1700, 2600, 1800];
  doc.push(grid(w, ["Ref", "Colour", "RAL", "Finish", "Where it may be used", "Note"], A.a5.range, { bold: [0, 1] })); }
doc.push(h2("5.1  Rules"));
doc.push(...bullets(A.a5.rules));
doc.push(br());

// ── A6
doc.push(h1("Appendix 6  Bed demand curve, occupancy programme and sectional completion"));
doc.push(...paras(B.a6.intro));
doc.push(h2("6.1  Sectional completion dates"));
{ const w = [900, 1300, 1500, 5320];
  doc.push(grid(w, ["Section", "Beds", "Complete by", "What it comprises"],
    B.SECTIONS.map((s) => [`Section ${s.n}`, String(s.beds), `End of month ${s.byMonth}`, s.note]), { bold: [0, 1] })); }
doc.push(flag(B.a6.ld));
doc.push(h2("6.2  The curve, month by month"));
{ const w = [1000, 1700, 1700, 1700, 2920];
  const data = B.DEMAND.map((d, i) => {
    const m = i + 1;
    const avail = B.SECTIONS.filter((s) => s.byMonth < m).reduce((a, s) => a + s.beds, 0);
    const sec = B.SECTIONS.find((s) => s.byMonth === m);
    const day = Math.round(d * B.DAYSHIFT[i]);
    return [`Month ${m}`, String(d), String(avail), d ? `${day} (${Math.round(B.DAYSHIFT[i] * 100)}%)` : "—",
      sec ? `SECTION ${sec.n} COMPLETES — ${avail + sec.beds} beds available from month ${m + 1}` : (d === Math.max(...B.DEMAND) ? "Peak" : "")];
  });
  doc.push(grid(w, ["", "Beds required", "Beds available", "On day shift", "Event"], data, { bold: [0],
    fill: (r) => (/SECTION/.test(r[4]) ? TINT : /Peak/.test(r[4]) ? PAPER : undefined) })); }
doc.push(h2("6.3  What the curve means"));
doc.push(...bullets(B.a6.notes));
doc.push(br());

// ── A7
doc.push(...insertion(B.insertions[3])); doc.push(br());

// ── A8
doc.push(h1("Appendix 8  Design loadings, site exposure and service supply characteristics"));
doc.push(...paras(A.a8.intro));
{ const w = [1800, 2700, 2200, 2320];
  let last = null;
  const data = [];
  for (const [g, param, val, src] of A.a8.data) {
    data.push([g === last ? "" : g, param, val, src]); last = g;
  }
  doc.push(grid(w, ["Group", "Parameter", "Value", "Source or basis"], data, { bold: [0],
    fill: (r, i) => (i === 2 && /TO BE CONFIRMED|TO BE DESIGNED/.test(String(r[2])) ? WARN : undefined) })); }
doc.push(flag("Seven values are marked TO BE CONFIRMED. Design to the stated assumption, say so in the tender, and price it. A figure confirmed later at a worse value is a change under section 17; a figure assumed silently is not."));
doc.push(br());

// ── A9
doc.push(h1("Appendix 9  Overheating criterion and the Employer's comfort brief"));
doc.push(...paras(A.a9.intro));
doc.push(h2("9.1  The criterion"));
{ const w = [2200, 4400, 2420];
  doc.push(grid(w, ["", "Requirement", "Note"], A.a9.criteria, { bold: [0],
    fill: (r) => (/DAY-SLEEPING/.test(r[0]) || /day-occupied/.test(r[0]) ? TINT : undefined) })); }
doc.push(flag("Criterion C is the one that is not in TM59. It is required here because a proportion of these residents sleep between 08:00 and 16:00, and a model run on a night-occupancy profile does not describe the building they will sleep in."));
doc.push(h2("9.2  The comfort brief"));
{ const w = [1500, 5300, 2220];
  doc.push(grid(w, ["", "Requirement", "Where it comes from"], A.a9.comfort, { bold: [0] })); }
doc.push(br());

// ── A10
doc.push(h1("Appendix 10  Form of collateral warranty — content schedule"));
doc.push(...paras(B.a10.intro));
{ const w = [1600, 3100, 2160, 2160];
  doc.push(grid(w, ["Clause", "What it requires", "Why it is there", "The negotiation to expect"], B.a10.clauses, { bold: [0] })); }
doc.push(flag("This is a content schedule. The form itself is drafted by the Employer's legal adviser and issued as an addendum before the clarification deadline. Nothing in this appendix is legal advice."));
doc.push(br());

// ── A11
doc.push(h1("Appendix 11  Asset information requirements and the data schema"));
doc.push(...paras(A.a11.intro));
doc.push(h2("11.1  The schema"));
{ const w = [1700, 900, 3200, 1300, 1920];
  doc.push(grid(w, ["Field", "Type", "Format or domain", "Mandatory", "Example"], A.a11.schema, { bold: [0],
    fill: (r, i) => (i === 3 && r[3] === "Yes" ? TINT : undefined) })); }
doc.push(h2("11.2  Rules"));
{ const w = [2000, 7020]; doc.push(table(w, rows(w, A.a11.rules, { bold: [0], size: 17, fill: (r, i) => (i === 0 ? PAPER : undefined) }))); }
doc.push(br());

// ── A12
doc.push(h1("Appendix 12  Social value framework and the travel-to-work area"));
doc.push(...paras(A.a12.intro));
doc.push(p(A.a12.ttwa, { bold: true, before: 140 }));
doc.push(h2("12.1  The framework"));
{ const w = [1400, 2100, 2200, 900, 1620, 800];
  doc.push(grid(w, ["Theme", "Outcome", "Measure", "Unit", "Evidence", "Weight"], A.a12.framework, { bold: [0], size: 14,
    fill: (r) => (/people who live here/i.test(r[0]) ? TINT : undefined) })); }
doc.push(h2("12.2  Rules"));
{ const w = [2000, 7020]; doc.push(table(w, rows(w, A.a12.rules, { bold: [0], size: 17, fill: (r, i) => (i === 0 ? PAPER : undefined) }))); }

const document = new Document({
  creator: "ETABLIX — Integrated Site Services",
  title: "Employer's Requirements — the twelve appendices, P2 Modular Accommodation",
  description: M.project,
  styles: { default: { document: { run: { font: F, size: 19, color: INK } } } },
  sections: [{
    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: `${M.ref} Rev ${M.rev}  ·  appendices to ${M.parent}`, font: F, size: 14, color: SLATE })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: "Page ", font: F, size: 14, color: SLATE }),
                 new TextRun({ children: [PageNumber.CURRENT], font: F, size: 14, color: SLATE }),
                 new TextRun({ text: " of ", font: F, size: 14, color: SLATE }),
                 new TextRun({ children: [PageNumber.TOTAL_PAGES], font: F, size: 14, color: SLATE })] })] }) },
    children: doc,
  }],
});
Packer.toBuffer(document).then((buf) => {
  fs.writeFileSync("/home/user/etablix/business/tender/ETABLIX-ER-P2-Appendices.docx", buf);
  console.log(`written: ${Math.round(buf.length / 1024)} KB · ${doc.length} body elements`);
});
