/**
 * The sample render, and what it must NOT do.
 *
 *   node backend/test/samplecopy.test.mjs
 *
 * A diagnostic drafted in the Commercial tab carries a red banner while it is
 * inside the working-days window it was sold on:
 *
 *   Do not issue before 3 October. This engagement was sold as 10 working
 *   days from information handover on 19 September. 8 working days remain.
 *   Internal review copy.
 *
 * That is an internal control and it stays. What was missing was a way to show
 * a PROSPECT the shape of the deliverable, which needs the opposite: a
 * watermark, no banner, no delivery dates, no issue date.
 *
 * So ?sample=1 is a RENDER option rather than a document state. The two things
 * this file exists to prove are that the sample suppresses what it should, and
 * that asking for one changes nothing about the real document — otherwise the
 * sample becomes a way round the release date, which is worse than not having
 * one.
 */
import { renderDocument, stateMark } from "../routes/docs.js";

let passed = 0;
const failures = [];
const ok = (name, cond, detail = "") => {
  if (cond) { passed += 1; return; }
  failures.push(`${name}${detail ? " — " + detail : ""}`);
};

/* A diagnostic still inside its promised window: the banner must be live. */
const iso = (d) => d.toISOString().slice(0, 10);
const inDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };

const doc = {
  id: "d1",
  number: "SSD-2026-014",
  template: "diagnostic",
  templateName: "Site Systems Diagnostic",
  issuedBy: "Justin Nseya",
  createdAt: new Date().toISOString(),
  data: {
    client: "Northgate Energy Ltd",
    project: "Marrow Lane 132kV connection",
    siteRef: "ML-132",
    handover: inDays(-3),
    dueDate: inDays(9),
    promisedDays: 10,
    findings: "The programme is not deliverable as written.",
    basis: "First-pass planning figures.",
  },
};

const real = renderDocument(doc);
const samp = renderDocument(doc, null, { sample: true });

/* ---- the real render is unchanged ------------------------------------- */
ok("real render carries the hold banner", /Do not issue before/.test(real));
ok("real render carries the working-days wording", /working day/.test(real));
ok("real render carries the handover date", /Information handover/.test(real));
ok("real render carries the issue date row", /Issue date/.test(real));
ok("real render carries an issued-by line", /Issued by/.test(real));
ok("real render is not watermarked", !/<div class="wm">/.test(real));
ok("real render offers the watermark picker", /class="markpick"/.test(real));

/* ---- the sample suppresses exactly those things ----------------------- */
ok("sample drops the hold banner", !/Do not issue before/.test(samp));
ok("sample drops the holdnote element", !/class="holdnote"/.test(samp));
ok("sample drops the handover date", !/Information handover/.test(samp));
ok("sample drops the issue date row", !/Issue date/.test(samp));
ok("sample drops the issued-by line", !/Issued by/.test(samp));
ok("sample is watermarked SAMPLE", /<div class="wm [^"]*"><span>SAMPLE<\/span><\/div>/.test(samp));
ok("sample says it is a sample copy", /SAMPLE COPY — not an issued document/.test(samp));
ok("the sample offers the way back to the issued copy", /Back to the issued copy/.test(samp));

/* the watermark has to repeat on every printed page, not sit on page one */
ok("watermark is fixed so it repeats when printed", /\.wm \{[^}]*position: fixed/.test(samp));

/* ---- and it must NOT hide that the content is real -------------------- */
ok("sample states it is not anonymised", /not anonymised/i.test(samp));
ok("sample still shows the client, rather than pretending to redact",
   samp.includes("Northgate Energy Ltd"));
ok("sample still shows the project", samp.includes("Marrow Lane 132kV connection"));

/* ---- the deliverable itself is untouched ------------------------------ */
ok("sample keeps the findings", samp.includes("The programme is not deliverable as written."));
ok("sample keeps the basis of preparation", /Basis of preparation/.test(samp));
ok("sample keeps the competent-person legal note", /validation by a competent person/.test(samp));
ok("sample keeps the document number", samp.includes("SSD-2026-014"));

/* ---- rendering a sample changes nothing about the document ------------ */
const after = renderDocument(doc);
ok("asking for a sample does not alter the real render", after === real);
ok("asking for a sample does not mutate the document", doc.data.dueDate === inDays(9)
   && doc.data.handover === inDays(-3) && doc.template === "diagnostic");

/* ---- a released document has no banner either way -------------------- */
const released = { ...doc, data: { ...doc.data, dueDate: inDays(-1) } };
ok("a released document shows no banner", !/Do not issue before/.test(renderDocument(released)));
ok("and its sample is still watermarked",
   /<span>SAMPLE<\/span>/.test(renderDocument(released, null, { sample: true })));

/* ---- the state-driven mark: DRAFT, then UNPAID PROOF, then clean ----- */
const st = (o) => renderDocument(doc, null, stateMark(o));

ok("awaiting a decision is marked DRAFT", /<span>DRAFT<\/span>/.test(st({ awaitingDecision: true })));
ok("awaiting a decision is NOT tiled", !/class="wm [^"]*tile/.test(st({ awaitingDecision: true })));

