/**
 * ETABLIX — Quality Management Arrangements. Word and PDF.
 *
 *   node business/policies/build-quality.cjs
 *
 * Deliberately not laid out as an ISO 9001 quality manual and deliberately
 * not clause-numbered to mirror the standard. The company does not hold
 * ISO 9001. A document that looks certified when it is not is worse than
 * one that makes no claim, because an assessor who spots the resemblance
 * stops believing the rest of the pack.
 *
 * Section 4 is the part that is ours: quality here is documents and
 * decisions rather than concrete, so a defect is a wrong number, a missed
 * obligation or a notice issued after its deadline.
 */
const B = require("./brand.cjs");

const REV = "1";
const d = B.doc({
  slug: "Quality-Management-Arrangements",
  running: "Quality Management Arrangements",
  kicker: "QUALITY MANAGEMENT",
  title: "ARRANGEMENTS",
  sub: "how the work is checked before it leaves",
  rev: REV,
  control: [
    ["Document", "Quality Management Arrangements"],
    ["Revision", REV],
    ["Date of issue", "[date]"],
    ["Next review", "[date of issue + 12 months]"],
    ["Owner", "[name], Managing Director"],
    ["Approved by", "[name], Managing Director"],
    ["Applies to", "Every output ETABLIX issues, whoever drafted it"],
  ],
});
const { p, rich, h1, h2, bullet, richBullet, note, fillIn, table, pageBreak, approval } = d;

/* 1 */
h1("1. Position on certification");
rich([
  { t: "JNN GLOBAL LTD, trading as ETABLIX, does not hold ISO 9001 certification and does not claim it. ", b: true },
  { t: "The arrangements described here are the company's own." },
]);
p("An ISO 9001, 14001 and 45001 roadmap sits in the company's compliance plan. Until a certificate is issued by a UKAS-accredited certification body, nothing this company issues will describe its quality arrangements as certified, approved or compliant with the standard.");
note("This document is deliberately not laid out as a quality manual and deliberately does not use clause numbering that mirrors the standard. A document that looks certified when it is not is worse than one that makes no claim, because an assessor who spots the resemblance stops believing everything around it. Keep the title as it is.");

/* 2 */
h1("2. What quality means in this work");
p("The company produces documents and decisions, not physical works. A defect here is not a crack in a slab. It is a number that was wrong, an obligation that was missed, a notice that went out after its deadline, or a report describing a site as it was hoped to be rather than as it was found.");
p("Quality is therefore three things, and every arrangement below serves one of them:");
table([600, 2700, 5000],
  ["#", "Requirement", "What failure looks like"],
  [
    ["1", "The output is right", "Figures that do not reconcile. A clause reference taken from memory. A finding that does not match what was observed."],
    ["2", "The output is traceable", "A number nobody can source. An assessment whose basis died with the spreadsheet it was built in."],
    ["3", "The output is on time", "A correct valuation issued after the payment notice deadline has passed, which under most contracts is the same as no valuation at all."],
  ]);
p("The third is the one small consultancies lose. A contract's own timetable does not move because the work was thorough, and accuracy delivered late is a defect with a price attached to it.");

/* 3 */
h1("3. The arrangements");

h2("3.1 Understanding the requirement before work starts");
p("No engagement begins without a written scope: what is to be delivered, to whom, by when, on what information, and what is excluded. Where a client's instruction is ambiguous, the ambiguity is resolved in writing before work starts rather than assumed away. That written scope is the baseline the output is later checked against, and an engagement without one cannot be checked at all — only admired.");

h2("3.2 Competence");
p("Work is undertaken only where the person doing it is competent to do it. Where an engagement needs competence the company does not hold, the company either declines it or brings in a named specialist and tells the client it has done so. The company does not learn on a client's project at the client's cost without the client knowing.");

