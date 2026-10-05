/**
 * ETABLIX — ISO 9001:2015 coverage statement. Word and PDF.
 *
 *   node business/policies/build-iso9001-coverage.cjs
 *
 * WRITTEN AGAINST A SPECIFIC INSTRUCTION. GE Vernova's Supplier Connect portal
 * refuses to progress without ISO or QMS. Marc Townsend, Strategic Commodity
 * Buyer, Grid Solutions, answered in writing: "We would expect all vendors
 * (service and goods suppliers) to hold at least ISO 9001 to show that the
 * business processes are documented and auditable from a quality perspective.
 * If you have documented systems, but this is just missing third party
 * verification, then I would state this is the application and upload any
 * associated documentation."
 *
 * THAT IS THE WHOLE BRIEF: documented and auditable, missing third-party
 * verification. The Quality Management Arrangements already document the
 * system. What they do not do — deliberately — is let an assessor see coverage
 * against the standard at a glance, because that document carries a reasoned
 * instruction not to mirror the clause numbering.
 *
 * SO THIS IS A SEPARATE DOCUMENT AND THE OTHER ONE IS UNCHANGED. The reasoning
 * in the Arrangements still holds: a document laid out as a quality manual,
 * when no certificate exists, reads as a company pretending. This one does the
 * opposite — it is titled as a coverage statement, it opens by saying no
 * certificate is held, and roughly a third of its rows say the requirement is
 * not met. A map that shows its own holes cannot be mistaken for a certificate.
 *
 * THE RULE THAT GOVERNS EVERY ROW: a clause is marked DOCUMENTED only where a
 * named section of a real, signed document covers it. PARTIAL where something
 * covers part of it. NOT IN PLACE where nothing does. Nothing is marked up to
 * improve the score. A supplier quality engineer reads these for a living and
 * the overstated row is the one they check first.
 */
const B = require("./brand.cjs");

const DASH = "—";
/* Issue and review dates are computed rather than left as brackets: the company
   has one director who approves every policy, and a bracket on a document
   uploaded to a buyer's portal reads as unfinished. Re-running the builder
   re-dates the document, which is the correct behaviour for a live policy. */
const ISSUE_DATE = new Date();
const fmt = (dt) => dt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
const ISSUE = fmt(ISSUE_DATE);
const REVIEW = fmt(new Date(ISSUE_DATE.getFullYear() + 1, ISSUE_DATE.getMonth(), ISSUE_DATE.getDate()));

const REV = "1";

const d = B.doc({
  slug: "ISO-9001-Coverage-Statement",
  running: "ISO 9001:2015 coverage statement",
  kicker: "SUPPLIER QUALITY ASSESSMENT",
  title: "ISO 9001:2015 COVERAGE",
  sub: "documented arrangements mapped to the standard — not certified, and not claiming to be",
  rev: REV,
  outDir: __dirname,
  kind: "statement",
  draftNote: false,
  control: [
    ["Document", "ISO 9001:2015 coverage statement"],
    ["Company", "JNN GLOBAL LTD, trading as ETABLIX · Company No. 15405437"],
    ["Certification status", "NOT CERTIFIED. No ISO 9001 certificate is held and none is claimed."],
    ["Purpose", "To let an assessor see, clause by clause, what is documented, what is partial and what is absent"],
    ["Companion document", "ETABLIX Quality Management Arrangements — the arrangements themselves"],
    ["Date", new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })],
  ],
});
const { p, rich, h1, h2, bullet, note, table, pageBreak } = d;

/* ------------------------------------------------------------------ */
h1("1. What this document is, and what it is not");

rich([{ t: "JNN GLOBAL LTD, trading as ETABLIX, does not hold ISO 9001 certification and does not claim it. ", b: true },
  { t: "No certification body has audited this company, and nothing here should be read as equivalent to a certificate. This document exists so that an assessor can see what is actually documented rather than infer it from the absence of a certificate." }]);