const proof = st({ unpaid: true });
ok("approved but unpaid is marked UNPAID PROOF", /<span>UNPAID PROOF<\/span>/.test(proof));
ok("the unpaid proof is tiled", /class="wm [^"]*tile/.test(proof));
ok("the unpaid proof carries many marks, not one",
   (proof.match(/<span>UNPAID PROOF<\/span>/g) || []).length >= 40,
   `found ${(proof.match(/<span>UNPAID PROOF<\/span>/g) || []).length}`);
ok("the tiled marks are real elements, not a background image",
   !/background-image/.test(proof),
   "a browser printing with backgrounds off drops a background and prints spans regardless");
ok("the tiled mark prints as heavily as it displays", /\.wm\.tile span \{ color: rgba\(192, 57, 43, 0\.32\)/.test(proof));

/* IT IS A PROOF, NOT A DAMAGED DOCUMENT. Every word still has to be there. */
ok("the unpaid proof keeps the findings in full",
   proof.includes("The programme is not deliverable as written."));
ok("the unpaid proof keeps the client and project", proof.includes("Northgate Energy Ltd"));
ok("the unpaid proof keeps the legal note", /validation by a competent person/.test(proof));
ok("the unpaid proof keeps the document number", proof.includes("SSD-2026-014"));

const clean = st({});
ok("paid is clean — no watermark at all", !/<div class="wm/.test(clean));
ok("paid still carries the hold banner if held", /Do not issue before/.test(clean),
   "state marking must not silently disable an unrelated control");

/* the desk can read its own unpaid proof without fighting the marks */
const deskView = renderDocument(doc, null, { mark: "UNPAID PROOF", tile: false });
ok("tile can be switched off explicitly", !/class="wm [^"]*tile/.test(deskView));
ok("and the word survives with it off", /<span>UNPAID PROOF<\/span>/.test(deskView));

/* ---- synthetic: the notice changes audience -------------------------- */
const syn = renderDocument(doc, null, { sample: true, synthetic: true });
ok("synthetic sample says the project is synthetic", /worked example on a synthetic project/.test(syn));
ok("synthetic sample names what does not exist", /Marrow Lane 132kV connection/.test(syn)
   && /Northgate Energy Ltd/.test(syn) && /do not exist/.test(syn));
ok("synthetic sample drops the sender caution", !/do not send it outside this company/.test(syn),
   "a document you have just emailed somebody must not tell them not to send it outside");
ok("synthetic sample keeps the never-show-a-real-client line",
   /never shown to a third party/.test(syn));
ok("synthetic sample is still watermarked", /<span>SAMPLE<\/span>/.test(syn));
ok("synthetic sample still has no hold banner", !/Do not issue before/.test(syn));
ok("the plain sample keeps the sender caution", /do not send it outside this company/.test(samp));
ok("the plain sample points at the synthetic link", /take the link marked/.test(samp));
ok("synthetic without sample changes nothing",
   renderDocument(doc, null, { synthetic: true }) === real,
   "synthetic is meaningless on the controlled copy");

/* ---- the mark mechanism: a word, without touching the document -------- */
const mark = (w, o = {}) => renderDocument(doc, null, { mark: w, ...o });

for (const w of ["DRAFT", "CONFIDENTIAL", "NOT FOR ISSUE", "SUPERSEDED", "VOID",
                 "COMMERCIAL IN CONFIDENCE", "FOR REVIEW", "COPY", "SAMPLE", "SPECIMEN"]) {
  const html = mark(w);
  ok(`mark ${w} is stamped`, new RegExp(`<span>${w}</span>`).test(html));
  // THE POINT OF THE WHOLE DESIGN: a mark does not make it a sample.
  ok(`mark ${w} keeps the hold banner`, /Do not issue before/.test(html),
     "a mark must not be a way round the release date");
  ok(`mark ${w} keeps the delivery dates`, /Information handover/.test(html));
}

ok("a red mark is toned red", /class="wm red /.test(mark("CONFIDENTIAL")));
ok("a status mark is not toned red", !/class="wm red /.test(mark("DRAFT")));
ok("a three-word mark is sized down", /len3/.test(mark("COMMERCIAL IN CONFIDENCE")));
ok("a one-word mark is not sized down", /len1/.test(mark("DRAFT")));
ok("marks are case-insensitive on the way in", /<span>DRAFT<\/span>/.test(mark("draft")));
ok("an unknown mark stamps nothing", !/<div class="wm/.test(mark("DARFT")));
ok("a mark can be combined with a sample",
   /<span>CONFIDENTIAL<\/span>/.test(mark("CONFIDENTIAL", { sample: true }))
   && !/Do not issue before/.test(mark("CONFIDENTIAL", { sample: true })));

/* ---- the specimen template keeps its own word ------------------------- */
const spec = renderDocument({ ...doc, template: "specimen" });
ok("the specimen template still says SPECIMEN", /<span>SPECIMEN<\/span>/.test(spec));
ok("and a sample of it says SAMPLE",
   /<span>SAMPLE<\/span>/.test(renderDocument({ ...doc, template: "specimen" }, null, { sample: true })));

if (failures.length) {
  console.log(`\n=== ${passed} passed, ${failures.length} FAILED ===`);
  for (const f of failures) console.log("  · " + f);
  process.exit(1);
}
console.log(`=== ${passed} passed, 0 failed · the sample render ===`);
