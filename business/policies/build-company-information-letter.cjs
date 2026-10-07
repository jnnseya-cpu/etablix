/**
 * ETABLIX — Supplier Company Information Letter. Word and PDF.
 *
 *   node business/policies/build-company-information-letter.cjs
 *
 * WRITTEN AGAINST A SPECIFIC REQUEST. GE Vernova, Grid Solutions, 7 October
 * 2026: "as per our process requirements, we request a document on the
 * supplier's official company letterhead that clearly includes the supplier's
 * legal name, complete address, tax information, and an authorized seal and
 * signature."
 *
 * EVERY SUPPLIER PORTAL ASKS FOR THIS, so it is built once and reused. It is
 * deliberately a LETTER rather than a report: one page, letterhead at the top,
 * signature at the bottom, no cover and no control table. A compliance team
 * asked for a letter and will treat a six-page report as the wrong artefact.
 *
 * ON THE "AUTHORIZED SEAL". United Kingdom companies have not been required to
 * have a common seal since the Companies Act 1989, and most incorporated after
 * it simply do not have one. Section 44 of the Companies Act 2006 provides that
 * a document is validly executed by the signature of a single director in the
 * presence of a witness who attests it. That is what section 4 of this letter
 * says and offers, because a request for a seal from a company that has none is
 * usually met with silence rather than an explanation — and silence reads as
 * non-compliance.
 *
 * WHAT IS NOT IN THIS FILE, AND WILL NEVER BE. The company's bank details and
 * the director's Unique Taxpayer Reference are not here, are not fields here,
 * and must not be added. A bank detail in a document is a document that can be
 * forwarded, intercepted or altered; bank details go into a portal's own
 * payment screen, by the director, and nowhere else. Tax information for this
 * purpose means the company registration number, which is public, and the VAT
 * registration number where one exists.
 */
const B = require("./brand.cjs");

const COMPANY_NO = "15405437";
const DIRECTOR = "Justin Ngolu Nseya MCIOB";
const ISSUE = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

const d = B.doc({
  slug: "Company-Information-Letter",
  running: "Company information letter",
  title: "COMPANY INFORMATION STATEMENT",
  rev: "1",
  outDir: __dirname,
  kind: "letter",
  letter: true,
  letterhead: [
    "JNN GLOBAL LTD, trading as ETABLIX · Registered in England and Wales, company number " + COMPANY_NO,
    "Registered office: [registered office address exactly as it appears at Companies House, including postcode]",
    "[telephone] · [email] · etablix.com",
  ],
});
const { p, rich, h2, bullet, note, table } = d;

p("Date: " + ISSUE, { after: 240 });

p("To whom it may concern,", { after: 180 });

rich([{ t: "This letter is issued on the company's letterhead to confirm its legal identity, registered address and tax references for supplier registration and onboarding purposes. ", b: true },
  { t: "It may be relied on by any party assessing JNN GLOBAL LTD for registration as a supplier." }]);

/* ------------------------------------------------------------------ */
h2("1.  Legal identity");

table([2600, 5700], ["", ""], [
  ["Registered legal name", "JNN GLOBAL LTD"],
  ["Trading name", "ETABLIX — Integrated Site Services"],
  ["Legal form", "Private company limited by shares"],
  ["Registered in", "England and Wales"],
  ["Company registration number", COMPANY_NO],
  ["Date of incorporation", "[date of incorporation as shown at Companies House]"],
  ["Director", DIRECTOR],
]);

/* ------------------------------------------------------------------ */
h2("2.  Registered address and correspondence address");

table([2600, 5700], ["", ""], [
  ["Registered office", "[full registered office address, exactly as recorded at Companies House, including postcode]"],
  ["Correspondence address", "[if different from the registered office; otherwise state: as above]"],
  ["Country of operation", "United Kingdom"],
]);

/* ------------------------------------------------------------------ */
h2("3.  Tax information");

table([2600, 5700], ["", ""], [
  ["Company registration number", COMPANY_NO],
  ["VAT registration number", "[VAT number, or state: not currently VAT registered]"],
  ["Country of tax residence", "United Kingdom"],
  ["Tax authority", "HM Revenue & Customs"],
]);

note("Bank details are not included in this letter and should never be requested in one. Payment details are provided only through the buyer's own secure supplier portal, entered directly by the director. A letter can be forwarded, copied or altered after it leaves our hands; a payment screen cannot.");

/* ------------------------------------------------------------------ */
h2("4.  Execution, and the position on a company seal");

rich([{ t: "JNN GLOBAL LTD does not have a common seal. ", b: true },
  { t: "A company seal has not been a requirement for a company incorporated in England and Wales since the Companies Act 1989, and most companies incorporated since do not hold one. This is stated plainly rather than left for anybody to wonder about." }]);

p("Under section 44 of the Companies Act 2006 a document is validly executed by a company whose articles permit it when it is signed by a single director in the presence of a witness who attests the signature. This letter is executed on that basis, and the signature below is the authorised signature of the company.");

p("Where a buyer's process requires a sealed document specifically, the company will have the signature witnessed and notarised, or will provide such other form of authentication as is required. Please ask.");

/* ------------------------------------------------------------------ */
h2("5.  Confirmation");

p("I confirm that the information above is true and accurate at the date of this letter, that I am a director of JNN GLOBAL LTD and am authorised to give this confirmation on its behalf, and that the company will notify any registered buyer of a material change to it.", { after: 400 });

p("Signed  ..............................................................", { after: 160 });
p("Name  " + DIRECTOR, { after: 60 });
p("Position  Managing Director, for and on behalf of JNN GLOBAL LTD", { after: 60 });
p("Date  ....................................", { after: 260 });

p("Witnessed by  ..............................................................", { after: 160 });
p("Name  [witness full name]", { after: 60 });
p("Address  [witness address]", { after: 60 });
p("Date  ....................................", { after: 200 });

note("The witness block is there because section 44 requires attestation where a single director signs. A witness may be any adult who is not a party to the document and not a close relative where the buyer's own rules say otherwise. Leaving it blank does not invalidate the letter for most purposes, but completing it removes an objection before it is raised.");

d.build().then(() => {
  console.log("\nBEFORE SENDING");
  console.log("  1. Registered office address, exactly as Companies House shows it. Three places.");
  console.log("  2. Date of incorporation, telephone and email.");
  console.log("  3. VAT number, or state plainly that the company is not VAT registered.");
  console.log("  4. Print, sign, have the signature witnessed, date it, scan it.");
  console.log("\n  NOT IN THIS LETTER, BY DESIGN: bank details and the UTR. They go into the");
  console.log("  buyer's payment screen, entered by the director, and nowhere else.");
}).catch((err) => { console.error(err); process.exit(1); });
