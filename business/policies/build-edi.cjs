/**
 * ETABLIX — Equality, Diversity and Inclusion Policy. Word and PDF.
 *
 *   node business/policies/build-edi.cjs
 *
 * Written to be true of a company with one working director on the day it
 * is signed. It publishes no workforce figures, because with one director
 * there are none, and a table of invented percentages in an EDI policy is
 * the single most damaging thing this document could contain.
 *
 * Section 5 is the part that is ours rather than generic. This company
 * specifies welfare, site services and worker accommodation, so its
 * equality duty is discharged largely in what it writes into a
 * specification months before anybody arrives on site — and that is where
 * a construction client will judge whether the policy is real.
 */
const B = require("./brand.cjs");
const { SLATE } = B;

const REV = "1";
const d = B.doc({
  slug: "EDI-Policy",
  running: "Equality, Diversity and Inclusion",
  kicker: "EQUALITY, DIVERSITY",
  title: "AND INCLUSION",
  sub: "policy and arrangements",
  rev: REV,
  control: [
    ["Document", "Equality, Diversity and Inclusion Policy"],
    ["Revision", REV],
    ["Date of issue", "[date]"],
    ["Next review", "[date of issue + 12 months]"],
    ["Owner", "[name], Managing Director"],
    ["Approved by", "[name], Managing Director"],
    ["Applies to", "Every person working for or on behalf of ETABLIX, and every client, supplier and applicant"],
  ],
});
const { p, rich, h1, h2, bullet, richBullet, note, fillIn, table, pageBreak, approval } = d;

/* ---- 1 ---- */
h1("1. Statement of intent");
p("JNN GLOBAL LTD, trading as ETABLIX, is committed to equality of opportunity, to a diverse workforce and supply chain, and to sites and workplaces where people are treated with dignity. This document says how that is done rather than that it is intended, because an intention is not a policy.");
p("The commitment applies from first contact. A person who applies for work, a supplier who asks to be considered, and a subcontractor invited to price are all covered by it, and so is every person encountered on a site this company attends.");

h2("Why this matters in this industry, specifically");
p("Construction has the least diverse workforce of any major sector in the United Kingdom, and the reasons are mostly structural rather than attitudinal. Entry routes are narrow and depend on who you already know. Facilities on site are designed around an assumption about who is using them. Safety equipment is manufactured to fit an average body that many people do not have. Hours and travel patterns exclude anybody with caring responsibilities. Each of those is a decision somebody made, and each can be decided differently.");
p("This policy is written around those decisions, because they are the ones this company actually controls.");

h2("What this company is today");
p("ETABLIX has one working director and no other employees. Every arrangement below is written to be true at that size. Section 9 states what is measured today, which is very little, and what will be measured from the first engagement. Nothing in this document reports a figure that does not exist.");

/* ---- 2 ---- */
h1("2. The legal framework this policy works to");
table([3200, 5100],
  ["Instrument", "What it requires of us"],
  [
    ["Equality Act 2010, s.4", "Nine protected characteristics: age, disability, gender reassignment, marriage and civil partnership, pregnancy and maternity, race, religion or belief, sex, sexual orientation."],
    ["Equality Act 2010, s.13", "Direct discrimination — less favourable treatment because of a protected characteristic."],
    ["Equality Act 2010, s.15", "Discrimination arising from disability — unfavourable treatment because of something arising in consequence of a disability."],
    ["Equality Act 2010, s.19", "Indirect discrimination — a provision, criterion or practice that disadvantages a group and cannot be justified."],
    ["Equality Act 2010, ss.20–21", "The duty to make reasonable adjustments for disabled people. An anticipatory duty, not one that waits to be asked."],
    ["Equality Act 2010, s.26", "Harassment — unwanted conduct related to a protected characteristic that violates dignity or creates a hostile environment."],
    ["Equality Act 2010, s.27", "Victimisation — detriment because someone did, or might do, a protected act such as raising a complaint."],
    ["Worker Protection (Amendment of Equality Act 2010) Act 2023", "The preventative duty: an employer must take reasonable steps to prevent sexual harassment of its workers. Section 7 sets out ours."],
    ["Equality Act 2010, s.149", "The public sector equality duty. It binds our public sector clients rather than us, and we are expected to help them discharge it — see section 5."],
    ["Procurement Act 2023", "Public contracts assessed on value for money including social value. Equality performance is evidence, not sentiment."],
    ["Modern Slavery Act 2015", "Section 54 reporting applies above a turnover threshold this company does not meet. Its statement is published voluntarily."],
    ["Employment Rights Act 1996", "Flexible working requests, family leave and protection from detriment."],
  ]);

