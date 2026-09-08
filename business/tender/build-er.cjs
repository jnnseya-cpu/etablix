const fs = require("fs");
const D = require("/tmp/claude-0/-home-user-etablix/fe91c2e4-7425-5fd0-aa86-a0a156d734f1/scratchpad/docxlib/node_modules/docx");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType,
  HeadingLevel, AlignmentType, BorderStyle, PageBreak, Header, Footer, PageNumber,
  TableOfContents, LevelFormat, PageOrientation,
} = D;
const C = require("/home/user/etablix/business/tender/er-content.cjs");
const S = require("/home/user/etablix/business/tender/er-spec.cjs");
const B = require("/home/user/etablix/business/tender/er-revb.cjs");

const INK = "14181D", GOLD = "9C7A3C", SLATE = "5B6672", RED = "C0392B", PAPER = "F2EFE7";
const W = 9020;                                    // usable width, A4 portrait, 1440 margins
const F = "Arial";
const cellB = { top: { style: BorderStyle.SINGLE, size: 2, color: "D5D5D5" }, bottom: { style: BorderStyle.SINGLE, size: 2, color: "D5D5D5" },
                left: { style: BorderStyle.SINGLE, size: 2, color: "D5D5D5" }, right: { style: BorderStyle.SINGLE, size: 2, color: "D5D5D5" } };

const p = (text, o = {}) => new Paragraph({
  spacing: { before: o.before ?? 60, after: o.after ?? 60, line: 260 },
  alignment: o.align, indent: o.indent,
  children: [new TextRun({ text, font: F, size: o.size ?? 19, bold: o.bold, italics: o.italics, color: o.color ?? INK })],
});
// multi-paragraph body. docx has no newline inside a run, so split.
// A line indented by four spaces is a figure block and is set in a monospaced face.
const paras = (text, o = {}) => String(text).split("\n").filter((l) => l.trim() !== "").map((l) =>
  l.startsWith("    ")
    ? new Paragraph({ spacing: { before: 20, after: 20, line: 240 },
        children: [new TextRun({ text: l.replace(/^ {4}/, ""), font: "Courier New", size: 16, color: INK })] })
    : new Paragraph({ spacing: { before: o.before ?? 60, after: o.after ?? 60, line: 260 },
        children: [new TextRun({ text: l, font: F, size: o.size ?? 19, color: o.color ?? INK })] }));
const h3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 80 },
  children: [new TextRun({ text: t, font: F, size: 19, bold: true, color: SLATE })] });
const h1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 140 },
  children: [new TextRun({ text: t, font: F, size: 28, bold: true, color: INK })] });
const h2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 100 },
  children: [new TextRun({ text: t, font: F, size: 22, bold: true, color: GOLD })] });
const cell = (text, o = {}) => new TableCell({
  width: { size: o.w, type: WidthType.DXA }, borders: cellB, margins: { top: 60, bottom: 60, left: 90, right: 90 },
  shading: o.fill ? { type: ShadingType.CLEAR, color: "auto", fill: o.fill } : undefined,
  columnSpan: o.span,
  children: (Array.isArray(text) ? text : [text]).map((t) => new Paragraph({
    spacing: { before: 20, after: 20, line: 240 },
    children: [new TextRun({ text: String(t), font: F, size: o.size ?? 17, bold: o.bold, italics: o.italics, color: o.color ?? INK })],
  })),
});
const table = (widths, rows) => new Table({ columnWidths: widths, width: { size: W, type: WidthType.DXA }, rows });
const hdr = (widths, labels) => new TableRow({ tableHeader: true,
  children: labels.map((l, i) => cell(l, { w: widths[i], bold: true, fill: INK, color: "FFFFFF", size: 17 })) });

