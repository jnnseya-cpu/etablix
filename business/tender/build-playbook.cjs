const fs = require("fs");
const SP = "/tmp/claude-0/-home-user-etablix/fe91c2e4-7425-5fd0-aa86-a0a156d734f1/scratchpad/docxlib/node_modules/docx";
const D = require(SP);
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType,
  HeadingLevel, BorderStyle, PageBreak, Header, Footer, PageNumber, TableOfContents, AlignmentType,
} = D;
const A = require("/home/user/etablix/business/tender/playbook-content.cjs");
const B = require("/home/user/etablix/business/tender/playbook-consolidation.cjs");

const INK = "14181D", GOLD = "9C7A3C", SLATE = "5B6672", RED = "C0392B", PAPER = "F2EFE7", TINT = "EFE6D2";
const W = 9020, F = "Arial";
const cellB = ["top", "bottom", "left", "right"].reduce((o, k) => ((o[k] = { style: BorderStyle.SINGLE, size: 2, color: "D5D5D5" }), o), {});

const p = (rawText, o = {}) => { const text = typeof resolve === "function" ? resolve(rawText) : rawText; return new Paragraph({
  spacing: { before: o.before ?? 60, after: o.after ?? 60, line: 260 }, indent: o.indent,
  children: [new TextRun({ text, font: F, size: o.size ?? 19, bold: o.bold, italics: o.italics, color: o.color ?? INK })],
}); };
// A clause body may hold several paragraphs; docx has no newline inside a run.
const paras = (text, o = {}) => String(text).split("\n").filter((l) => l.trim()).map((l) => p(l, o));
const h1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 140 },
  children: [new TextRun({ text: t, font: F, size: 28, bold: true, color: INK })] });
const h2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 100 },
  children: [new TextRun({ text: t, font: F, size: 22, bold: true, color: GOLD })] });
const cell = (text, o = {}) => new TableCell({
  width: { size: o.w, type: WidthType.DXA }, borders: cellB, margins: { top: 60, bottom: 60, left: 90, right: 90 },
  shading: o.fill ? { type: ShadingType.CLEAR, color: "auto", fill: o.fill } : undefined, columnSpan: o.span,
  children: (Array.isArray(text) ? text : [text]).map((t) => new Paragraph({
    spacing: { before: 20, after: 20, line: 240 },
    children: [new TextRun({ text: resolve(t), font: F, size: o.size ?? 16, bold: o.bold, italics: o.italics, color: o.color ?? INK })],
  })),
});
const table = (widths, rs) => new Table({ columnWidths: widths, width: { size: W, type: WidthType.DXA }, rows: rs });
const hdr = (widths, labels) => new TableRow({ tableHeader: true,
  children: labels.map((l, i) => cell(l, { w: widths[i], bold: true, fill: INK, color: "FFFFFF", size: 16 })) });
const bodyRows = (widths, data, o = {}) => data.map((r) => new TableRow({
  children: r.map((v, i) => cell(v, { w: widths[i], bold: (o.bold || []).includes(i), size: o.size ?? 16, fill: o.fill ? o.fill(r, i) : undefined })) }));
const grid = (widths, labels, data, o = {}) => table(widths, [hdr(widths, labels), ...bodyRows(widths, data, o)]);

const br = () => new Paragraph({ children: [new PageBreak()] });
const note = (t) => p(t, { italics: true, color: SLATE, size: 18, before: 100 });
const flag = (t) => p(t, { italics: true, color: RED, size: 18, before: 100 });

/**
 * The section register — the single source of every number in this document.
 *
 * The clause data carries only its own sub-number; the section number comes
 * from here, and every cross-reference in the prose is a token resolved
 * against this table. Rev A of this build hard-coded clause numbers in the
 * content and section numbers in the build, and they disagreed: clauses
 * printed as 5.x sat under a heading numbered 6, so a reader following
 * "see 5.3" landed in the wrong section. An unresolved or unknown token
 * now fails the build rather than printing.
 */
const SEC = {
  claim:      { n: 1,  list: A.thesis },
  packages:   { n: 2 },
  interfaces: { n: 3 },
  packaging:  { n: 4,  list: A.packaging },
  decision:   { n: 5,  list: B.decision },
  mechanism:  { n: 6,  list: B.mechanism },
  enabling:   { n: 7 },
  pricing:    { n: 8,  list: B.pricing },
  transfers:  { n: 9 },
  traps:      { n: 10 },
  programme:  { n: 11 },
  deed:       { n: 12 },
  after:      { n: 13, list: B.after },
  models:     { n: 14 },
  onepage:    { n: 15 },
};