/* ---- 3 ---- */
h1("3. The commitment");
p("The company will not discriminate against any person because of a protected characteristic, in recruitment, terms of engagement, pay, training, promotion, the allocation of work, discipline, or the ending of any engagement.");
p("That covers every form the Act recognises, and the two that are most often missed are the two most likely to occur here: indirect discrimination, where a neutral-looking requirement excludes a group without justification, and discrimination arising from disability, where someone is penalised for a consequence of a condition rather than for the condition itself.");
note("A policy that only restates the statute is worth nothing at a selection stage, because every applicant has one and they are indistinguishable. What follows is what this company does differently, and each item can be checked.");

/* ---- 4 ---- */
h1("4. What this means in our own work");

h2("Recruitment");
bullet("Roles are described against the competence the work actually requires, never against a profile of who has held the role before.");
bullet("Requirements that exclude without cause are removed before a role is advertised: an arbitrary years-of-experience floor, a driving licence for a role that does not require driving, a degree where a trade route is equivalent, or a demand for UK main contractor experience where the skill is plainly transferable.");
bullet("Applications are assessed against written criteria set before the applications are read, so that the criteria cannot move to fit a preferred candidate.");
bullet("A person is not required to disclose a disability to be considered, and a request for an adjustment at interview is never a factor in the decision.");
richBullet([{ t: "Experience gained outside the United Kingdom counts. ", b: true }, { t: "This company was founded by somebody whose record is European as well as British, and it will not apply a standard to others that would have excluded its own founder." }]);

h2("Personal protective equipment");
p("This belongs in an equality policy and it is usually missing from one.");
p("Most standard protective equipment is manufactured to fit an average adult male body. Equipment that does not fit does not protect: a harness sized for a different frame, gloves that prevent grip, boots that cause injury over a shift, or eye protection that will not seal are safety defects and they fall disproportionately on women, on smaller and larger workers, and on anyone whose religious observance affects what can be worn.");
rich([{ t: "The company's position: ", b: true }, { t: "protective equipment is issued to fit the person, not to fit the average. Where correctly fitting equipment is not available for somebody, the work does not proceed until it is, and the cost of the right equipment is never a reason to issue the wrong one. Where the company specifies protective equipment for others, the specification requires a size and fit range covering the whole workforce rather than a single standard item." }]);

h2("Reasonable adjustments");
p("Adjustments to working arrangements, equipment or premises are made where a person has a disability and the adjustment is reasonable. A person does not have to disclose a diagnosis to ask, an adjustment does not have to be permanent, and asking never counts against anybody.");
p("Adjustments available without argument, and which cost this company nothing: changed or reduced hours, remote working where the task genuinely permits it, a changed deadline negotiated with the client, equipment supplied, and site attendance scheduled around access or fatigue. The duty under sections 20 and 21 is anticipatory, so arrangements are designed to be usable rather than corrected when somebody complains.");

h2("Flexible working and caring responsibilities");
p("Requests are considered on their merits and against the needs of the work, never against an assumption about who is likely to have caring responsibilities. Long hours and long travel are the principal reason people leave this industry, and treating them as an unavoidable fact of construction is a choice that excludes a predictable group of people.");

h2("The supply chain");
bullet("Suppliers and subcontractors are selected against competence, capacity, safety record, financial standing and price — never against the ownership or composition of the firm.");
bullet("Where a route to market exists for smaller, minority-led or social enterprise suppliers, it is used, because a supply chain assembled entirely from the firms already known to us reproduces whatever exclusion is already there.");
richBullet([{ t: "An unlawful instruction is refused in writing. ", b: true }, { t: "If a client asks this company to exclude a supplier on grounds this policy prohibits, the company will say so in writing and will not act on it." }]);

pageBreak();

/* ---- 5 ---- */
h1("5. What we specify for others");
p("This is the section that is specific to this company, and it is where most of its real influence sits.");
p("ETABLIX specifies and manages welfare, site services and worker accommodation. Those specifications are written months before anybody arrives on site, and they determine whether the site works for the whole workforce or only for part of it. An equality commitment that stops at how this company conducts itself and never reaches the specification is a commitment kept where it costs nothing.");