const doc = [];
// ── cover
doc.push(new Paragraph({ spacing: { before: 1800, after: 0 }, children: [new TextRun({ text: "ETABLIX", font: F, size: 56, bold: true, color: INK })] }));
doc.push(new Paragraph({ spacing: { after: 900 }, children: [new TextRun({ text: "I N T E G R A T E D   S I T E   S E R V I C E S   ·   P A R T   O F   G R O U P E   N S E Y A", font: F, size: 14, bold: true, color: GOLD })] }));
doc.push(p("EMPLOYER'S REQUIREMENTS", { size: 40, bold: true, before: 0, after: 60 }));
doc.push(p(C.meta.package, { size: 30, color: GOLD, bold: true, after: 700 }));
doc.push(table([2400, 6620], [
  ["Client", C.meta.client], ["Project", C.meta.project], ["Package", C.meta.package],
  ["Document reference", C.meta.ref], ["Revision", C.meta.rev], ["Date", C.meta.date],
  ["Status", "Issued for tender"],
].map(([k, v]) => new TableRow({ children: [cell(k, { w: 2400, bold: true, fill: PAPER }), cell(v, { w: 6620 })] }))));
doc.push(new Paragraph({ spacing: { before: 700 }, children: [new TextRun({
  text: "This document states what is required. It does not state how it is to be achieved, except where a method is itself a requirement. "
      + "Where a tenderer's proposal departs from this document, the departure shall be stated in the Schedule of Departures and priced separately, "
      + "so that what is compared is comparable.", font: F, size: 18, italics: true, color: SLATE })] }));
doc.push(new Paragraph({ children: [new PageBreak()] }));

// ── revision record
doc.push(h1("Revision record"));
const vw = [900, 1700, 6420];
doc.push(table(vw, [hdr(vw, ["Rev", "Date", "Description"]),
  ...[["A", "September 2026", "First issue for tender."],
      ["B", "September 2026", "Reissued for tender. Rev A was reviewed against a 25-point register of the questions this Employer applies to any Employer's Requirements, and failed three of them fatally. Rev B implements all twenty-five findings; Annex A maps each finding to the clause that answers it. Sections 13 to 19 are new. Section 4 gains clauses 4.21 to 4.27 and rewrites 4.14, 4.18 and 4.20. Every room data sheet line now carries a basis code. Section 13 of Rev A (Appendices) is renumbered section 20; no other clause number has changed, so correspondence citing a Rev A clause still lands on the same clause."]]
    .map((r) => new TableRow({ children: r.map((v, i) => cell(v, { w: vw[i], bold: i === 0 })) }))]));
doc.push(p("Two corrections were made at Rev B beyond the twenty-five findings. The air permeability test standard was cited as ATTMA TSL1, which is the dwellings protocol and is the wrong document for this building; it is now TSL2. And Rev A used “the tenderer” for obligations that plainly survive award; Rev B uses “Contractor” for those and reserves “tenderer” for what is required with the tender.", { italics: true, color: SLATE }));
doc.push(new Paragraph({ children: [new PageBreak()] }));