/** Resolve {{§name}} and {{name.N}}; an unknown token is a build failure. */
function resolve(text) {
  return String(text).replace(/\{\{(§?)([a-z]+)(?:\.(\d+))?\}\}/g, (whole, sect, name, sub) => {
    const s = SEC[name];
    if (!s) throw new Error(`Unknown reference target in "${whole}"`);
    if (sect) return String(s.n);
    if (!s.list) throw new Error(`Section ${name} has no clauses, but "${whole}" points at one`);
    if (Number(sub) < 1 || Number(sub) > s.list.length) throw new Error(`"${whole}" is out of range — ${name} has ${s.list.length} clauses`);
    return `${s.n}.${sub}`;
  });
}
/** Every clause number is derived here, from the section register. */
function clauses(name) {
  const s = SEC[name];
  return s.list.flatMap(([sub, title, body], i) => {
    if (Number(sub) !== i + 1) throw new Error(`${name} clause ${i + 1} is labelled ${sub} — the data is out of order`);
    return [h2(`${s.n}.${sub}  ${title}`), ...paras(resolve(body))];
  });
}

const doc = [];

// ── cover
doc.push(new Paragraph({ spacing: { before: 1700, after: 0 }, children: [new TextRun({ text: "ETABLIX", font: F, size: 56, bold: true, color: INK })] }));
doc.push(new Paragraph({ spacing: { after: 800 }, children: [new TextRun({ text: "I N T E G R A T E D   S I T E   S E R V I C E S   ·   P A R T   O F   G R O U P E   N S E Y A", font: F, size: 14, bold: true, color: GOLD })] }));
doc.push(p(A.meta.title.toUpperCase(), { size: 34, bold: true, before: 0, after: 60 }));
doc.push(p(A.meta.sub, { size: 22, color: GOLD, bold: true, after: 640 }));
doc.push(table([2400, 6620], bodyRows([2400, 6620], [
  ["Document", A.meta.title], ["Reference", A.meta.ref], ["Revision", A.meta.rev],
  ["Date", A.meta.date], ["Classification", A.meta.classification],
], { bold: [0], size: 18, fill: (r, i) => (i === 0 ? PAPER : undefined) })));
doc.push(p("A method document. It states how ETABLIX packages, procures and — where the client decides to — consolidates a workforce accommodation village. It describes no project, names no client and reports no engagement. Where it states a legal position it does so to inform a commercial decision, not to replace advice on one: novation is a three-party contract whose effect turns on the words used and on the facts, and every mechanism in it needs a lawyer to draft it.",
  { before: 620, italics: true, color: SLATE, size: 18 }));
doc.push(br());

