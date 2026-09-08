const fs = require("fs");
const D = require("/tmp/claude-0/-home-user-etablix/fe91c2e4-7425-5fd0-aa86-a0a156d734f1/scratchpad/docxlib/node_modules/docx");
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType,
        HeadingLevel, BorderStyle, PageBreak, Header, Footer, PageNumber, AlignmentType } = D;

const INK="14181D", GOLD="9C7A3C", SLATE="5B6672", RED="C0392B", GREEN="1F7A4D",
      PAPER="F2EFE7", TINT="EFE6D2", WARN="F6E9E6", CODE="F4F3EF";
const W = 9020, F = "Arial", M = "Consolas";
const cellB = ["top","bottom","left","right"].reduce((o,k)=>((o[k]={style:BorderStyle.SINGLE,size:2,color:"D5D5D5"}),o),{});

// inline runs: **bold**, `mono`, *italic*
function runs(t, o = {}) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let last = 0, m;
  const push = (text, x = {}) => { if (text) out.push(new TextRun({ text, font: x.font || o.font || F,
    size: o.size ?? 19, bold: x.bold ?? o.bold, italics: x.italics ?? o.italics, color: x.color || o.color || INK })); };
  while ((m = re.exec(t))) {
    push(t.slice(last, m.index));
    const s = m[0];
    if (s.startsWith("**")) push(s.slice(2, -2), { bold: true });
    else if (s.startsWith("`")) push(s.slice(1, -1), { font: M, color: GOLD });
    else push(s.slice(1, -1), { italics: true });
    last = m.index + s.length;
  }
  push(t.slice(last));
  return out;
}
const p = (t, o = {}) => new Paragraph({ spacing: { before: o.before ?? 70, after: o.after ?? 70, line: 265 },
  indent: o.indent, children: runs(t, o) });
const h1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 340, after: 140 },
  children: [new TextRun({ text: t, font: F, size: 28, bold: true, color: INK })] });
const h2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 90 },
  children: [new TextRun({ text: t, font: F, size: 21, bold: true, color: GOLD })] });
const bullet = (t) => new Paragraph({ spacing: { before: 40, after: 40, line: 260 }, bullet: { level: 0 },
  children: runs(t) });
const code = (lines) => new Table({ columnWidths: [W], width: { size: W, type: WidthType.DXA },
  rows: [new TableRow({ children: [new TableCell({ width: { size: W, type: WidthType.DXA }, borders: cellB,
    margins: { top: 110, bottom: 110, left: 150, right: 110 }, shading: { type: ShadingType.CLEAR, color: "auto", fill: CODE },
    children: lines.map((l) => new Paragraph({ spacing: { before: 20, after: 20 },
      children: [new TextRun({ text: l, font: M, size: 17, color: INK })] })) })] })] });
const callout = (label, t, fill = TINT, colour = INK) => new Table({ columnWidths: [W], width: { size: W, type: WidthType.DXA },
  rows: [new TableRow({ children: [new TableCell({ width: { size: W, type: WidthType.DXA }, borders: cellB,
    margins: { top: 110, bottom: 110, left: 150, right: 130 }, shading: { type: ShadingType.CLEAR, color: "auto", fill },
    children: [ new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: label, font: F, size: 15, bold: true, color: colour, characterSpacing: 30 })] }),
                ...t.split("\n").map((l) => new Paragraph({ spacing: { before: 30, after: 30, line: 255 }, children: runs(l, { size: 18 }) })) ] })] })] });
const cell = (t, o = {}) => new TableCell({ width: { size: o.w, type: WidthType.DXA }, borders: cellB,
  margins: { top: 60, bottom: 60, left: 90, right: 90 }, columnSpan: o.span,
  shading: o.fill ? { type: ShadingType.CLEAR, color: "auto", fill: o.fill } : undefined,
  children: (Array.isArray(t) ? t : [t]).map((x) => new Paragraph({ spacing: { before: 20, after: 20, line: 240 },
    children: runs(x, { size: o.size ?? 16, bold: o.bold, color: o.color }) })) });
const hdr = (w, l) => new TableRow({ tableHeader: true, children: l.map((x, i) => cell(x, { w: w[i], bold: true, fill: INK, color: "FFFFFF", size: 15 })) });
const grid = (w, l, d, o = {}) => new Table({ columnWidths: w, width: { size: W, type: WidthType.DXA },
  rows: [hdr(w, l), ...d.map((r) => new TableRow({ children: r.map((v, i) =>
    cell(v, { w: w[i], bold: (o.bold || []).includes(i), size: o.size ?? 16, fill: o.fill ? o.fill(r, i) : undefined })) }))] });
