/**
 * ETABLIX — Anti-Bribery and Corruption Policy. Word and PDF.
 *
 *   node business/policies/build-anti-bribery.cjs
 *
 * Written because Hitachi Energy's supplier register asked which management
 * systems the company is certified for and offered ISO 37001 as its example.
 * That is not a random choice on their part, and the honest answer — none —
 * is better answered with a policy that engages with the actual risk than
 * with a certificate the company does not have.
 *
 * Section 3 is the part that is ours and the reason this is not a template.
 * The bribery exposure in site establishment is specific and nameable:
 * ETABLIX recommends who gets paid. It scopes packages, runs enquiries,
 * normalises comparisons and recommends awards for security, cleaning, waste,
 * catering, cabin hire and plant. A company in that position is worth
 * corrupting, and the most dangerous version of it involves no money at all —
 * a specification written so that only one supplier can meet it.
 *
 * Section 13 states what is not in place, including the one that matters: in
 * a company of one working director there is no segregation between the person
 * who writes the specification, the person who runs the enquiry and the person
 * who recommends the award. Pretending otherwise would be the tell. What is
 * said instead is what is actually true — the comparison is documented and
 * issued to the client, and the client makes the award.
 */
const B = require("./brand.cjs");

const REV = "1";
const GIFT_LIMIT = "£30";
const HOSP_LIMIT = "£50";

const d = B.doc({
  slug: "Anti-Bribery-and-Corruption-Policy",
  running: "Anti-Bribery and Corruption Policy",
  kicker: "ANTI-BRIBERY AND CORRUPTION",
  title: "POLICY",
  sub: "the company recommends who gets paid — so this matters here",
  rev: REV,
  control: [
    ["Document", "Anti-Bribery and Corruption Policy"],
    ["Revision", REV],
    ["Date of issue", "[date]"],
    ["Next review", "[date of issue + 12 months, or on any material change]"],
    ["Owner", "[name], Managing Director"],
    ["Approved by", "[name], Managing Director"],
    ["Applies to", "Every person acting for or on behalf of ETABLIX, however engaged"],
    ["Legal framework", "Bribery Act 2010, sections 1, 2, 6 and 7"],
  ],
});
const { p, rich, h1, h2, bullet, richBullet, note, fillIn, table, pageBreak, approval } = d;

/* ------------------------------------------------------------------ */
h1("1. Position");

rich([
  { t: "ETABLIX does not offer, promise, give, request, agree to receive or accept a bribe, in any amount, in any form, anywhere, for any reason. ", b: true },
  { t: "There is no threshold below which it is acceptable, no commercial outcome that justifies it, and no instruction from a client that authorises it. A contract lost for refusing to pay a bribe is a contract this company is content to lose." },
]);

p("JNN GLOBAL LTD, trading as ETABLIX, is a company with one working director. That makes this policy shorter than a large contractor's and it does not make it weaker. It means the person who signs it is the person who does the work, and there is nobody else to blame.");

note("This is a statement of top-level commitment in the sense the Ministry of Justice guidance uses the phrase. In a company of one it is also simply a statement of intent by the only person who can act on it — which is the strongest form available and the easiest to test, because there is exactly one person's conduct to look at.");

/* ------------------------------------------------------------------ */
h1("2. Who this applies to, and what the law says");

p("This policy binds the director, any employee, and every person or organisation engaged to act for or on behalf of ETABLIX — subcontractors, consultants, agents, introducers, joint venture partners and anyone else in a position to act in the company's name.");

h2("2.1  The offences");

table([2000, 6300],
  ["Bribery Act 2010", "The offence"],
  [
    ["Section 1", "Offering, promising or giving a financial or other advantage to induce improper performance of a function or activity, or to reward it."],
    ["Section 2", "Requesting, agreeing to receive or accepting such an advantage."],
    ["Section 6", "Bribing a foreign public official to obtain or retain business or a business advantage."],
    ["Section 7", "The corporate offence: failure of a commercial organisation to prevent bribery by a person associated with it."],
  ]);

p("Section 7 is the one that makes this document necessary rather than decorative. A company commits it when somebody acting on its behalf bribes another person intending to obtain business for the company — and the company is liable even if nobody in it knew. The only defence is that the company had adequate procedures in place designed to prevent it. This policy, the registers at section 9 and the third-party checks at section 8 are those procedures.");