p("It is issued in response to a supplier quality requirement which asked for documented, auditable business processes, and for the position to be stated plainly where third-party verification is absent. That is what follows.");

note("Roughly a third of the rows below record a requirement that is not met. That is the point of the document. A coverage map with no gaps in it would be a certificate, and this is not one.");

h2("How to read the status column");

table([1800, 6500],
  ["Status", "What it means here"],
  [
    ["Documented", "A named section of a signed, dated company document addresses the requirement, and the arrangement is in operation."],
    ["Partial", "Something addresses part of the requirement. The part that is not addressed is named in the row."],
    ["Not in place", "Nothing addresses it. In every case the reason is stated, and in most cases the reason is that the company has one working director and no completed engagements."],
  ], { size: 16 });

/* ------------------------------------------------------------------ */
pageBreak();
h1("2. Clause by clause");

p("References are to sections of the ETABLIX Quality Management Arrangements unless another document is named.");

const ROWS = [
  ["4.1 – 4.2", "Context of the organisation, interested parties",
   "Partial",
   "The nature of the work and what a defect is in it are defined at section 2. Interested parties are identified in practice (client, main contractor, specialist subcontractors) but are not documented as a formal register."],
  ["4.3 – 4.4", "Scope and processes of the system",
   "Documented",
   "Scope is stated at section 2: the company produces documents and decisions rather than physical works. The processes are set out at section 3."],
  ["5.1 – 5.3", "Leadership, policy, roles and responsibilities",
   "Documented",
   "One working director holds every role and the document is signed and dated by him. Responsibility is not diffused because there is nobody to diffuse it to, which is stated rather than disguised."],
  ["6.1", "Actions to address risks and opportunities",
   "Partial",
   "Delivery risk is addressed at the engagement level and the capacity rule at section 10 of the method statement declines work that cannot be staffed. There is no standing organisational risk register."],
  ["6.2 – 6.3", "Quality objectives, planning of changes",
   "Partial",
   "Three requirements are defined at section 2 — the output is right, traceable and on time — and each arrangement serves one of them. They are not expressed as measurable annual objectives, because there is no delivery history to set a baseline from."],
  ["7.1", "Resources",
   "Documented",
   "One director, named associates under section 3.7, and the capacity rule that declines work which cannot be staffed."],
  ["7.2 – 7.3", "Competence and awareness",
   "Documented",
   "Section 3.2. Competence is held by a named individual: MCIOB Chartered Construction Manager, MSc BIM Management, BSc (Hons) Construction Management, APMP, PRINCE2 Foundation, CDM 2015 Principal Designer training, CSCS."],
  ["7.4", "Communication",
   "Documented",
   "Scope agreed in writing before work starts (section 3.1), reporting obligations defined per engagement, and client feedback at section 3.6."],
  ["7.5", "Documented information, control of documents and records",
   "Documented",
   "Section 3.4 for document control; section 4 for records and retention periods, which are set longer than most suppliers assume."],
  ["8.1", "Operational planning and control",
   "Documented",
   "Section 3.1. Nothing starts without a written agreed scope stating what is to be delivered, to whom, by when, on what information, and what is excluded."],
  ["8.2", "Requirements for products and services",
   "Documented",
   "Section 3.1, and the contract is read in full rather than in summary before the work is planned."],
  ["8.3", "Design and development",
   "Not applicable",
   "The company does not carry out design. Where a client wishes a duty holder role to be held it is appointed expressly and in writing, and CDM 2015 Principal Designer training is training rather than an appointment."],
  ["8.4", "Control of externally provided processes, products and services",
   "Documented",
   "Section 3.7. Associates and subcontractors work to a written scope and a defined checking regime, and the client is told when one is engaged."],
  ["8.5", "Production and service provision",
   "Documented",
   "Section 3, read as a whole."],
  ["8.6", "Release of products and services",
   "Partial",
   "Section 3.3 requires checking before issue. The check is performed by the author, because there is no second competent person. This is the system's principal limitation and it is stated in both documents rather than written around."],
  ["8.7", "Control of nonconforming outputs",
   "Documented",
   "Section 3.5. What happens when something goes wrong, including correction, notification and the record kept."],
  ["9.1", "Monitoring, measurement, analysis and evaluation",
   "Partial",
   "Client feedback is sought and recorded under section 3.6. There is no performance data yet, because no engagement has been completed under the company."],
  ["9.2", "Internal audit",
   "Not in place",
   "There is no internal audit programme against a standard, and the reviews at section 5 are management reviews and are called that. Independent internal audit is not credible with one person and is not claimed."],
  ["9.3", "Management review",
   "Documented",
   "Section 5. Reviewed on the dates recorded on the cover and reissued whenever the work, the people or the law changes."],
  ["10.1 – 10.2", "Improvement, nonconformity and corrective action",
   "Documented",
   "Section 3.5, together with the record kept under section 4 so that a recurrence is visible rather than remembered."],
  ["10.3", "Continual improvement",
   "Partial",
   "The mechanism exists through management review and the error record. There is no trend to improve against yet, and inventing one would defeat the purpose of keeping the record."],
];