doc.push(h1("Contents"));
doc.push(new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-2" }));
doc.push(br());

// ── 1  the claim
doc.push(h1(`${SEC.claim.n}  The claim, and the two numbers behind it`));
doc.push(...clauses("claim"));
doc.push(br());

// ── 2  the five packages
doc.push(h1(`${SEC.packages.n}  The five packages, and where their boundaries fall`));
doc.push(p("What matters is not that there are five. It is that each boundary falls where a supply market changes, and that what is OUTSIDE each package is written down as explicitly as what is inside it. An exclusion that names nobody is a gap, and a gap is found at the worst possible moment."));
{
  const w = [520, 1500, 2280, 1620, 1980, 1120];
  doc.push(grid(w, ["Ref", "Package", "What is in it", "What is expressly out", "Its character in the programme", "Interfaces"],
    A.packages, { bold: [0, 1], size: 15 }));
  doc.push(note("Every interface appears against exactly two packages, because an interface with one owner is not an interface — it is a scope item somebody has already lost."));
}
doc.push(br());

// ── 3  interfaces
doc.push(h1(`${SEC.interfaces.n}  The ten interfaces, which are the actual work`));
doc.push(p("Interfaces between packages grow as n(n−1)÷2. Five packages have ten. Each one below is a point at which one contractor hands something to another and the client stands between them with no contractual means of making either move. These ten are what a consolidation transfers, and they are what a client running five to the end holds itself."));
{
  const w = [560, 900, 2700, 2400, 2460];
  doc.push(grid(w, ["Ref", "Between", "What crosses it", "What settles it", "What happens when it is not settled"],
    B_interfaces(), { bold: [0, 1] }));
}
doc.push(flag("Nine of these ten are not between the client and anybody. They are between two contractors, and the client's only instrument is persuasion. That is the position consolidation ends."));
doc.push(br());

function B_interfaces() { return A.interfaces; }

// ── 4  the packaging decision
doc.push(h1(`${SEC.packaging.n}  The packaging decision: one, five, or five-then-one`));
doc.push(...clauses("packaging"));
doc.push(p("The load, counted:", { bold: true, before: 200 }));
{
  const w = [4200, 2400, 2420];
  doc.push(grid(w, ["What the client carries", "With five packages", "After consolidation"],
    A.load, { bold: [0] }));
}
doc.push(note("The ten interfaces do not disappear. They move inside the prime's scope and are priced there. Anybody who says consolidation removes them is selling something; it removes them from the client, which is the thing worth paying for."));
doc.push(br());

// ── 5  when to consolidate
doc.push(h1(`${SEC.decision.n}  When to consolidate, and when not to`));
doc.push(...clauses("decision"));
{
  const w = [4200, 2400, 2420];
  doc.push(grid(w, ["Question", "Score 0", "Score 2"], B.test, { bold: [0] }));
}
doc.push(flag("If the answer to the seventh line is that a package is NOT performing, stop. Consolidation transfers a failing contractor to a prime who will price the failure at its worst case or refuse to take it, and the client will have paid a wrap to acquire a problem it still owns."));
doc.push(br());

// ── 6  mechanisms
doc.push(h1(`${SEC.mechanism.n}  The three mechanisms, and choosing the prime`));
doc.push(...clauses("mechanism"));
doc.push(p("The five scored against the prime role:", { bold: true, before: 200 }));
{
  const w = [2440, 1300, 1420, 1180, 1180, 1500];
  doc.push(grid(w, ["Criterion", "P1 Civil", "P2 Modular", "P3 Kitchen", "P4 Furniture", "P5 FM & Operation"],
    B.primeScore, { bold: [0], size: 15,
      fill: (r, i) => (i > 0 && /^YES|STRONGEST|USUALLY STRONGEST/.test(String(r[i])) ? TINT : undefined) }));
}
doc.push(note("Read the last two lines together. They are the whole answer: mid-build the work to be managed is construction, and the modular contractor is the better prime; at convergence the work is readiness, handover and running the place, and the FM and operation contractor is — and that is the more common trigger, because the load problem bites as the packages converge rather than while they are still apart."));
doc.push(br());

// ── 7  the day-one clauses
doc.push(h1(`${SEC.enabling.n}  The four clauses that make it possible at all`));
doc.push(p("Everything before this section is a decision. This section is drafting, and it happens eighteen months before the decision is taken. Without these four clauses in all five contracts, consolidation requires four consents given for the first time at the moment the client needs them — which is the moment each contractor has most leverage and least reason to give it cheaply."));
doc.push(p("One of four refusing does not stop a consolidation. It makes it partial, and a partial consolidation is worse than either extreme unless it is chosen deliberately (see 6.4).", { bold: true }));
{
  const w = [520, 1900, 2400, 2500, 1700];
  doc.push(grid(w, ["", "The clause", "What it must say", "Why, and what happens without it", "The detail people get wrong"],
    A.enabling, { bold: [0, 1] }));
}
doc.push(h2(`${SEC.enabling.n}.5  If the clauses are not there`));
doc.push(...paras("The client is not without options, but it is without leverage, and it should price that honestly before it starts.\n\nFIRST, ask. A contractor with more work to win, or one that would rather deal with a prime it already knows than with a client whose attention is elsewhere, may novate for nothing. Ask all four before assuming any of them will resist.\n\nSECOND, buy it. A consent has a price and the price is usually smaller than it feels — an accelerated payment term, a release of retention, an uplift on a variation already in dispute. Decide the ceiling before the conversation, not during it.\n\nTHIRD, take Mechanism C instead. A management wrap without transfer buys the client somebody to run the interfaces while leaving the contracts, the notices and the risk where they are. It is materially less valuable than a consolidation and it should be priced as a service rather than as a prime wrap. It is also the honest answer when the client cannot get the consents and will not pay a ransom for them.\n\nWhat the client must not do is pay a ransom to complete the set. Three of four transferred is most of the benefit; the fourth, bought at a price set by a contractor who knows the client has already moved the other three, is the worst trade in this document."));
doc.push(br());

// ── 8  price
doc.push(h1(`${SEC.pricing.n}  Pricing the wrap`));
doc.push(...clauses("pricing"));
{
  const w = [2100, 620, 620, 3200, 2480];
  doc.push(grid(w, ["Line", "Low %", "High %", "What it pays for", "How to test it"],
    B.stack, { bold: [0], fill: (r) => (/^TOTAL/.test(r[0]) ? PAPER : undefined) }));
}
doc.push(note("The percentages apply to the TRANSFERRED VALUE — the four fixed sums — and not to the prime's own package, which was already priced in its own tender. A stack applied to the whole is the same money charged twice on a fifth of it."));
doc.push(br());

// ── 9  what transfers
doc.push(h1(`${SEC.transfers.n}  What transfers, what does not, and what quietly disappears`));
doc.push(p("A novation moves a contract. It does not move everything attached to one. The third column below is where consolidations go wrong, and they go wrong silently: nothing fails on the day, and the loss is discovered at the moment the thing was needed."));
{
  const w = [2700, 1900, 4420];
  doc.push(grid(w, ["The thing", "On novation", "What to do about it"], B.transfers, { bold: [0],
    fill: (r, i) => (i === 1 && /DOES NOT|LOST|MUST BE|NEW ONES/.test(String(r[1])) ? "F6E9E6" : i === 1 ? TINT : undefined) }));
}
doc.push(br());

// ── 10  traps
doc.push(h1(`${SEC.traps.n}  The eighteen traps`));
doc.push(p("Each of these has been the reason a consolidation cost more than it saved. None of them is exotic. Every one is avoidable by deciding it in writing before the transfer date rather than discovering it after."));
{
  const w = [520, 1080, 3700, 3720];
  doc.push(grid(w, ["", "Kind", "The trap", "The answer"], B.traps, { bold: [0, 1], size: 15 }));
}
doc.push(br());

// ── 11  programme
doc.push(h1(`${SEC.programme.n}  The twelve-week consolidation programme`));
doc.push(p("Twelve weeks is the realistic minimum for four novations plus a variation, and the line that cannot be compressed is the securities: a surety's consent takes as long as it takes and it cannot be done in the last week. Everything else can be run in parallel with everything else."));
{
  const w = [800, 1340, 3060, 1000, 1740, 1080];
  doc.push(grid(w, ["Week", "Step", "What happens", "Who", "The deliverable", "Traps closed"], B.programme, { bold: [0, 1], size: 15 }));
  doc.push(note("The last column is the register at section " + SEC.traps.n + ". Every one of the eighteen is closed by a step in this programme; a trap with no step against it is a trap nobody has been made responsible for."));
}
doc.push(flag("The securities line (W7–W9) is the critical path and it is the one that is always started last. A bond that lapses on the transfer date takes the client's only security with it, and nobody notices until it is needed."));
doc.push(br());

// ── 12  the deed
doc.push(h1(`${SEC.deed.n}  The deed of novation: what has to be in it`));
doc.push(p("This is an anatomy, not a precedent, and it is written so that a client can read a draft and see what is missing. The clause that decides who owns a defect discovered next year in work built last month is the fourth one, and it is the one most often adopted from a template rather than drafted."));
{
  const w = [1900, 4100, 3020];
  doc.push(grid(w, ["Clause", "What it does", "The point people miss"], B.deed, { bold: [0] }));
}
doc.push(note("Three parties, always. A two-party document is an assignment; an assignment moves the benefit and leaves the burden behind, which means the client is still liable under a contract it believes it has transferred. It is the commonest drafting error in this whole exercise."));
doc.push(br());

// ── 13  afterwards
doc.push(h1(`${SEC.after.n}  After the transfer`));
doc.push(...clauses("after"));
doc.push(br());

// ── 14  where ETABLIX sits
doc.push(h1(`${SEC.models.n}  Where the three ETABLIX models sit against this`));
doc.push(p("The routes at section 4 map onto the three ways ETABLIX is appointed. The mapping is set out so that a client can see which conversation it is having."));
{
  const w = [1700, 2100, 2600, 2620];
  doc.push(grid(w, ["Model", "The route it serves", "What ETABLIX does", "When it is the right one"], [
    ["Model A — Advisory", "Any of the three", "Writes the requirements and the ITT, runs the tender, evaluates the returns, and drafts the four enabling clauses at section 7 so the option stays open. Fixed fee, defined deliverable.",
      "When the client has the management capacity and wants the documents right. It is also the cheapest possible insurance against needing section 7 later and not having it."],
    ["Model B — Management Integrator", "Five packages, run or consolidated", "Holds the ten interfaces at section 3 on the client's behalf without taking the contracts. This is Mechanism C at 6.1, done properly and priced as a service.",
      "When the client wants five competed prices and cannot resource the interfaces — and either does not want the balance-sheet transfer or has not got the enabling clauses."],
    ["Model C — Prime Service Contractor", "Five-then-one, as the transferee", "Takes the four transferred contracts and stands behind them: single-point accountability, one valuation, one set of statutory dates.",
      "When the client wants the load gone rather than managed, and is willing to pay the stack at section 8 for it."],
  ], { bold: [0], size: 16 }));
}
doc.push(note("Model B and Model C are not a ladder. A client that needs the interfaces held but wants to keep its contracts and its price visibility is a Model B client permanently, and telling it otherwise is selling rather than advising."));
doc.push(br());

// ── 15  the one page
doc.push(h1(`${SEC.onepage.n}  The whole thing on one page`));
{
  const w = [700, 8320];
  doc.push(table(w, bodyRows(w, [
    ["1", "Interfaces grow as n(n−1)÷2. Five packages have ten, and nine of the ten are between two contractors with the client standing in the middle holding nothing."],
    ["2", "Five contracts are sixty statutory notice deadlines a year. One missed pay-less notice makes the sum applied for payable in full, whatever it was worth."],
    ["3", "One prime from the start buys management and gives away price. Five run to the end buys price and pays for management in the client's own time, which is the dearest way to buy it."],
    ["4", "Five-then-one buys both. It costs the wrap on prices the client has already seen competed, plus the transaction cost of the transfer."],
    ["5", "It is only available if four clauses were written into the original five contracts. That page of drafting is the cheapest page in the procurement."],
    ["6", "Consolidate a LOAD problem. Never consolidate a PERFORMANCE problem: fix the failing package first, or leave it direct."],
    ["7", "Consolidating onto an incumbent beats appointing a new prime — one fewer transfer, no learning curve, and it is what the named-party limitation was written to permit."],
    ["8", "Mid-build, the modular contractor is the better prime. At convergence, the FM and operation contractor is — because it is the only one of the five that cannot walk away from a bad job."],
    ["9", "Price it as four lines, not one number, applied to the transferred value only. Expect 17–21 per cent on competed prices in good order."],
    ["10", "Refuse any proposal that the four sums become provisional. That single concession gives away everything five packages were let to achieve."],
    ["11", "Bonds, guarantees and retention do not transfer by themselves. A bond without the surety's consent lapses on the transfer date, silently."],
    ["12", "The prime certifies the four. The client certifies the prime — including, separately and visibly, the prime's own package."],
  ], { bold: [0], size: 18, fill: (r, i) => (i === 0 ? PAPER : undefined) })));
}

const document = new Document({
  creator: "ETABLIX — Integrated Site Services",
  title: A.meta.title,
  description: A.meta.sub,
  styles: { default: { document: { run: { font: F, size: 19, color: INK } } } },
  sections: [{
    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: `${A.meta.ref} Rev ${A.meta.rev}  ·  ${A.meta.classification}`, font: F, size: 14, color: SLATE })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: "Page ", font: F, size: 14, color: SLATE }),
                 new TextRun({ children: [PageNumber.CURRENT], font: F, size: 14, color: SLATE }),
                 new TextRun({ text: " of ", font: F, size: 14, color: SLATE }),
                 new TextRun({ children: [PageNumber.TOTAL_PAGES], font: F, size: 14, color: SLATE })] })] }) },
    children: doc,
  }],
});

Packer.toBuffer(document).then((buf) => {
  const out = "/home/user/etablix/business/tender/ETABLIX-Procurement-and-Consolidation-Playbook.docx";
  fs.writeFileSync(out, buf);
  console.log(`written: ${Math.round(buf.length / 1024)} KB · ${doc.length} body elements`);
});