h2("2.2  What it costs");

bullet("For an individual: up to ten years' imprisonment, an unlimited fine, and disqualification from acting as a director.");
bullet("For the company: an unlimited fine, and confiscation of the proceeds under the Proceeds of Crime Act 2002.");
richBullet([
  { t: "For the company's future: ", b: true },
  { t: "a conviction for bribery is a " },
  { t: "mandatory exclusion ground", b: true },
  { t: " under the Procurement Act 2023. A single conviction would end this company's ability to bid for public sector work, and public sector frameworks are where it intends to operate. The commercial consequence is not a fine. It is the end of the business." },
]);

note("That last point is stated plainly because it is the honest answer to why a small company should care. The deterrent is not a moral one alone — a bribery conviction removes the company from every framework it is currently applying to, permanently as a practical matter, and no amount of good delivery afterwards recovers it.");

/* ------------------------------------------------------------------ */
pageBreak();
h1("3. Where the risk actually is in this business");

rich([
  { t: "ETABLIX recommends who gets paid. ", b: true },
  { t: "It scopes site services packages, issues enquiries, normalises the returns into a comparison and recommends an award — for security, cleaning, waste, catering, welfare and cabin hire, temporary power, water, and small plant. A company in that position is worth corrupting, and everyone in that supply chain knows it." },
]);

p("A generic anti-bribery policy lists foreign officials and customs agents. Those are not this company's exposure. These are, and each one has been thought about rather than copied:");

h2("3.1  The specification written to fit one supplier");

rich([
  { t: "This is the most dangerous risk on the list, because no money moves and it does not feel like bribery. ", b: true },
  { t: "A specification can be written so that only one supplier's product meets it — a cabin size, a fuel system, a service interval, a proprietary accommodation module. The enquiry then looks competitive and is not. The advantage passes to the supplier and whatever comes back to the person who wrote it, in work, in favours or in a future job, is a bribe under section 1 whether or not an invoice ever existed." },
]);

p("Control: every specification states the performance required, not the product that delivers it. Where a proprietary requirement is genuinely unavoidable it is identified as such, with the reason, in the document issued to the client. A specification ETABLIX cannot explain to the client in performance terms does not go out.");

h2("3.2  Introducer fees, referral commissions and rebates");

p("Suppliers in this sector offer commissions for referred business. Accepting one on a package ETABLIX has recommended to a client would be an advantage received for improper performance of the company's duty to that client. It is prohibited, in any form, whatever it is called — referral fee, introducer commission, volume rebate, loyalty credit, framework discount paid to us rather than to the client.");

bullet("If a supplier offers one, it is refused in writing and recorded in the register at section 9.");
bullet("Where a supplier's pricing includes a rebate or discount of any kind, it is passed to the client in full and disclosed in the comparison.");
bullet("ETABLIX takes its fee from its client and from nobody else. Any payment from a supplier, of any size, for any stated reason, requires the client's written agreement first — and in practice the answer is no.");

h2("3.3  Hospitality during a live procurement");

p("The site services market runs on hospitality — site visits, lunches, hospitality at events, demonstration days. Most of it is ordinary and lawful. It stops being ordinary when there is a live enquiry on the table, because at that point it is capable of looking like payment for a decision, and section 6 of this policy sets the rule.");

h2("3.4  The client's own staff");

p("A request from a client's employee for a personal advantage — cash, work for a relative, a job, equipment, a favour — in return for information, for being put on a tender list, or for a decision, is bribery whichever direction it runs. It is refused, and it is reported to somebody in that organisation senior to the person who asked.");

p("Refusing costs the enquiry. Refusing is the answer.");

h2("3.5  Consents, wayleaves and authorities");

p("Site establishment work touches highway authorities, planning officers, environmental regulators, landowners and utility providers. Lawful payments — application fees, wayleave consideration, statutory charges — are paid against an invoice or agreement, at the published or negotiated rate, and recorded. Nothing else is paid to anybody to make a consent move faster.");

h2("3.6  Facilitation payments and kickbacks");