const br = () => new Paragraph({ children: [new PageBreak()] });
const TICK = "                ";   // a box for a pen

const doc = [];

// ---------------------------------------------------------------- cover
doc.push(new Paragraph({ spacing: { before: 1500, after: 0 }, children: [new TextRun({ text: "ETABLIX", font: F, size: 54, bold: true, color: INK })] }));
doc.push(new Paragraph({ spacing: { after: 700 }, children: [new TextRun({ text: "I N T E G R A T E D   S I T E   S E R V I C E S   ·   P A R T   O F   G R O U P E   N S E Y A", font: F, size: 14, bold: true, color: GOLD })] }));
doc.push(p("SITE SYSTEMS DIAGNOSTIC", { size: 36, bold: true, before: 0, after: 40 }));
doc.push(p("Testing the whole circle", { size: 28, color: GOLD, bold: true, after: 560 }));
{ const w = [2500, 6520];
  doc.push(new Table({ columnWidths: w, width: { size: W, type: WidthType.DXA },
    rows: [
      ["Document", "End-to-end acceptance test — client engagement to closed account"],
      ["Test pack", "NORTHREACH-diagnostic-pack.zip — 18 client documents, 33 planted findings"],
      ["Scoring key", "SCORING-KEY.md — beside the zip, never inside it"],
      ["Duration", "Approximately twenty minutes, plus the diagnostic run"],
      ["Prerequisite", "An AI provider key connected under Organisation → AI agents"],
      ["Revision", "B — corrected 8 September 2026"],
    ].map((r, i) => new TableRow({ children: r.map((v, j) =>
      cell(v, { w: w[j], bold: j === 0, size: 18, fill: j === 0 ? PAPER : undefined })) })) })); }
doc.push(p("Twenty minutes, on the live site. It is a fair test: the pack contains 33 planted findings and the key says what they are. The key sits beside the zip and never inside it, so uploading the whole pack cannot hand the agent the answers. Do not read it until after you have read the report.",
  { before: 560, italics: true, color: SLATE, size: 18 }));
doc.push(br());

// ---------------------------------------------------------- what to expect
doc.push(h1("What this test proves, and the figures to check it against"));
doc.push(p("Each row is a number the platform must produce on its own. If any one of them has to be typed in by hand, the circle is not closed."));
{ const w = [3000, 1500, 4520];
  doc.push(grid(w, ["Expected", "Value", "Where it must appear"], [
    ["Deposit invoice, 30% of the fee", "£1,950", "Portal and document studio, in the same second, on the client's confirmation"],
    ["Balance invoice on approval", "£4,550", "Raised at the moment the client approves — not requested afterwards"],
    ["Total invoiced", "£6,500", "Equal to the agreed fee, to the penny"],
    ["Checklist lines built from the deliverable", "14", "Portal, without anybody writing them"],
    ["Client documents read by the diagnostic", "18", "The files the client already sent — no second upload"],
    ["Of those, routed to vision", "3", "The two drawings and the Gantt print"],
    ["Report due date", "10 working days", "From the day the last mandatory line was answered"],
    ["Planted findings to mark against", "33", "SCORING-KEY.md, after the report is read"],
  ], { bold: [0, 1], fill: (r) => (/£6,500/.test(r[1]) ? PAPER : undefined) })); }
doc.push(callout("BEFORE YOU START",
  "Check the AI provider is connected: **Control Desk → Organisation → AI agents**.\nWithout a key the diagnostic will refuse to start, and it will say so."));
doc.push(br());

// -------------------------------------------------------------- the circle
doc.push(h1("The circle"));
doc.push(p("Eight steps. Tick each one as it passes and note anything that does not — the test record is the point, not the walkthrough."));

const step = (n, title, body, extras = []) => {
  doc.push(h2(`${n} · ${title}`));
  body.forEach((b) => doc.push(p(b)));
  extras.forEach((x) => doc.push(x));
  doc.push(new Table({ columnWidths: [1400, 7620], width: { size: W, type: WidthType.DXA },
    rows: [new TableRow({ children: [
      cell("Pass / fail", { w: 1400, bold: true, size: 15, fill: PAPER }),
      cell(TICK, { w: 7620, size: 15 }) ] })] }));
};

