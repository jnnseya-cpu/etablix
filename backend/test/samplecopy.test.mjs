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
import { renderDocument } from "../routes/docs.js";

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
