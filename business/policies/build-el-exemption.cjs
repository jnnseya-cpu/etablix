/**
 * ETABLIX — Statement of exemption from compulsory employers' liability
 * insurance. Word and PDF.
 *
 *   node business/policies/build-el-exemption.cjs
 *
 * WHY A DOCUMENT AND NOT A BLANK UPLOAD BOX.
 *
 * A selection questionnaire asks for documentary evidence of employers'
 * liability insurance. ETABLIX holds none, because it is exempt: the
 * Employers' Liability (Compulsory Insurance) Act 1969 does not require cover
 * from a company whose only employee is a director owning 50% or more of the
 * issued share capital.
 *
 * Leaving the box empty and a blank explanation is indistinguishable, to an
 * assessor working through a hundred of these, from a supplier who is
 * uninsured and hoping nobody notices. A signed statement naming the Act, the
 * exemption, the facts that engage it and the date it stops applying converts
 * the same position from a gap into an answer.
 *
 * It is deliberately two pages. This is a letter, not a policy, and a long
 * document about not needing something reads as defensive.
 *
 * THE COMMITMENT AT SECTION 4 IS THE PART THAT MATTERS. The exemption ends on
 * the first employment, not on the first day of a contract, and cover must be
 * in force BEFORE the employee starts rather than in the same week. Saying so,
 * with the trigger named, is what makes the rest of the statement credible.
 */
const B = require("./brand.cjs");

const REV = "1";
const d = B.doc({
  slug: "Employers-Liability-Insurance-Statement",
  running: "Employers' liability insurance — statement of position",
  kicker: "EMPLOYERS' LIABILITY INSURANCE",
  title: "STATEMENT OF POSITION",
  sub: "why no certificate is attached, and the date that changes",
  rev: REV,
  control: [
    ["Document", "Statement of position — employers' liability insurance"],
    ["Revision", REV],
    ["Date", "[date]"],
    ["Company", "JNN GLOBAL LTD, trading as ETABLIX · Company No. 15405437"],
    ["Given by", "[name], Managing Director"],
    ["Statute", "Employers' Liability (Compulsory Insurance) Act 1969"],
    ["Purpose", "Provided in answer to a request for documentary evidence of employers' liability insurance"],
  ],
});
const { p, rich, h1, h2, bullet, richBullet, note, fillIn, table, approval } = d;

/* ------------------------------------------------------------------ */
h1("1. The position");

rich([
  { t: "ETABLIX does not hold employers' liability insurance, and is not required to. ", b: true },
  { t: "No certificate is attached because none exists. This statement is provided in its place so that the position is stated rather than left as an unexplained gap in a submission." },
]);

p("The Employers' Liability (Compulsory Insurance) Act 1969 requires an employer carrying on business in Great Britain to insure against liability for bodily injury or disease sustained by its employees in the course of their employment. The requirement does not apply to a company whose only employee is a director who owns fifty per cent or more of the issued share capital.");

h2("1.1  The facts that engage the exemption");

table([3000, 5300],
  ["", ""],
  [
    ["Employees", "One. [Name], Managing Director. There are no other employees, no agency workers and no labour-only subcontractors engaged as employees."],
    ["Shareholding", "[Name] holds [  ]% of the issued share capital of JNN GLOBAL LTD — not less than fifty per cent."],
    ["Conclusion", "The company falls within the exemption and no policy is required by the 1969 Act."],
  ]);

fillIn("Confirm both rows against the company's own register of members and the confirmation statement before signing. The exemption turns on the shareholding, and a statement that gets its own shareholding wrong is worse than no statement.");

/* ------------------------------------------------------------------ */
h1("2. What is in place instead");

p("The absence of a compulsory policy does not leave the company uninsured, and the other covers are the ones that actually respond to the risks a client carries.");

table([3000, 5300],
  ["Cover", "Position"],
  [
    ["Public liability", "[Insurer, policy number, limit of indemnity, period of insurance. Certificate attached separately at the public liability question.]"],
    ["Professional indemnity", "[Insurer, policy number, limit of indemnity, basis — each and every claim or in the aggregate — and period of insurance. Certificate attached separately at the professional indemnity question.]"],
    ["Employers' liability", "None. Exempt, for the reason at section 1."],
  ]);

note("Public liability and professional indemnity are the covers that respond to injury to a third party and to a defective specification respectively. For a consultancy that writes requirements rather than performing work on site, professional indemnity is the one a client should ask about hardest.");

/* ------------------------------------------------------------------ */
h1("3. Site attendance");

p("ETABLIX attends client sites to observe, measure and record. It performs no physical work, operates no plant, erects nothing and directs no operative. Attendance is as a visitor under the control of the principal contractor, subject to that contractor's site rules, induction and permit arrangements.");

p("Nothing in an ETABLIX appointment constitutes acceptance of a duty holder role under the Construction (Design and Management) Regulations 2015. Where a client wishes ETABLIX to hold such a role, it is appointed expressly and in writing, and the insurance position is reviewed before that appointment takes effect and not after.");

/* ------------------------------------------------------------------ */
h1("4. When this ceases to apply");

rich([{ t: "The exemption ends on the first employment, and cover will be in force before that person starts work rather than in the same week. ", b: true },
  { t: "It is stated that way because the two are not the same thing, and the gap between them is exactly where an uninsured employment happens." }]);

bullet("The trigger is the engagement of any employee other than the director, including a part-time or fixed-term one.");
bullet("It is also triggered if the director's shareholding falls below fifty per cent while the company has employees.");
bullet("On either event a policy is bound first, the certificate is displayed or made available as the Act requires, and any authority holding this statement is notified that it is superseded.");

fillIn("Where a first employment is already planned, give the expected date here. A buyer reading a specific date reads a company that has thought about this. A buyer reading 'in due course' reads one that has not.");

/* ------------------------------------------------------------------ */
h1("5. Confirmation");

p("The company confirms that the statements above are true at the date of this document, that it will notify any authority holding it if the position changes, and that it will produce evidence of employers' liability insurance within five working days of that cover being bound.");

table([3000, 5300],
  ["", ""],
  [
    ["Signed", "[signature]"],
    ["Name", "[name]"],
    ["Title", "Managing Director, for and on behalf of JNN GLOBAL LTD trading as ETABLIX"],
    ["Date", "[date]"],
  ]);

approval();
d.build().then(() => {
  console.log("\nBEFORE UPLOADING");
  console.log("  - confirm the shareholding percentage against the register of members");
  console.log("  - fill the public liability and professional indemnity rows at section 2");
  console.log("  - sign and date it");
  console.log("\n  Upload it at the employers' liability question, described as a statement of");
  console.log("  exemption rather than as a certificate. Do not leave the box empty.");
}).catch((err) => { console.error(err); process.exit(1); });