step(1, "Open the engagement", [
  "Control Desk → **Client engagements**.",
  "Client `Marrowbridge Infrastructure Ltd`, project `Project NORTHREACH`, deliverable **Site-services feasibility review**, Model A, fee `6500`, your own email as the contact, tick **CONSTRUX in scope**.",
]);
step(2, "Issue the portal", [
  "One button. It mints the link, builds the 14-line checklist from the deliverable, and emails both.",
  "The link is printed back to you and the panel has a **Copy** button.",
]);
step(3, "Be the client", [
  "Open the link in a private window. You should see the checklist, the ten-working-day clock note, and the deposit and balance both stated with their reasoning.",
  "Unzip the pack and work down the list, attaching the documents. **Every file in the pack has a home on this list** — if one is left over, something is wrong, because fifteen of the thirty-three planted findings need `inputs/01` or `inputs/03`.",
], [
  (() => { const w = [2500, 6520];
    return grid(w, ["Checklist line", "What to attach from the pack"], [
      ["Project programme", "`programme/*-gantt.pdf`, `programme/*-tasks.csv` **and** `inputs/01-project-programme.md`"],
      ["Workforce forecast", "`inputs/02-workforce-forecast.md`"],
      ["Proposed site layout", "both files in `drawings/` **and** `inputs/03-proposed-site-layout.md`"],
      ["Logistics plan", "`inputs/04-existing-logistics-plan.md`"],
      ["Temporary services", "`inputs/05-…` and `annexes/C-…`"],
      ["Procurement packages", "`registers/*.xlsx` and `inputs/06-…`"],
      ["Mobilisation constraints", "`inputs/07-…` and `annexes/A-…`"],
      ["Site and utility information", "`inputs/08-…`"],
      ["Anything superseded", "the remaining `annexes/` files"],
      ["The five commercial lines", "type an answer, or mark one **not held** to see that it settles rather than nags"],
    ], { bold: [0], fill: (r) => (/inputs\/01|inputs\/03/.test(r[1]) ? TINT : undefined) }); })(),
  callout("WORTH DOING DELIBERATELY",
    "Mark one mandatory line *I do not hold this*, with a reason.\n\nIt should be refused without a reason, accepted with one, counted as answered, and **never chased again**. That is the \"no repetition\" claim, and it is the one to test."),
]);
step(4, "Confirm the start", [
  "Tick the authorisation box and give a name.",
  "An `INV-2026-nnn` for **£1,950** (30%) should appear in the portal **and** in the document studio within the same second. Open it: reverse charge applied, your PO reference on the face of it, and it says on itself that it was raised automatically on the client's instruction.",
]);
step(5, "Take the payment", ["Back on the desk: **Deposit … received**."]);
step(6, "Run the diagnostic", [
  "The button now says **Run the diagnostic on their pack**. It runs on the files the client already sent — *no second upload*.",
  "The handover date is read from the record — the day the last mandatory line was answered — and the report due date is ten working days from it.",
  "Six passes, several minutes. Watch it under **Organisation → AI agents**.",
]);
step(7, "Publish it", [
  "Back on the engagement, in *Publish a deliverable*, leave **Issue the completed diagnostic run as the report** ticked, add a summary, list the sections the client may comment against, and publish.",
  "It mints a numbered `SSD-2026-nnn` carrying the handover and due dates.",
]);
step(8, "Be the client again", [
  "Read the report in the portal. Then, in order:",
], [
  bullet("Try **Review with comments** with no comment — it should refuse you."),
  bullet("Add a comment against a named section and send it back."),
  bullet("Reissue from the desk, then **Approve**."),
  p("Approval should raise the **£4,550** balance invoice at the moment of approval. Mark it received; the engagement closes; the two invoices sum to **£6,500**."),
]);
doc.push(br());