h2("Welfare facilities");
bullet("Sanitary and changing provision that is separate, secure, lockable and genuinely usable, specified for the whole workforce rather than provided as an afterthought once somebody asks.");
bullet("Provision for expressing and storing milk where a project's duration and workforce make it foreseeable, which on a multi-year project it is.");
bullet("Rest facilities that a person can actually use, sited so that using them does not cost most of a break in walking.");
richBullet([{ t: "Where the company inspects welfare on a client's behalf, inadequate provision is reported as a finding", b: true }, { t: " — in the same terms and with the same weight as a safety defect, because it is one." }]);

h2("Worker accommodation");
p("Where a workforce lives in accommodation this company has specified or manages, the specification decides whether people can live there with dignity. The items below are specification decisions, not welfare gestures, and each is cheaper to get right on paper than to retrofit on site.");
richBullet([{ t: "Privacy and security. ", b: true }, { t: "Lockable rooms, secure and separate sanitary facilities, and lighting and layout that make the whole site usable after dark by everybody." }]);
richBullet([{ t: "A mixed workforce, assumed from the outset. ", b: true }, { t: "Accommodation planned around a single-sex workforce cannot be adapted later without cost and without somebody having to ask for it." }]);
richBullet([{ t: "Space for religious observance. ", b: true }, { t: "A quiet room that can be used for prayer, and washing facilities that permit ablution, cost almost nothing at design stage and are effectively impossible to add afterwards." }]);
richBullet([{ t: "Catering that feeds everybody. ", b: true }, { t: "Halal, kosher, vegetarian and vegan provision as a specified requirement rather than a request the caterer may decline, with allergen information available in the languages the workforce actually reads." }]);
richBullet([{ t: "Accessible rooms. ", b: true }, { t: "A proportion of accommodation specified as accessible, so that a worker who becomes disabled during a multi-year project does not have to leave it." }]);

h2("Information people can act on");
p("Site information that cannot be read is not information. Where the workforce on a project includes people whose first language is not English, or people with limited literacy, the company specifies and recommends pictorial and translated safety material, inductions delivered in a form that can be understood, and toolbox talks that check comprehension rather than attendance.");
p("This is an equality duty and a safety duty at the same time. Treating comprehension as the worker's own problem is how both get breached at once.");

h2("Our public sector clients");
p("Public authorities are bound by the public sector equality duty under section 149 of the Equality Act 2010, and it applies to what they procure. Where this company advises a public client, its recommendations are framed so the client can evidence that duty: equality requirements written into specifications, into subcontract selection criteria and into performance reporting, rather than stated in a covering paragraph and then dropped from the documents that bind anybody.");

pageBreak();

/* ---- 6 ---- */
h1("6. Dignity at work");
p("Harassment related to a protected characteristic is unlawful, and this company does not tolerate it on any project it works on — including where the person responsible is employed by a client or by another contractor.");
p("Everyday conduct is where this is actually decided. Banter that singles somebody out, images displayed in a cabin, initiation of new starters, exclusion from the conversations where work is really allocated: these are the forms harassment takes on a construction site, and calling them harmless is how they persist.");

h2("The preventative duty");
p("The Worker Protection (Amendment of Equality Act 2010) Act 2023 requires an employer to take reasonable steps to prevent sexual harassment of its workers, including by third parties. The steps this company takes, stated so they can be checked:");
bullet("This policy is issued at engagement and its standard is stated rather than assumed.");
bullet("A named route to raise a concern exists, with an alternative route where the concern is about the Managing Director. Both are at section 7.");
bullet("Before a person is placed on a client's site, the arrangements on that site are considered as part of the risk assessment — a site where somebody will be the only woman on it is a foreseeable risk and is planned for rather than discovered.");
bullet("Conduct observed on a client's or contractor's site is raised with the person in control of that site and recorded.");
bullet("Concerns are acted on, and what is done is recorded.");
note("A policy on a wall is not a reasonable step. What is reasonable is judged on what an organisation actually did, and this section is written so that what was done can be produced.");