h2("3.3 Checking before issue");
p("Nothing leaves the company unchecked. The check is against the written scope from 3.1 and covers, as applicable:");
bullet("arithmetic and cross-casting, including the totals nobody re-adds because the spreadsheet produced them;");
bullet("the source of every figure, traceable to the document it came from;");
bullet("contract and clause references verified against the executed contract rather than from memory;");
bullet("dates tested against the contract's own time bars;");
bullet("whether every question the client actually asked has been answered.");
rich([
  { t: "Stated plainly, because it matters and because overstating it would be easy: ", b: true },
  { t: "with one working director the check is a separate, recorded pass over the document by its own author, deliberately separated in time from the drafting, then initialled and dated. That is not independent review and this document will not call it that. On the appointment of a second competent person, checking becomes a second-person check and this section is reissued." },
]);
p("Where the engagement value or the client's own procedures require independent review, an external reviewer is engaged and named to the client.");

h2("3.4 Document control");
p("Every document the company issues carries its title, its revision, its date, its author and the project name. Superseded revisions are retained and marked superseded rather than deleted, so that what was issued on any past date can be reproduced years later. Nothing is issued without a revision reference.");

h2("3.5 When something goes wrong");
p("Any error found in an issued document — found by the company, by a client, or by anyone else — is recorded, corrected and reissued. The record captures what the error was, how it reached issue, what the consequence was, and what changed so that it does not recur. Corrections are notified to the client; they are never made silently in a reissued document.");
rich([{ t: "This applies to errors nobody else noticed. ", b: true }, { t: "A register containing only the mistakes a client caught is a record of what was caught, not of what happened, and it improves nothing." }]);

h2("3.6 Client feedback");
p("Feedback is sought at the end of every engagement and, on engagements longer than [three] months, at the midpoint as well. It is recorded whether it is good or bad, and anything adverse is treated under 3.5.");

h2("3.7 Suppliers, associates and subcontractors");
p("Anyone engaged to deliver part of an ETABLIX output is selected against competence, insurance and record; receives the same written scope the client received; and their output is checked by the company under 3.3 before it goes out. The company's name on a document means the company has checked it, whoever drafted it.");

pageBreak();

/* 4 */
h1("4. Records, and how long they are kept");
p("Records are kept of: the written scope, the information received and the date it arrived, the working files behind each output, the checked and initialled issue copy, and all correspondence. They are held [state the system and the backup arrangement] and backed up [frequency]. They are never held only on one device.");

h2("Retention — the period is longer than most people assume");
table([3000, 5300],
  ["Work", "Retained for"],
  [
    ["Contract executed under hand", "6 years from completion — the limitation period under the Limitation Act 1980."],
    ["Contract executed as a deed", "12 years from completion."],
    ["Anything relating to a dwelling", "At least 15 years, and see below."],
    ["Health surveillance and exposure records", "The periods in the occupational health policy, up to 40 years."],
  ]);
rich([
  { t: "The Building Safety Act 2022 is the reason the third row exists. ", b: true },
  { t: "Section 135 extended the limitation period for claims under section 1 of the Defective Premises Act 1972 to fifteen years prospectively and thirty years retrospectively. For any work touching dwellings, a twelve-year retention is no longer sufficient, and a firm that destroyed its records on the old assumption will be defending a claim without the evidence that would have answered it." },
]);
p("Where an engagement may touch a dwelling, retention is set at the longer period at the outset rather than reconsidered later, because the decision to destroy a record is irreversible and the decision to keep one costs almost nothing.");

/* 5 */
h1("5. Review");
p("The Managing Director reviews these arrangements annually, and after any error recorded under 3.5 that reached a client. The review covers: the errors recorded and their causes, client feedback, whether the arrangements were actually followed, and what should change. Each review is dated on the cover.");
p("The review asks one question rather than two. Not whether the arrangements still read well — whether what they describe actually happened.");

/* 6 */
h1("6. What is not yet in place");
bullet("No independent second-person check, until there is a second competent person. Mitigated as described at 3.3, and not overstated there.");
bullet("No certified management system. See section 1.");
bullet("No internal audit programme against a standard. The reviews at section 5 are management reviews and are called that.");
bullet("No error or feedback history, because there have been no completed engagements under the company to generate one. Both are recorded from the first.");
note("An assessor reading this section learns more about how this company will behave than they could learn from a certificate. The point of stating it is not humility. It is that every other claim in the document becomes checkable, and therefore worth something.");

approval();
d.build().catch((err) => { console.error(err); process.exit(1); });