rich([
  { t: "Prohibited absolutely, with no exception and no discretion. ", b: true },
  { t: "A facilitation payment is a small payment to secure or speed up a routine action somebody is already obliged to perform. It is a bribe under the Bribery Act 2010 even where local custom treats it otherwise and even where the sum is trivial." },
]);

p("The single exception recognised by law and by this policy: a payment made under genuine and immediate threat to personal safety is not an offence. If one is ever made, it is reported to the director the same day, recorded in full, and disclosed to the client and, where appropriate, to the authorities. It is never recorded as anything other than what it was.");

/* ------------------------------------------------------------------ */
pageBreak();
h1("4. Adequate procedures — the six principles, and what they are here");

p("The Ministry of Justice guidance under section 9 of the Act sets out six principles. They are written to scale. What follows is what each one amounts to in a company of one working director, stated without inflation.");

table([1500, 3300, 3500],
  ["Principle", "What it requires", "What it is here"],
  [
    ["1 · Proportionate procedures",
     "Procedures proportionate to the bribery risks the organisation faces, and to its size and complexity.",
     "This policy, the two registers at section 9, and the third-party checks at section 8. No compliance function, because there is nothing for one to supervise."],
    ["2 · Top-level commitment",
     "Top-level management committed to preventing bribery and fostering a culture in which it is unacceptable.",
     "Section 1, signed by the only person who can act on it."],
    ["3 · Risk assessment",
     "Periodic, informed and documented assessment of internal and external bribery risk.",
     "Section 3. Reviewed annually and on any new client, sector or country of operation."],
    ["4 · Due diligence",
     "A risk-based due diligence approach to persons who perform services for or on behalf of the organisation.",
     "Section 8. Applied to every subcontractor and supplier before appointment."],
    ["5 · Communication and training",
     "Policies and procedures embedded and understood throughout the organisation, including training.",
     "The document is issued to every subcontractor with their order and referenced in it. Training is one person reading and signing this — recorded at section 12."],
    ["6 · Monitoring and review",
     "Monitoring and review of procedures, with improvement where necessary.",
     "Section 12. Annual review, and a review triggered by any entry in either register."],
  ], { size: 16 });

note("Principle 5 is where a small company is tempted to overclaim. There is no training programme here and this document does not pretend there is one. What there is, is a signature and a date, which is a testable fact.");

/* ------------------------------------------------------------------ */
h1("5. Gifts");

p("A gift is anything of value given without an expectation of anything in return. Most gifts in this industry are exactly that. The rule exists for the ones that are not.");

richBullet([
  { t: "Never, of any value, from any party involved in a live enquiry, tender or award. ", b: true },
  { t: "Not a bottle, not a hamper, not a branded jacket. If a package is out to enquiry or awaiting award, the answer is no and the offer is recorded." },
]);
richBullet([
  { t: `Outside a live procurement: modest and infrequent only, to a value of ${GIFT_LIMIT} or less, ` },
  { t: "and recorded in the gifts and hospitality register whatever the value." },
]);
bullet("Cash or a cash equivalent — vouchers, prepaid cards, cryptocurrency, a discount on a personal purchase — is refused in every circumstance, at any value, at any time.");
bullet("Never to or from a public official, a client's employee, or anybody in a position to influence a decision about ETABLIX, irrespective of value or timing.");
bullet("Anything that cannot be declared openly to the client is refused. The test is not the amount. The test is whether it could be written down and shown to the other party without embarrassment.");

p("A gift that arrives unsolicited and cannot be refused politely is returned, or where that is impractical, given to charity and recorded as having been.");

/* ------------------------------------------------------------------ */
h1("6. Hospitality");

p("Reasonable and proportionate hospitality given or received to build a legitimate business relationship, to present the company's services, or to demonstrate a product is lawful and is not prohibited. The limits:");

bullet(`Modest in value — a working meal rather than an event. ${HOSP_LIMIT} per person is the level above which it is declined or referred to the director for a written decision.`);
bullet("Never during a live enquiry, tender or award involving the other party. This is the same rule as section 5 and it is the one most often broken by accident.");
bullet("Never lavish, never repeated to the point of pattern, never extended to family members, and never involving travel or accommodation paid for by the other party.");
bullet("Always capable of open disclosure to the client, and recorded in the register whether given or received.");
bullet("No hospitality of any kind is offered to a public official without the director's prior written approval, recorded with the reason.");