// -------------------------------------------------------------- judging it
doc.push(h1("Then judge it"));
doc.push(p("Read the report first. Write down what you think it found. **Then** open `SCORING-KEY.md` and mark the report against the 33 planted findings — how many it caught, how many it invented, and whether the ones it caught are stated well enough to put in front of a client."));
{ const w = [2200, 1300, 5520];
  doc.push(grid(w, ["Mark", "Count", "What it means"], [
    ["Found", "", "Stated, with its consequence in days, money or a named consent"],
    ["Partially found", "", "The right thing identified, but no consequence quantified"],
    ["Missed", "", "Not raised at all"],
    ["Invented", "", "Raised, and not true. This is the one that costs a client relationship"],
    ["TOTAL PLANTED", "33", ""],
  ], { bold: [0, 1], fill: (r) => (r[0] === "TOTAL PLANTED" ? PAPER : (r[0] === "Invented" ? WARN : undefined)) })); }
doc.push(callout("THE FOUR THAT MATTER MOST",
  "The contradictions between two documents written weeks apart by different people.\n\nAnything can list what is in a programme. Finding that the shift pattern in the programme is prohibited by a planning condition in a different file is the thing worth paying for.", TINT));
doc.push(br());

// ------------------------------------------------------------ if it breaks
doc.push(h1("If something breaks"));
doc.push(h2("First, check the pack itself"));
doc.push(p("The zip is generated from `northreach/`, so build it and audit it in one step:"));
doc.push(code(["./diagnostic-test/build-pack.sh"]));
doc.push(p("Eight checks: the zip exists and is not stale, it matches the folder, the answer key is not inside it, every client document has a home on the checklist above, every file the script names exists, the headless test uploads the same set you do, the upload gate accepts every file type in the pack, and the counts the pack asserts about itself are true."));
doc.push(h2("Then the circle itself, headless"));
doc.push(p("It needs a running server and either a real key or the mock:"));
doc.push(code(["PORT=3311 SITE_URL=http://localhost:3311 node backend/server.js &", "node backend/test/circle.e2e.mjs"]));
doc.push(p("20 assertions, from the engagement to the closed account."));
doc.push(h2("And the two portal promises"));
doc.push(code(["node backend/test/portal-promises.e2e.mjs"]));
doc.push(p("16 assertions: that *I do not hold this* settles rather than nags, and that a decision which changes the work is refused without the reason that would let it be answered."));
doc.push(callout("IT WRITES TO THE DATABASE IT RUNS AGAINST",
  "Point the headless tests at a scratch copy, or back up `backend/data/db.json` first and restore it afterwards.\n\nIf the live site misbehaves, run these three first — they tell you whether the fault is the platform or the environment.", WARN, RED));

// ------------------------------------------------------------------ record
doc.push(br());
doc.push(h1("Test record"));
doc.push(p("Complete this before reading the scoring key."));
{ const w = [3000, 6020];
  doc.push(grid(w, ["", ""], [
    ["Tested by", ""], ["Date", ""], ["Model and key in use", ""],
    ["Steps 1–8 all passed?", ""], ["Deposit invoice value observed", ""],
    ["Balance invoice value observed", ""], ["Total invoiced", ""],
    ["Documents read by the diagnostic", ""], ["Of those, routed to vision", ""],
    ["Report due date shown", ""],
    ["Findings caught / partial / missed / invented", ""],
    ["Would you put this report in front of a client?", ""],
  ], { bold: [0], size: 17 })); }
doc.push(p("The last line is the only question that matters. Everything above it is evidence for the answer.",
  { before: 140, italics: true, color: SLATE, size: 17 }));

const document = new Document({
  creator: "ETABLIX — Integrated Site Services",
  title: "Site Systems Diagnostic — testing the whole circle",
  description: "End-to-end acceptance test using the NORTHREACH diagnostic pack",
  styles: { default: { document: { run: { font: F, size: 19, color: INK } } } },
  sections: [{
    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: "Site Systems Diagnostic  ·  Testing the whole circle  ·  Rev B", font: F, size: 14, color: SLATE })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: "Page ", font: F, size: 14, color: SLATE }),
                 new TextRun({ children: [PageNumber.CURRENT], font: F, size: 14, color: SLATE }),
                 new TextRun({ text: " of ", font: F, size: 14, color: SLATE }),
                 new TextRun({ children: [PageNumber.TOTAL_PAGES], font: F, size: 14, color: SLATE })] })] }) },
    children: doc,
  }],
});
Packer.toBuffer(document).then((buf) => {
  fs.writeFileSync("/home/user/etablix/diagnostic-test/ETABLIX-Diagnostic-Test-Script.docx", buf);
  console.log(`written: ${Math.round(buf.length / 1024)} KB · ${doc.length} body elements`);
});