/* ---- 7 ---- */
h1("7. Raising a concern");
p("Any concern about discrimination, harassment, bullying or victimisation should be raised with the Managing Director, [name], at [email] or [telephone].");
rich([{ t: "Where the concern is about the Managing Director, ", b: true }, { t: "it should be raised with [an independent route — name a non-executive, a retained adviser, or an external HR or employment law provider]. A company with one director must name that alternative route, because a grievance procedure whose only destination is the person complained about is not a procedure." }]);
fillIn("[Name the alternative route before issue. If none is retained, engage one — an external HR or employment law adviser on a call-off basis is inexpensive and this is the section an assessor tests.]");
p("Concerns are taken seriously, handled confidentially so far as investigation allows, and answered. Where a concern is upheld, the company acts — up to and including ending an engagement or a supply relationship.");
bullet("Nobody who raises a concern in good faith, or supports somebody else's, will be disadvantaged for doing so. That is not a courtesy: victimisation is itself unlawful under section 27.");
bullet("A person retains the right to bring a claim to an employment tribunal. Nothing in this policy restricts that right or requires an internal process to be exhausted first.");
bullet("Free, independent advice is available from ACAS, from Citizens Advice and from the Equality Advisory and Support Service, independently of this company.");

/* ---- 8 ---- */
h1("8. Training and awareness");
p("Stated honestly: with one working director there is no training programme, and claiming one would be the easiest sentence in this document to disprove.");
bullet("The Managing Director completes equality, diversity and inclusion training and refreshes it at least every [two] years. [Record the course, the provider and the date, or the booked date.]");
bullet("From the first engagement, this policy is issued at the start of every engagement and its standard stated, and equality and harassment awareness training is provided within the first [three] months.");
bullet("Where the company delivers site services, equality and dignity content is included in the site induction it specifies rather than left to each subcontractor.");

/* ---- 9 ---- */
h1("9. Monitoring — what is measured, and what is not");
rich([{ t: "No workforce composition data is published in this document, because there is no workforce to compose. ", b: true }, { t: "One working director is not a dataset, and a table of percentages derived from one person would be a fiction. Any applicant presenting diversity statistics on that basis should not be believed, and this company will not join them." }]);
p("From the first engagement, the following is recorded and reviewed at least annually. The first review after the first engagement reports it here.");
table([3400, 4900],
  ["What is recorded", "Why"],
  [
    ["Composition of applicants, and of those engaged", "The gap between the two is where a recruitment process is failing, and it is invisible without both numbers."],
    ["Adjustments requested, and whether each was made", "A duty that is never triggered is usually a duty nobody knows exists."],
    ["Concerns raised, and their outcome", "Zero concerns is not evidence of a healthy culture. It is equally consistent with nobody believing it is safe to raise one."],
    ["Supply chain composition, where suppliers volunteer it", "Voluntary, never a condition of selection."],
    ["Pay by role", "Gender pay gap reporting applies above 250 employees. Below it, checking pay for equal work is still the point."],
  ]);
p("Data collected for monitoring is anonymised, separated from any decision about an individual, held under the UK GDPR, and never used to make a selection decision.");

/* ---- 10 ---- */
h1("10. Responsibility and review");
p("The Managing Director owns this policy and is accountable for it. Until other people are engaged, every arrangement in it sits with that post and nowhere else.");
p("This policy is reviewed at least annually, and immediately on any change in the law, any material change in the size or work of the company, and any concern raised under section 7. Each review is dated on the cover, and each review asks the only question that matters: not whether the policy still reads well, but whether what it describes actually happened.");

/* ---- 11 ---- */
h1("11. What is not yet in place");
p("Stated plainly, because a reader will establish it anyway and the document that survives the check is the one that did not claim otherwise.");
bullet("No workforce, and therefore no diversity data. See section 9.");
bullet("No independent grievance route is retained. Section 7 names this as the gap to close first, and it is the one an assessor will test.");
bullet("No formal training programme, for the reason at section 8.");
bullet("No accreditation or charter membership is held — not Disability Confident, not the Armed Forces Covenant, not any equality standard — and none is claimed. [Record any intention with a date, or delete this bracket.]");
bullet("No pay gap reporting, because the company is far below the 250-employee threshold and has no pay data to report.");
note("Nothing in this section is a defect to be concealed. Each item is the correct answer for a company of this size today, each carries what changes it, and a reader who sees them stated will trust the rest of the document.");

approval();

d.build().catch((err) => { console.error(err); process.exit(1); });