note("The honest difficulty with hospitality in a one-person company is that there is nobody to refer a borderline case to. The rule adopted instead is a written one: where the director is unsure, it is declined and the reason is recorded. A declined offer costs a lunch. An accepted one that should have been declined costs the framework.");

/* ------------------------------------------------------------------ */
pageBreak();
h1("7. Donations, sponsorship and political contributions");

bullet("No political donations are made by ETABLIX, in cash or in kind, to any party, candidate, campaign or elected official, in any country.");
bullet("Charitable donations are made only to a registered charity, only against a receipt, and never at the request or suggestion of a client, a supplier, or a public official.");
bullet("No sponsorship is entered into where the counterparty is in a position to influence a decision about ETABLIX.");

p("A charitable donation requested by somebody in a position to award work is not a donation. It is a bribe routed through a good cause, and it is refused on that basis.");

/* ------------------------------------------------------------------ */
h1("8. Third parties: subcontractors, suppliers and intermediaries");

p("Section 7 of the Act makes ETABLIX liable for bribery by a person associated with it. The people associated with this company are the subcontractors and suppliers it engages and recommends. They are therefore checked, proportionately, before appointment.");

h2("8.1  Before appointment");

bullet("Identity and standing confirmed against Companies House — incorporation, filing history, directors, and whether the company is the one it says it is.");
bullet("A search for public enforcement action, debarment or conviction relating to bribery, fraud or corruption.");
bullet("For any party outside the United Kingdom, or any party introduced rather than found, a documented check proportionate to that raised risk before any commitment is made.");
bullet("No agent, introducer or intermediary is engaged on a success fee, a commission or a percentage of the work won. ETABLIX does not use intermediaries to obtain work.");

h2("8.2  In the appointment");

bullet("Every order and subcontract carries a written anti-bribery obligation, a right for ETABLIX to terminate on breach, and a right to require information.");
bullet("This policy is issued with the order, and the order references it. A subcontractor who has not been given it has not been told, and untold is a failure of principle 5.");
bullet("Payment is made only against an invoice, only to the contracted party, only to a bank account in that party's own name, and never in cash.");

richBullet([
  { t: "A request to pay a third party, to pay into a different account, or to pay in cash is treated as a bribery indicator ", b: true },
  { t: "and is refused pending a written explanation from the counterparty's own director." },
]);

/* ------------------------------------------------------------------ */
h1("9. Records");

p("Two registers are kept. They are the evidence that the procedures at section 4 are real rather than asserted, and they are the first thing that would be asked for.");

table([2600, 5700],
  ["Register", "What goes in it"],
  [
    ["Gifts and hospitality",
     "Every gift and every instance of hospitality, given or received, offered or declined, with the date, the parties, the value, whether there was a live procurement at the time, and the decision taken with its reason. Declined offers are recorded as well as accepted ones — a register showing only what was accepted proves nothing."],
    ["Bribery concerns and refusals",
     "Every offer, request, suspicion and refusal, with the date, what was said, who by, and what was done. Including the ones that came to nothing."],
  ]);

bullet("Both registers are retained for six years from the end of the financial year in which the entry was made.");
bullet("All accounts, invoices and records are accurate and complete. No account is off the books, no payment is disguised, and nothing is recorded as something other than what it was.");
bullet("Where a client's own procedures require disclosure of gifts or hospitality involving their staff or their project, ETABLIX makes that disclosure as well as recording it here.");

fillIn("Start both registers on the day this policy is issued, even though both will be empty. A register that begins on the date of the first entry cannot show that nothing happened before it.");

/* ------------------------------------------------------------------ */
pageBreak();
h1("10. Raising a concern");

p("Anybody — the director, a future employee, a subcontractor, a supplier, a client's staff — who suspects that bribery has occurred or been requested in connection with ETABLIX is asked to say so, as early as possible, and in writing where they can.");

h2("10.1  Where to raise it");

bullet("In the first instance, to the Managing Director, at the company's published contact address.");

richBullet([
  { t: "Where the concern is about the director, or where the person raising it would rather not come to the company at all, ", b: true },
  { t: "it should go outside ETABLIX. That is the correct route and this policy says so rather than pretending an internal alternative exists:" },
]);

