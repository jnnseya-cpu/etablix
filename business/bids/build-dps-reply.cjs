/**
 * The DPS financial-standing reply, as a Word document.
 *
 *   node business/bids/build-dps-reply.cjs
 *
 * A letter rather than a report: no cover page, no table of contents, no
 * house furniture. An assessor reading a hundred of these wants the answer,
 * and anything that delays it costs goodwill rather than earning it.
 */
const fs = require("fs");
const path = require("path");
const D = require("/tmp/claude-0/-home-user-etablix/fe91c2e4-7425-5fd0-aa86-a0a156d734f1/scratchpad/docxlib/node_modules/docx");
const { Document, Packer, Paragraph, TextRun, AlignmentType } = D;

const INK = "14181D", GOLD = "9C7A3C", SLATE = "5B6672";
const F = "Arial";

const p = (text, o = {}) =>
  new Paragraph({
    spacing: { before: o.before ?? 100, after: o.after ?? 100, line: 276 },
    alignment: o.align,
    children: [new TextRun({ text, font: F, size: o.size ?? 21, bold: o.bold, italics: o.italics, color: o.color ?? INK })],
  });

const rich = (runs, o = {}) =>
  new Paragraph({
    spacing: { before: o.before ?? 100, after: o.after ?? 100, line: 276 },
    children: runs.map((r) =>
      new TextRun({ text: r.t, font: F, size: o.size ?? 21, bold: r.b, italics: r.i, color: r.c ?? INK })
    ),
  });

const bullet = (text) =>
  new Paragraph({
    bullet: { level: 0 },
    spacing: { before: 60, after: 60, line: 276 },
    children: [new TextRun({ text, font: F, size: 21, color: INK })],
  });

const numbered = (text, n) =>
  new Paragraph({
    spacing: { before: 60, after: 60, line: 276 },
    indent: { left: 360, hanging: 360 },
    children: [
      new TextRun({ text: `${n}.  `, font: F, size: 21, bold: true, color: GOLD }),
      new TextRun({ text, font: F, size: 21, color: INK }),
    ],
  });

const doc = new Document({
  creator: "ETABLIX — Integrated Site Services",
  title: "DPS application — financial standing and contract examples",
  styles: { default: { document: { run: { font: F, size: 21, color: INK } } } },
  sections: [
    {
      properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } },
      children: [
        p("ETABLIX — Integrated Site Services", { bold: true, size: 26, after: 20 }),
        p("A trading name of JNN GLOBAL LTD · Company No. 15405437 · Birmingham B44 8DJ · Part of Groupe Nseya",
          { size: 17, color: SLATE, after: 320 }),

        rich([{ t: "Subject: ", b: true }, { t: "RE: DPS application — financial standing and contract examples" }],
          { after: 240 }),

        p("Dear [Mr/Ms Little],"),

        p("Thank you — that is a genuinely helpful reply, and it answers both of the questions I would otherwise have had to ask."),

        p("Contract examples", { bold: true, before: 240, after: 60 }),
        p(
          "I will submit examples from my own delivery record and relate each one to the company, labelled plainly so there is no ambiguity about what belongs to whom. Before founding the company I was a construction subcontract manager at GE Vernova, working on EPC and full turnkey projects across the UK, Ireland and Europe on which the civil works, the site management and the site infrastructure sat inside our own contract — and on one project the worker accommodation as well. My role covered the pricing of that scope, the site visits and site reports behind it, and the management of the civils and site-services subcontractors who delivered it. That is the same work ETABLIX is formed to do, and it is delivered by the same person. Where an example is the company's own rather than mine personally, I will say so on its face."
        ),

        p("Financial standing", { bold: true, before: 240, after: 60 }),
        p(
          "You are right that the usual checks will not return much: JNN GLOBAL LTD was incorporated in [month, year] and has not yet completed [one / two] full years of trading. I will upload the following under supplementary information:"
        ),
        bullet("Balance sheet as at [date], from the management accounts."),
        bullet("A cash-flow report for the trading period to date, and a [three]-year forecast with its assumptions stated on the face of it rather than left implicit."),
        bullet("Evidence of the company's banking arrangements and of the working capital available to it."),

        p("The guarantee", { bold: true, before: 240, after: 60 }),
        p(
          "I take your point that this is the cleanest route, and I would rather get the form right the first time than submit something that has to come back. Three questions, and short answers to any of them are enough:"
        ),
        numbered("Which forms are acceptable to you — parent company, bank or financial institution, or a personal guarantee from a director or other individual of sufficient standing?", 1),
        numbered("Do you have required wording or a template you would like it drawn on? If the guarantor's own solicitor drafts it, is there anything the wording must contain to satisfy your assessment?", 2),
        numbered("Is there a cap or a duration you expect it to carry — for instance a value limit, or a term running to the end of the DPS period?", 3),
        p(
          "I am pursuing a guarantee in parallel with the financial documents above, and I will not represent one as being in place until it is signed.",
          { before: 140 }
        ),

        p(
          "I will also confirm I am uploading to the right place: the supplementary information section within [name the section], unless you would rather it went elsewhere.",
          { before: 200 }
        ),
        p(
          "I expect to resubmit within [five] working days. Thank you for setting out what is needed so clearly, and for confirming that a resubmission does not mean starting the form again."
        ),

        p("Kind regards,", { before: 260, after: 260 }),
        p("[Your name]", { bold: true, after: 20 }),
        p("[Your title] · ETABLIX — Integrated Site Services", { size: 19, color: SLATE, after: 20 }),
        p("[phone] · [name]@etablix.com · etablix.com", { size: 19, color: SLATE, after: 20 }),
        p("ETABLIX is a trading name of JNN GLOBAL LTD, registered in England and Wales, company number 15405437. Registered office: Birmingham B44 8DJ. Part of Groupe Nseya.",
          { size: 16, color: SLATE }),
      ],
    },
  ],
});

const out = path.join(__dirname, "ETABLIX-DPS-financial-standing-reply.docx");
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(out, buf);
  console.log(`written: ${out} (${Math.round(buf.length / 1024)} KB)`);
});