table([1300, 2300, 1300, 3400],
  ["Clause", "Requirement", "Status", "Where it is addressed, and what is missing"],
  ROWS, { size: 15 });

/* ------------------------------------------------------------------ */
h1("3. The four things that are not in place");

p("Consolidated so that nobody has to assemble them from the table.");

bullet("No ISO 9001 certificate, and no audit by any certification body. Section 1.");
bullet("No internal audit programme against a standard. Clause 9.2. An internal audit performed by the only person in the company on their own work is not an audit, and calling it one would be the least credible thing in this document.");
bullet("No independent second-person check before issue. Clause 8.6. The mitigation at section 3.3 of the Arrangements is a structured self-check against the written scope, and it is described as that rather than as independent review.");
bullet("No performance or error history. Clauses 9.1 and 10.3. There have been no completed engagements under the company to generate one. Both are recorded from the first engagement onwards.");

note("Each of these closes with scale rather than with intent. The second-person check and the audit programme arrive with the second competent person; the performance history arrives with the first completed engagement. None of them is waiting on a decision.");

/* ------------------------------------------------------------------ */
h1("4. Position on certification");

p("An ISO 9001, 14001 and 45001 roadmap sits in the company's compliance plan. Until a certificate is issued by a UKAS-accredited certification body, nothing this company issues will describe its quality arrangements as certified, approved or compliant with the standard.");

rich([{ t: "Including this document. ", b: true },
  { t: "It maps what exists against the structure of the standard so that an assessor can judge coverage quickly. It does not assert conformity, it has not been audited, and a clause marked Documented here means a company document addresses it — not that any external party has verified that it does." }]);

/* ------------------------------------------------------------------ */
h1("Declaration");
p("I confirm that the statuses recorded above reflect the arrangements actually in operation at the date of this document, that no ISO certification is held or claimed, and that the gaps at section 3 are stated in full.", { after: 380 });
p("Signed  ..............................................................", { after: 140 });
p("Name  Justin Ngolu Nseya MCIOB", { after: 60 });
p("Position  Managing Director, JNN GLOBAL LTD trading as ETABLIX", { after: 60 });
p("Date  ....................................", { after: 300 });

d.build().then(() => {
  const counts = ROWS.reduce((a, r) => { a[r[2]] = (a[r[2]] || 0) + 1; return a; }, {});
  console.log("\nCOVERAGE SUMMARY (what an assessor will count)");
  for (const [k, v] of Object.entries(counts)) console.log(`  ${String(v).padStart(2)}  ${k}`);
  console.log(`  ${String(ROWS.length).padStart(2)}  clauses mapped in total`);
  console.log("\nUpload this ALONGSIDE the Quality Management Arrangements, not instead of them.");
  console.log("This is the map; that document is the system.");
}).catch((err) => { console.error(err); process.exit(1); });