table([2600, 5700],
  ["Route", "For"],
  [
    ["Protect — 020 3117 2520, protect-advice.org.uk",
     "The independent whistleblowing charity. Free, confidential advice on raising a concern and on the protection available."],
    ["The Serious Fraud Office — sfo.gov.uk",
     "Reporting suspected bribery or corruption. Accepts reports from any source, including anonymously."],
    ["Action Fraud — 0300 123 2040",
     "Reporting fraud and financially motivated crime where the SFO is not the right route."],
    ["The client's own channel",
     "Every major contractor and utility operates a confidential reporting line. Where the concern touches their project, that route is legitimate and this company will not treat using it as disloyalty."],
  ]);

h2("10.2  Protection");

p("A person who raises a genuine concern in good faith will not suffer detriment from ETABLIX for having raised it — no termination, no withheld payment, no removal from a tender list, no adverse reference. This holds even where the concern turns out to be mistaken. A concern raised in good faith and wrong is exactly what a working reporting culture produces.");

p("A worker who makes a qualifying disclosure has statutory protection under the Public Interest Disclosure Act 1998, independently of anything this policy says.");

note("The limitation here is real and stating it is the point. In a company with one working director there is no independent internal channel and there cannot be one. A policy that offered a confidential internal line would be describing a person who does not exist. The external routes above are named, with numbers, precisely because they are the ones that work.");

/* ------------------------------------------------------------------ */
h1("11. Consequences of breach");

bullet("For an employee: a disciplinary matter capable of amounting to gross misconduct and summary dismissal.");
bullet("For a subcontractor, supplier or agent: immediate termination of the appointment, removal from the supply chain, and no further engagement.");
bullet("For the director: the same standard, applied by the board, and reported to the client and the authorities as the circumstances require.");
bullet("In every case, referral to the police or the Serious Fraud Office where an offence appears to have been committed. The company does not settle a bribery matter quietly.");

/* ------------------------------------------------------------------ */
h1("12. Monitoring, review and training");

bullet("This policy is reviewed every twelve months, and immediately on any entry in either register, any new country of operation, any first engagement in a new sector, or any change in the law.");
bullet("The risk assessment at section 3 is revisited at the same time and rewritten rather than reaffirmed, because a risk assessment that never changes is not being done.");
bullet("Every person bound by this policy reads it and records that they have. For the director that record is the signature on the last page of this document.");
bullet("On the first employee, an induction acknowledgement is added and this section is rewritten to describe it. Until then it would be describing nobody.");

fillIn("Record the review date each year even where nothing changed, with one line on what was considered. An unreviewed policy and a reviewed policy look identical; the dates are the only difference an assessor can see.");

/* ------------------------------------------------------------------ */
h1("13. What is not yet in place");

p("Listed here rather than left to be discovered, on the same principle as the company's other policies.");

richBullet([
  { t: "No segregation of duties, and this is the significant one. ", b: true },
  { t: "The person who writes the specification, issues the enquiry, normalises the comparison and recommends the award is the same person. In a larger organisation those would be different desks by design." },
]);
p("What is true instead, and what is offered as the control: the comparison is documented, the basis of the recommendation is written down, both are issued to the client, and the client makes the award. The client is the check. Where a client requires an independent review of a recommendation, ETABLIX procures one and says so in the fee.");

bullet("No ISO 37001 certification, and no claim to one. This policy is drafted against the Bribery Act 2010 and the Ministry of Justice guidance, not against a standard the company does not hold.");
bullet("No independent internal reporting channel — see section 10.2. External routes are named because they are the real ones.");
bullet("No formal training programme. One person, one reading, one signature.");
bullet("No subscription due diligence or sanctions screening platform. Checks are Companies House, open enforcement records and a written declaration from the counterparty, which is proportionate at this scale and will stop being proportionate as the company grows.");
bullet("No breach history and no register entries, because there has been no trading activity to generate either. Both registers open on the date of issue, empty, so that the absence is evidenced rather than asserted.");

note("An assessor reading this section learns more about how this company will behave than a certificate could tell them. The point of stating it is not modesty. It is that every other claim in the document becomes checkable, and therefore worth something.");

approval();
d.build().catch((err) => { console.error(err); process.exit(1); });