// ── contents
doc.push(h1("Contents"));
doc.push(new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-2" }));
doc.push(new Paragraph({ children: [new PageBreak()] }));

// ── 1
doc.push(h1("1  Introduction and status of this document"));
doc.push(h2("1.1  Purpose"));
doc.push(p("These Employer's Requirements define the accommodation and amenity buildings required for the workforce village serving " + C.meta.project + ". They are issued as part of the tender documents for " + C.meta.package + " and form part of the subcontract on award."));
doc.push(h2("1.2  Document hierarchy"));
doc.push(p("Where documents conflict, the following order prevails, the first named taking precedence:"));
[["1", "The subcontract conditions and any amendments"], ["2", "These Employer's Requirements"], ["3", "The fire strategy issued at Appendix 2"],
 ["4", "The drawings listed in the Drawings and Documents Register at section 11"], ["5", "The Contractor's Proposals as accepted under 13.4, to the extent they do not conflict with the above"]]
 .forEach(([n, t]) => doc.push(p(n + ".   " + t, { indent: { left: 360 }, before: 20, after: 20 })));
doc.push(p("A tenderer who identifies a conflict before the clarification deadline shall raise it. A conflict raised after award is resolved by the order above and at the tenderer's cost.", { italics: true, color: SLATE }));
doc.push(h2("1.3  Design responsibility"));
doc.push(p("This is a contractor-designed package. Section 13 states, element by element, what the Employer has fixed and what the Contractor designs, and every line of every room data sheet carries a code saying which of the two it is. A tenderer should read section 13 before reading anything else in this document, because it determines what the rest of it means."));
doc.push(h2("1.4  What is NOT in this package"));
doc.push(p("The following are expressly excluded. Each names the package that does hold it — an exclusion that names nobody is a gap, and it will be found at the worst possible moment."));
doc.push(table([3400, 2400, 3220], [
  hdr([3400, 2400, 3220], ["Excluded from this package", "Held under", "Interface reference"]),
  ...[["Ground preparation, bases, plinths and drainage", "P1 Civil Works", "IF-01, IF-02"],
      ["Roads, hardstanding, parking and external lighting", "P1 Civil Works", "—"],
      ["Kitchen fit-out, catering equipment and extraction", "P3 Kitchen", "IF-04"],
      ["All loose furniture, including bedroom furniture", "P4 Furniture", "IF-05, IF-06"],
      ["Operation, housekeeping, catering and maintenance", "P5 FM and Operation", "IF-07 to IF-10"],
      ["CCTV cameras, recording and monitoring", "P5 FM and Operation", "4.19"],
      ["The fire strategy itself", "Client's fire engineer", "IF-11"]]
    .map((r) => new TableRow({ children: r.map((v, i) => cell(v, { w: [3400, 2400, 3220][i] })) }))]));
doc.push(h2("1.5  Definitions and abbreviations"));
doc.push(p("Terms used in this document have the meanings below. Where a term is defined in the subcontract conditions and also here, the subcontract definition prevails."));
const dfw = [2400, 6620];
doc.push(table(dfw, [hdr(dfw, ["Term", "Meaning"]),
  ...B.defs.map((r) => new TableRow({ children: r.map((v, i) => cell(v, { w: dfw[i], bold: i === 0, size: 16 })) }))]));
doc.push(new Paragraph({ children: [new PageBreak()] }));

// ── 2 room schedule
doc.push(h1("2  Room schedule"));
doc.push(table([1100, 5200, 1000, 1720], [
  hdr([1100, 5200, 1000, 1720], ["Type", "Description", "Quantity", "Data sheet"]),
  ...C.roomTypes.map((r) => new TableRow({ children: [
    cell(r.code, { w: 1100, bold: true }), cell([r.name, r.note], { w: 5200 }),
    cell(r.qty, { w: 1000 }), cell("Section 3", { w: 1720 })] }))]));
doc.push(p("Quantities are as scheduled and are subject to remeasurement only where this document expressly permits it. The tenderer shall satisfy itself as to quantities from the drawings listed at section 11.", { italics: true, color: SLATE }));

// ── 3 room data sheets
doc.push(new Paragraph({ children: [new PageBreak()] }));
doc.push(h1("3  Room data sheets"));
doc.push(p("Every line is a requirement. Where a cell reads “As RT-01” the requirement for RT-01 applies in full to that room type."));
doc.push(p("THE BASIS COLUMN. E means the Employer has prescribed the thing and carries the risk that what is prescribed performs. C means the Employer has stated a duty and the Contractor designs, selects and warrants the means of meeting it. The full consequence of each is at 13.2, and a tenderer that does not understand the distinction will misprice this package.", { bold: true }));
const rw = [1750, 2340, 2180, 2090, 660];
doc.push(table(rw, [
  new TableRow({ tableHeader: true, children: ["Item", "RT-01  Standard bedroom", "RT-02  Accessible bedroom", "RT-03  Senior bedroom", "Basis"]
    .map((l, i) => cell(l, { w: rw[i], bold: true, fill: INK, color: "FFFFFF", size: i === 4 ? 15 : 17 })) }),
  ...C.rds.map((r) => r[1] === ""
    ? new TableRow({ children: [cell(r[0], { w: W, span: 5, bold: true, fill: PAPER, size: 17 })] })
    : new TableRow({ children: r.map((v, i) => cell(v, { w: rw[i], bold: i === 0 || i === 4, size: 16,
        fill: i === 4 && v === "C" ? "EFE6D2" : undefined })) }))]));
doc.push(p("Count: " + C.rds.filter((r) => r[4] === "E").length + " lines Employer-prescribed, " + C.rds.filter((r) => r[4] === "C").length + " lines Contractor-designed.", { italics: true, color: SLATE }));

// ── 4 technical specification
doc.push(new Paragraph({ children: [new PageBreak()] }));
doc.push(h1("4  Technical specification, by element"));
S.spec.forEach(([cl, el, req]) => { doc.push(h2(cl + "  " + el)); paras(req).forEach((x) => doc.push(x)); });

// ── 5 interfaces
doc.push(new Paragraph({ children: [new PageBreak()] }));
doc.push(h1("5  Interface schedule"));
doc.push(h2("5.1  Why this section exists"));
doc.push(p("A package fails at its boundaries, not in its middle. Each interface below states what is handed over, in what state, who certifies it and when. An interface that is not certified by the date stated is a notifiable event under the subcontract."));
doc.push(h2("5.2  The interfaces"));
const iw = [900, 1700, 3020, 1900, 1500];
doc.push(table(iw, [
  hdr(iw, ["Ref", "With", "What is handed over", "Certified by", "When"]),
  ...S.ifaces.map((r) => new TableRow({ children: r.map((v, i) => cell(v, { w: iw[i], bold: i === 0, size: 16 })) }))]));

// ── 6 performance
doc.push(new Paragraph({ children: [new PageBreak()] }));
doc.push(h1("6  Performance schedule"));
doc.push(p("These are the Employer's requirements. Compliance with statutory requirements is the tenderer's duty and is not discharged by meeting the figures below; where a statutory requirement is more onerous, it prevails."));
const pw = [3100, 3400, 2520];
doc.push(table(pw, [
  hdr(pw, ["Criterion", "Requirement", "How it is verified"]),
  ...S.perf.map((r) => new TableRow({ children: r.map((v, i) => cell(v, { w: pw[i], bold: i === 0, size: 16 })) }))]));

fs.writeFileSync("/home/user/etablix/business/tender/_doc.json", JSON.stringify({ ok: true }));
module.exports = { doc, p, h1, h2, cell, table, hdr, W, INK, GOLD, SLATE, RED, PAPER, F, D };

// ── 7 onwards, and assembly
const { Document: Doc2, Packer: Pk } = D;
const more = [];
more.push(new Paragraph({ children: [new PageBreak()] }));
more.push(h1("7  Programme and delivery"));
[["7.1","Fixed point","The village must be live before the first travelling worker arrives. That date, not the tender return date, is the fixed point in this programme. The tenderer shall demonstrate in its tender programme how it is met, and shall state the latest date by which each of the interfaces at section 5 must be satisfied for it to remain achievable."],
 ["7.2","Delivery sequence","Blocks are to be delivered, set and weathertight in the sequence at Appendix 6, which is driven by the bed demand curve and not by manufacturing convenience. A tenderer proposing a different sequence shall price it as a departure and state the effect on the first-occupation date."],
 ["7.3","Weather and abnormal loads","Deliveries are by abnormal load over the route at Appendix 7, which includes a structure subject to assessment. The tenderer shall confirm vehicle configuration and axle loading with its tender, and shall not assume the route is available until the assessment is complete."],
 ["7.4","Working hours","Installation is restricted to the hours in the planning consent at Appendix 3. Craneage outside those hours requires the client's prior written agreement and the discharge of the relevant condition."],
 ["7.5","Notification","Fourteen days' notice of each delivery, confirmed at seven days and again at forty-eight hours. A delivery arriving without confirmed notice may be refused entry."]]
 .forEach(([n,t,b])=>{more.push(h2(n+"  "+t));more.push(p(b));});

more.push(new Paragraph({ children: [new PageBreak()] }));
more.push(h1("8  Quality, inspection, testing and commissioning"));
[["8.1","Inspection and test plan","Submitted within four weeks of award, covering manufacture, delivery, installation and commissioning, with hold points the client may witness. Work proceeding past an unsigned hold point may be opened up at the tenderer's cost."],
 ["8.2","Factory inspection","The client reserves the right to inspect at the place of manufacture. The first module of each type is a benchmark and shall not be delivered until accepted; the benchmark remains available for comparison until the last module is set."],
 ["8.3","Sample room","One complete RT-01, fully finished and serviced, shall be available for inspection not less than four weeks before the first delivery. It is the standard against which every subsequent room is measured."],
 ["8.4","Pre-completion testing","Acoustic testing on a sample of one room pair in ten, and air permeability on one block in three, both to the standards at section 6. A failure requires the tenderer to test a further sample of the same size at its own cost, and to remedy every room represented by a failed test."],
 ["8.5","Commissioning","Every ensuite extract rate, every water outlet temperature and every TMV measured and recorded individually. A commissioning record stating “all outlets satisfactory” without individual results will be rejected."],
 ["8.6","Demonstration","Fire alarm cause and effect, emergency lighting, access control hierarchy and the wireless heat map demonstrated to the client and to P5 before handover."]]
 .forEach(([n,t,b])=>{more.push(h2(n+"  "+t));more.push(p(b));});

more.push(h2("8.7  Sample room inspection checklist"));
more.push(p("The sample room at 8.3 is the standard against which every subsequent room is measured, so what is checked against what must be written down before the inspection rather than agreed during it. Every line below is checked, recorded, signed and dated by the Contractor and countersigned by the Employer. A line that cannot be checked because the work is not complete is recorded as such and rechecked; it is not passed."));
const sw = [1250, 2600, 3070, 2100];
more.push(table(sw, [hdr(sw, ["Group", "Check", "Acceptance criterion", "Evidence"]),
  ...B.sample.map((r) => new TableRow({ children: r.map((v, i) => cell(v, { w: sw[i], bold: i === 0, size: 16 })) }))]));
more.push(p("The sample room is not accepted until every line is passed. Manufacture of the balance of the modules of that type before acceptance is at the Contractor's risk, and a defect found in the sample and repeated across a production run is a systemic defect under 19.1.", { italics: true, color: RED }));

more.push(new Paragraph({ children: [new PageBreak()] }));
more.push(h1("9  Handover"));
const hw=[3000,6020];
more.push(table(hw,[hdr(hw,["Deliverable","Requirement"]),
 ...[["As-installed drawings","PDF and native format, every discipline, reflecting what was built rather than what was designed"],
  ["O&M manuals","Digital and one hard copy, indexed, including manufacturer literature, spares schedule and maintenance frequencies"],
  ["Test and commissioning records","Individual results as required at 8.5, not summaries"],
  ["Electrical certification","BS 7671 certificates with individual circuit results and an as-installed schedule"],
  ["Fire doorset register","Every doorset, its rating, certification and location"],
  ["Firestopping register","Every penetration, its location, the system used and the installer's certification"],
  ["Legionella written scheme","Per 4.12, with the flushing log from first fill to handover"],
  ["Warranties","Assigned to the client, including the roof material warranty at 4.4"],
  ["Asset register","Every maintainable asset, tagged, with location and expected life — in the format required by P5"],
  ["Training","Two sessions for P5's staff, recorded, covering plant, alarm, access control and the water system"],
  ["Spares","Twelve months' consumables and a defined critical spares holding, listed and priced separately in the tender"]]
  .map(r=>new TableRow({children:r.map((v,i)=>cell(v,{w:hw[i],bold:i===0}))}))]));
more.push(p("Occupation shall not commence before commissioning is complete and the handover deliverables above have been received. This is scheduled as interface IF-07 and is not a matter of convenience.",{italics:true,color:RED}));

more.push(new Paragraph({ children: [new PageBreak()] }));
more.push(h1("10  Health, safety and environment"));
[["10.1","CDM 2015","The client has appointed a Principal Designer and Principal Contractor for the project. This tenderer is a contractor under the Regulations and shall comply with the construction phase plan. Nothing in this document appoints this tenderer to either statutory role."],
 ["10.2","Lifting operations","Every lift planned by a competent person, with the plan submitted seven days beforehand. Exclusion zones maintained. No lift over an occupied area at any time."],
 ["10.3","Live site interface","Installation takes place alongside a live construction site. Segregation of the installation area from site traffic and from any occupied part of the village is this tenderer's responsibility and shall be shown on its logistics plan."],
 ["10.4","Firestopping register","Maintained during installation, not compiled at the end. The client may inspect it at any time; an incomplete register is a hold on payment."],
 ["10.5","Waste","Duty of care applies. Transfer notes for every movement. Packaging returned or recycled; a target of 90% diversion from landfill is required and shall be reported monthly."],
 ["10.6","Environmental","Compliance with the CEMP at Appendix 4, including hours, noise, dust, lighting and the ecological constraints recorded there."]]
 .forEach(([n,t,b])=>{more.push(h2(n+"  "+t));more.push(p(b));});
B.labour.forEach(([n,t,b])=>{more.push(h2(n+"  "+t));paras(b).forEach((x)=>more.push(x));});

more.push(new Paragraph({ children: [new PageBreak()] }));
more.push(h1("11  Drawings and documents register"));
more.push(h2("11.1  Issued with this document"));
const dw=[1900,4400,1200,1520];
more.push(table(dw,[hdr(dw,["Reference","Title","Revision","Status"]),
 ...[["NR-TW-C1-0101","C1 main compound general arrangement","A","For tender"],
  ["NR-TW-VIL-0201","Village general arrangement and block layout","B","For tender"],
  ["NR-TW-VIL-0202","Block type plans and elevations","A","For tender"],
  ["NR-TW-VIL-0203","Service termination point coordination drawing","A","For tender — to be signed under IF-02"],
  ["NR-FS-VIL-001","Fire strategy","C","For tender — Appendix 2"],
  ["NR-SC-VIL-001","Bed demand curve and occupancy programme","B","For information — Appendix 6"],
  ["NR-AL-001","Abnormal load route assessment","Draft","For information — Appendix 7, assessment incomplete"]]
  .map(r=>new TableRow({children:r.map((v,i)=>cell(v,{w:dw[i],size:16}))}))]));
more.push(p("The abnormal load route assessment is incomplete and is issued as a draft. The tenderer shall not assume the route is available. This is stated so that an assumption is priced rather than a risk.",{italics:true,color:RED}));
more.push(h2("11.2  Required from the tenderer with its tender"));
[["Contractor's Proposals — drawings, schedules, calculations and product data showing what is offered","13.4"],
 ["Schedule of Departures, in the Employer's form, each departure priced separately as a plus or a minus","13.4"],
 ["Design calculations for the U-values, air permeability strategy and thermal bridging","Section 6"],
 ["Setting-out and base tolerance specification, and the crane outrigger ground bearing pressure","4.1, 4.21, IF-01, IF-03"],
 ["Maintenance access strategy drawing, showing every dimension at 4.14 at every plant position","4.14"],
 ["Roof access strategy drawing","4.22"],
 ["Door schedule stating which of the two failure-mode regimes applies to every door","4.18"],
 ["Maximum demand calculation per block, with diversity stated and the heating load included","4.24"],
 ["Relocation method statement, with the schedule of components consumed by dismantling","13.7"],
 ["Tender programme showing every interface date at section 5 and total float on every activity","7.1, 18.4"],
 ["Logistics plan for delivery, craneage and segregation, worked within the laydown allocation","10.3, 14.3"],
 ["All-in labour, plant, overhead and profit rates for the valuation of change","17.2"],
 ["Embodied carbon declaration, EPDs for the ten heaviest products, and the operational energy declaration","16.2, 16.3"],
 ["Social value commitments against the framework at Appendix 12","16.5"],
 ["Support, spares, protocol and subscription position for every proprietary system","19.4"],
 ["Location of every place of manufacture, and the professional indemnity insurance evidence","10.7, 13.6"],
 ["Priced activity schedule in the structure at Appendix 1","Section 12"]]
 .forEach(([t,r])=>more.push(p("·   "+t+"   ("+r+")",{indent:{left:280},before:20,after:20})));

more.push(new Paragraph({ children: [new PageBreak()] }));
more.push(h1("12  Pricing and the activity schedule"));
more.push(p("The tender shall be priced against the activity schedule at Appendix 1, in its issued structure. A tenderer who alters the structure produces a return that cannot be compared with the others, and it will be marked accordingly."));
const aw=[1100,4600,1660,1660];
more.push(table(aw,[hdr(aw,["Item","Activity","Basis","Included in the lump sum"]),
 ...[["A","Design, calculations and approvals","Lump sum","Yes"],
  ["B","Manufacture — bedroom modules, by room type","Rate per module","Yes"],
  ["C","Manufacture — amenity, reception and circulation","Lump sum","Yes"],
  ["D","Transport and delivery to site","Rate per module","Yes"],
  ["E","Craneage, setting and connection","Lump sum","Yes"],
  ["F","Internal fit-out and fixed joinery","Rate per room type","Yes"],
  ["G","Mechanical and electrical installation","Lump sum","Yes"],
  ["H","Commissioning, testing and demonstration","Lump sum","Yes"],
  ["I","Handover deliverables and training","Lump sum","Yes"],
  ["J","Critical spares holding","Priced separately","Stated separately"],
  ["K","Sample room, in advance of the main delivery","Lump sum","Yes"],
  ["L","Departures from these Employer's Requirements","Each priced separately","No — listed and priced individually"]]
  .map(r=>new TableRow({children:r.map((v,i)=>cell(v,{w:aw[i],bold:i===0,size:16}))}))]));
more.push(p("The price is fixed for the full contract period. No fluctuation applies. Where the tenderer requires an indexation mechanism it shall be proposed and priced as a departure under item L, stating the index and the base date.",{italics:true,color:SLATE}));

// ── 13 design responsibility
more.push(new Paragraph({ children: [new PageBreak()] }));
more.push(h1("13  Design responsibility"));
B.design.forEach(([n,t,b])=>{more.push(h2(n+"  "+t));paras(b).forEach((x)=>more.push(x));
  if(n==="13.3"){
    const mw=[2150,620,3050,3200];
    more.push(table(mw,[hdr(mw,["Element","Code","The Employer provides","The Contractor is responsible for"]),
      ...B.matrix.map((r)=>new TableRow({children:r.map((v,i)=>cell(v,{w:mw[i],bold:i===0||i===1,size:16,
        fill:i===1?(v==="ED"?"E8E2D4":v==="CD"?"EFE6D2":v==="CF"?"F7F0DC":undefined):undefined}))}))]));
    more.push(p("An element not in this matrix is the Contractor's design. Where the Contractor believes an element is missing from it, it shall raise a tender query; it shall not assume the omission is in its favour.",{italics:true,color:SLATE}));
  }});

// ── 14 site
more.push(new Paragraph({ children: [new PageBreak()] }));
more.push(h1("14  Site constraints and site conduct"));
B.site.forEach(([n,t,b])=>{more.push(h2(n+"  "+t));paras(b).forEach((x)=>more.push(x));});

// ── 15 information
more.push(new Paragraph({ children: [new PageBreak()] }));
more.push(h1("15  Information requirements and asset data"));
B.info.forEach(([n,t,b])=>{more.push(h2(n+"  "+t));paras(b).forEach((x)=>more.push(x));});

// ── 16 sustainability
more.push(new Paragraph({ children: [new PageBreak()] }));
more.push(h1("16  Sustainability, carbon and social value"));
B.sust.forEach(([n,t,b])=>{more.push(h2(n+"  "+t));paras(b).forEach((x)=>more.push(x));});

// ── 17 change control
more.push(new Paragraph({ children: [new PageBreak()] }));
more.push(h1("17  Change control"));
B.change.forEach(([n,t,b])=>{more.push(h2(n+"  "+t));paras(b).forEach((x)=>more.push(x));});

// ── 18 delay
more.push(new Paragraph({ children: [new PageBreak()] }));
more.push(h1("18  Sectional completion, delay and liquidated damages"));
B.delay.forEach(([n,t,bd])=>{more.push(h2(n+"  "+t));
  const ps=paras(bd);
  ps.forEach((x,i)=>{more.push(x);
    if(n==="18.2"&&i===1){
      const lw=[5100,2100,1820];
      more.push(table(lw,[hdr(lw,["Head of loss, per person, per day a bed is not available","Rate","Basis"]),
        ...[["Substitute accommodation","£95.00","Negotiated regional rate for a 38-month commitment"],
            ["Subsistence uplift over the village provision","£22.00","Difference between the village catering rate and a commercial one"],
            ["Additional travel","£40.50","45 miles each way at 45p per mile"],
            ["Administration of the substitute arrangement","£8.00","Booking, reconciliation and payroll adjustment"],
            ["Total","£165.50","Rate applied: £145.00, set below the calculated loss"]]
          .map((r,j)=>new TableRow({children:r.map((v,k)=>cell(v,{w:lw[k],bold:j===4||k===1,size:16,fill:j===4?PAPER:undefined}))}))]));
    }});});

// ── 19 defects
more.push(new Paragraph({ children: [new PageBreak()] }));
more.push(h1("19  Defects, obsolescence and support after completion"));
B.defects.forEach(([n,t,b])=>{more.push(h2(n+"  "+t));paras(b).forEach((x)=>more.push(x));});

// ── 20 appendices
more.push(new Paragraph({ children: [new PageBreak()] }));
more.push(h1("20  Appendices"));
[["1","Activity schedule, in the structure to be priced"],["2","Fire strategy, issued by the Employer's fire engineer"],
 ["3","Planning consent and conditions, and the Employer's site rules"],["4","Construction Environmental Management Plan"],
 ["5","Approved external colour and finish range"],["6","Bed demand curve, occupancy programme and the sectional completion dates"],
 ["7","Abnormal load route assessment — draft, incomplete"],["8","Design loadings, site exposure, rainfall data and the service supply characteristics"],
 ["9","Overheating criterion and the Employer's comfort brief"],["10","Form of collateral warranty"],
 ["11","Asset information requirements, the data schema and the common data environment"],["12","Social value framework and the travel-to-work area"]]
 .forEach(([n,t])=>more.push(p("Appendix "+n+"   —   "+t,{indent:{left:280},before:20,after:20})));
more.push(p("All twelve are issued, in NR-ER-P2-APX Rev A, which forms part of these Employer's Requirements and has the same contractual force as this document.",{bold:true}));
more.push(p("Eight are the Employer's own and are written in full: the activity schedule, the approved colour range, the bed demand curve with the sectional completion dates, the design and supply data, the overheating criterion, the collateral warranty content schedule, the asset data schema and the social value framework. Four are produced by others — the fire strategy, the planning consent, the CEMP and the abnormal load route assessment — and are issued as controlled insertion sheets. Each of those four states what this document depends on it for, WHAT A TENDERER PRICES UNTIL IT ARRIVES, and what happens if the issued document differs from that basis.",{color:SLATE}));
more.push(p("A tenderer shall price on the stated basis and say in its tender that it has done so. It shall not price a worst case against an appendix that has not yet been issued, and it shall not assume the basis away. A value confirmed later at a worse position is a change under section 17; a value assumed silently is not.",{italics:true,color:RED}));

// ── Annex A
more.push(new Paragraph({ children: [new PageBreak()] }));
more.push(h1("Annex A  Rev A gap register, and where Rev B answers it"));
more.push(p("Rev A was reviewed against the twenty-five questions this Employer applies to any Employer's Requirements, including its own. The register is a separate document. This annex is here so that a tenderer, a reviewer or an auditor can see what changed and why, without having to compare two revisions line by line — and so that the same twenty-five questions can be applied to the other four packages before they are issued rather than after."));
const gw=[620,900,2700,4800];
more.push(table(gw,[hdr(gw,["Ref","Severity","The finding against Rev A","Where Rev B answers it"]),
  ...B.impl.map((r)=>new TableRow({children:r.map((v,i)=>cell(v,{w:gw[i],bold:i===0,size:15,
    color:i===1&&v==="Fatal"?RED:undefined}))}))]));

const document = new Doc2({
  creator: "ETABLIX — Integrated Site Services",
  title: "Employer's Requirements — " + C.meta.package,
  description: C.meta.project,
  styles: { default: { document: { run: { font: F, size: 19, color: INK } } } },
  features: { updateFields: true },
  sections: [{
    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: GOLD } },
      children: [new TextRun({ text: "ETABLIX   ·   Employer's Requirements   ·   " + C.meta.package + "   ·   " + C.meta.ref + " Rev " + C.meta.rev, font: F, size: 15, color: SLATE })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: "Page ", font: F, size: 15, color: SLATE }), new TextRun({ children: [PageNumber.CURRENT], font: F, size: 15, color: SLATE }),
                 new TextRun({ text: " of ", font: F, size: 15, color: SLATE }), new TextRun({ children: [PageNumber.TOTAL_PAGES], font: F, size: 15, color: SLATE })] })] }) },
    children: [...doc, ...more],
  }],
});
Pk.toBuffer(document).then((b) => {
  fs.writeFileSync("/home/user/etablix/business/tender/ETABLIX-ER-P2-Modular-Accommodation.docx", b);
  console.log("written:", (b.length / 1024).toFixed(0), "KB ·", doc.length + more.length, "body elements");
});
