/**
 * ETABLIX — Health and Safety Policy and Arrangements. Word and PDF.
 *
 *   node business/policies/build-health-safety.cjs
 *
 * Section 2 of the Health and Safety at Work etc. Act 1974 does not require
 * an employer with fewer than five employees to record its policy in
 * writing. This one is written anyway, because the work happens on other
 * people's construction sites and a policy held in one person's head cannot
 * be audited, handed over or improved.
 *
 * Section 6 is the part that is ours rather than generic. This company
 * specifies compounds, temporary power, welfare and site logistics, and
 * those decisions determine the safety of a site for its whole life —
 * months before the first operative arrives.
 */
const B = require("./brand.cjs");

const REV = "1";
const d = B.doc({
  slug: "Health-and-Safety-Policy",
  running: "Health and Safety Policy",
  kicker: "HEALTH AND SAFETY",
  title: "POLICY",
  sub: "and arrangements",
  rev: REV,
  control: [
    ["Document", "Health and Safety Policy and Arrangements"],
    ["Revision", REV],
    ["Date of issue", "[date]"],
    ["Next review", "[date of issue + 12 months]"],
    ["Owner", "[name], Managing Director"],
    ["Approved by", "[name], Managing Director"],
    ["Applies to", "Every person working for or on behalf of ETABLIX, on any site or premises"],
  ],
});
const { p, rich, h1, h2, bullet, richBullet, note, fillIn, table, pageBreak, approval } = d;

/* 1 */
h1("1. Statement of intent");
p("JNN GLOBAL LTD, trading as ETABLIX, accepts its duties under the Health and Safety at Work etc. Act 1974 and the regulations made under it. It is the policy of this company to provide and maintain safe and healthy working conditions for every person engaged in its work, and to take all reasonably practicable steps to protect those who may be affected by it.");
p("The company currently has one working director and no other employees. Section 2(3) of the 1974 Act does not oblige an employer with fewer than five employees to record its policy in writing. It is recorded anyway, because the work is carried out on other people's construction sites, and because a policy that exists only in one person's head cannot be audited, handed over or improved.");

h2("What this company does, and what it does not do");
p("ETABLIX provides construction management, commercial and site-services consultancy: project management, employer's agent services, clerk of works inspection and CDM support. It does not carry out construction work, and it does not manage or control the way construction work is carried out on site unless it is expressly appointed in writing to do so.");
rich([
  { t: "The company does not accept the duties of Principal Contractor or Principal Designer under the Construction (Design and Management) Regulations 2015 by implication, by conduct or by silence.", b: true },
  { t: " Where a duty holder role is intended, it is stated in the appointment, priced, and accepted in writing only where the company is competent to discharge it under regulation 8." },
]);
p("Nothing in this policy, and nothing in any report, inspection record or advice the company issues, transfers a client's or a contractor's own statutory duties to ETABLIX.");

h2("The commitments");
bullet("Assess the risks arising from our own activities, and control them.");
bullet("Work only where we are competent, and decline work where we are not.");
bullet("Comply with the rules of every site we enter, and with the instructions of the contractor in control of it.");
bullet("Provide the information, instruction, training and equipment our people need.");
bullet("Report hazards we observe to the party able to control them, and record that we did so.");
bullet("Investigate incidents and act on what they show.");
bullet("Review this policy at least annually and whenever the work changes.");
note("This policy never states that a site is safe, that a system is compliant, or that a risk has been eliminated. It states what is assessed, what is controlled, who holds each duty, and what is not yet in place. A safety document that reassures is a safety document that has stopped working.");

/* 2 */
h1("2. The legal framework this policy works to");
table([3300, 5000],
  ["Instrument", "What it requires of us"],
  [
    ["HSWA 1974, s.2", "Ensure, so far as reasonably practicable, the health, safety and welfare at work of employees."],
    ["HSWA 1974, s.3", "Conduct the undertaking so that persons not in our employment are not exposed to risk — the section that bites hardest on a consultancy working on other people's sites."],
    ["HSWA 1974, s.7", "Every person takes reasonable care for their own safety and that of others affected by what they do."],
    ["MHSWR 1999, regs 3, 7, 10, 13", "Risk assessment; competent assistance; information to workers; capability and training before work is assigned."],
    ["CDM 2015", "Duty holder roles, competence under reg 8, pre-construction information, the construction phase plan, the health and safety file, and Schedule 2 welfare."],
    ["Work at Height Regulations 2005", "Avoid work at height where reasonably practicable; where not, prevent falls before mitigating them."],
    ["PUWER 1998 and LOLER 1998", "Work equipment suitable, maintained and used by trained people; lifting equipment examined."],
    ["Electricity at Work Regulations 1989", "Temporary electrical systems constructed, maintained and worked on safely."],
    ["PPE at Work Regulations 1992, as amended 2022", "Suitable protective equipment provided free — the 2022 amendment extends the duty beyond employees to limb (b) workers."],
    ["RIDDOR 2013", "Report specified injuries, dangerous occurrences and occupational diseases."],
    ["Health and Safety (First-Aid) Regulations 1981", "First aid provision proportionate to the work and the people."],
    ["Employers' Liability (Compulsory Insurance) Act 1969", "Cover required once there is an employee other than a sole director holding 50% or more of the shares."],
    ["Corporate Manslaughter and Corporate Homicide Act 2007", "An organisation can be prosecuted where the way its activities are managed causes death and amounts to a gross breach."],
  ]);

/* 3 */
h1("3. Organisation and responsibilities");
rich([{ t: "Managing Director — [name]. ", b: true }, { t: "Holds overall and final responsibility for health and safety. Personally responsible, until the company appoints others, for risk assessment, competence and training, the site visit procedure, the selection and monitoring of any subcontractor or associate, incident investigation and reporting, and the review of this policy. Holds the authority to stop or refuse any work on health and safety grounds, and will exercise it." }]);
rich([{ t: "All persons working for or on behalf of the company — ", b: true }, { t: "take reasonable care for their own safety and that of others, use the equipment and protective equipment provided, follow site rules and inductions, report hazards, near misses and incidents without delay, and never proceed with work they believe to be unsafe. Nobody will be criticised for stopping work on safety grounds, and nobody will be asked to justify it afterwards." }]);
h2("Competent advice");
p("The company does not employ a health and safety professional. Competent assistance under regulation 7 of the Management Regulations is obtained from [named consultant or retained adviser — name them, or state \"will be retained before the first site appointment\"]. Where a question exceeds the company's own competence it is referred, not guessed at.");
fillIn("[Name the adviser before issue, or state the trigger and date. Regulation 7 is not satisfied by intending to appoint somebody.]");
p("The register of planned hires includes an HSEQ and Assurance Manager. On that appointment the arrangements at section 4 transfer to that post and this policy is reissued. Until then they sit with the Managing Director and nowhere else.");

pageBreak();

/* 4 */
h1("4. Arrangements");

h2("4.1 Risk assessment");
p("A written risk assessment is prepared for each type of activity the company undertakes: site inspection visits, site meetings, lone working, driving on business, and display screen work. Assessments are reviewed annually, after any incident, and whenever the activity changes. Site-specific hazards are taken from the controlling contractor's assessments and method statements, which are requested before the first visit; where they are not provided, that absence is recorded as a finding and raised with the client.");

h2("4.2 Site visits");
p("Before a first visit the company obtains and reads the site rules, the induction requirements and the access arrangements. On arrival the person signs in, completes the induction, and works within the permit and escort regime that site operates. No area is entered without the permission of the contractor in control of it. Where a site declines to induct, the visit does not take place.");

h2("4.3 Personal protective equipment");
p("Provided by the company at no cost and worn as a minimum on every operational site: safety helmet to EN 397, eye protection to EN 166, high visibility clothing to EN ISO 20471 class 2 or as the site requires, safety footwear to EN ISO 20345 with toe and midsole protection, and gloves appropriate to the task. Additional protection required by the site is worn where the wearer has been trained and the equipment face-fit tested or inspected as applicable. Equipment is inspected before each use and replaced when damaged or out of date.");
rich([{ t: "Equipment is issued to fit the person, not the average. ", b: true }, { t: "Protective equipment that does not fit does not protect, and ill-fitting equipment falls disproportionately on particular groups. Where correctly fitting equipment is not available for somebody, the work does not proceed until it is. This is also section 4 of the equality, diversity and inclusion policy, and it is the same commitment stated in both places deliberately." }]);

h2("4.4 Competence and training");
p("Records are kept for every person working for the company of: CSCS or equivalent card and its expiry, site safety training, first aid, asbestos awareness, and any site-specific or client-specific requirement. A person does not attend a site without the card that site requires. Training needs are reviewed annually and on every change of role.");
fillIn("[List the cards and certificates actually held, with expiry dates. Where one is not yet held, say so and give the booked date. Do not list a qualification that has not been awarded — it is checkable in minutes.]");

h2("4.5 Lone working");
p("Most site attendance is by one person. Before each visit the expected arrival and departure times and the site contact are recorded and shared with [named person or arrangement]. Contact is made on arrival and on leaving. If contact is not made within [30] minutes of the expected departure time, [named person] telephones the site contact and then the emergency services if the person cannot be reached. A charged mobile telephone is carried at all times.");

h2("4.6 Driving on business, and fatigue");
p("Licence, business-use insurance, MOT and roadworthiness are checked annually and recorded. Journeys are planned so that site attendance does not require driving at the end of a full working day. Mobile telephones are not used while driving, hands-free included, for work calls.");
p("Fatigue is managed under the occupational health policy, which sets the working-day, driving and rest limits this company works to. Those limits are tighter than the Working Time Regulations in the places where the Regulations do not describe this work, and they are a safety control as much as a health one.");

h2("4.7 Accidents, incidents and near misses");
p("All accidents, incidents, near misses and dangerous occurrences are recorded, whether or not anyone was injured, and whether they happened to our own person or were observed. Anything reportable under RIDDOR 2013 is reported by the duty holder responsible; the company confirms the report was made and records the reference. Every incident is investigated for cause, and the finding feeds back into the risk assessments.");
note("A near miss register that is empty is not evidence of a safe operation. It is equally consistent with nobody recording anything, and that is the more common explanation.");

h2("4.8 Unsafe conditions observed on other people's sites");
p("The company's people are on site to inspect, manage and report. Where an unsafe condition or act is observed, the person:");
bullet("stops any work they personally control;");
bullet("reports it immediately to the person in control of that site;");
bullet("records the observation, the time, and who it was reported to;");
bullet("escalates in writing to the client if it is not addressed.");
p("The company does not direct other employers' operatives and does not assume control of their work. Observation and report is the duty it holds under section 3 of the 1974 Act, and it discharges it every time. A hazard seen and not reported is the one failure this policy treats as unforgivable.");

h2("4.9 First aid and emergencies");
p("The company relies on the first aid provision of the site being visited, identified at induction. [Name] holds [first aid at work / emergency first aid at work / no] certification, expiring [date]. A first aid kit is carried in the vehicle. Emergency arrangements, assembly points and alarm signals are taken from each site's induction and confirmed on arrival rather than assumed.");

h2("4.10 Subcontractors and associates");
p("Anyone engaged to work for or on behalf of the company is selected against their competence, their own health and safety arrangements, their insurance and their record. Evidence is obtained before engagement and held on file, and performance is monitored on the work. The company does not engage anyone on price alone.");

h2("4.11 Consultation");
p("With one working director, consultation is direct. As people are engaged they will be consulted on health and safety matters affecting them under the Health and Safety (Consultation with Employees) Regulations 1996, and this section is reissued to say how.");

h2("4.12 Insurance");
fillIn("[State the position honestly. Employers' liability insurance is compulsory once there is an employee other than a sole director holding 50% or more of the shares. Put the public liability and professional indemnity limits here when bound, taken from the policy schedule. If cover is not yet in place, say so and say when it will be. Do not omit this section and do not state a limit that is not on a schedule.]");

pageBreak();

/* 5 */
h1("5. CDM 2015 — where this company sits");
p("CDM allocates duties to the client, the principal designer, designers, the principal contractor, contractors and workers. This company may hold some of those and will never hold others by accident.");
table([2600, 5700],
  ["Role", "Our position"],
  [
    ["Client", "Never. We may advise a client on its regulation 4 duties; the duties remain the client's."],
    ["Principal Designer", "Only by express written appointment, only where we pass the regulation 8 competence test for that scheme, and only where the role is priced for the design co-ordination it requires."],
    ["Designer", "Only where we actually prepare or modify a design. Producing a specification or an employer's requirements document can constitute design, and where it does we say so and accept the duty."],
    ["Principal Contractor", "Never. This company does not manage or control construction work."],
    ["Contractor", "Never under the consultancy appointments this policy covers."],
    ["CDM adviser", "Frequently — supporting a client in discharging its own duties. This is advice and is not a duty holder role."],
  ]);
p("Every appointment states which of these applies. Where a client's documents describe our role in terms that would import a duty we have not accepted, we correct the documents before signing rather than after an incident.");

/* 6 */
h1("6. What we specify for others");
p("This is the section that is specific to this company, and it is where the largest safety influence available to us is exercised.");
p("ETABLIX specifies and manages site establishment: the compound, temporary power and water, welfare, lighting, waste, security, logistics and accommodation. Those decisions are made months before the first operative arrives, and they determine how safe the site is for its whole life. A hazard designed into a compound layout is one that everybody on that site lives with for the duration, and no amount of supervision afterwards removes it.");
richBullet([{ t: "Pedestrian and vehicle segregation. ", b: true }, { t: "Specified into the compound layout and the traffic management plan from the first drawing — separate gates where practicable, defined crossing points, and a one-way circuit that does not require reversing. Reversing vehicles remain one of the largest causes of death on construction sites, and the layout is where that is decided." }]);
richBullet([{ t: "Temporary electrical distribution. ", b: true }, { t: "Specified with the distribution designed rather than accumulated: rated, protected, inspected, and sized for the actual load rather than the load originally assumed. A generator sized from a superseded load schedule is a defect that grows quietly for the whole project." }]);
richBullet([{ t: "Lighting. ", b: true }, { t: "Specified for the routes people actually walk in winter and at shift change, not only for the work faces. Most slips, trips and falls on a compound happen on an unlit route somebody took because it was shorter." }]);
richBullet([{ t: "Welfare siting. ", b: true }, { t: "Schedule 2 of CDM 2015 sets what must be provided. Where it is provided decides whether it is used: facilities that cost most of a break in walking are facilities people stop using, and a workforce that stops washing before eating is a health outcome that was specified." }]);
richBullet([{ t: "Emergency access and fire. ", b: true }, { t: "Access for emergency vehicles, muster points, and the fire separation and alarm coverage of cabins and accommodation, specified and then checked against what was actually installed." }]);
richBullet([{ t: "Interfaces. ", b: true }, { t: "Most site-establishment incidents happen at a boundary nobody owned — between the cabin supplier, the electrical contractor, the civils contractor and the client. The interface register names an owner for each boundary, which is the single most useful safety document this company produces and is rarely recognised as one." }]);

/* 7 */
h1("7. Monitoring and review");
p("The Managing Director reviews this policy at least annually, and immediately after any incident, any change in the work, or any change in the law affecting it. Each review is dated on the cover. What is reviewed: incidents and near misses and their causes, whether the arrangements were actually followed, training and card expiries, and what should change.");
p("Incident records, risk assessments and training records are kept for the statutory minimum period applicable and in any event for at least six years. Records relating to health surveillance are kept for the far longer periods set out in the occupational health policy.");

/* 8 */
h1("8. What is not yet in place");
bullet("No health and safety adviser is retained. Section 3 names this as the first thing to close, and regulation 7 is not satisfied by an intention.");
bullet("No SSIP accreditation is held — not SafeContractor, not Acclaim, not CHAS — and none is claimed. [State the application date or delete this bracket.]");
bullet("No ISO 45001 certification is held and none is claimed.");
bullet("No accident or near miss data exists, because there has been no workforce to generate it. Both will be recorded from the first engagement.");
bullet("No employers' liability insurance, for the reason at section 4.12. It becomes compulsory on the first employment and will be in place before it.");
note("Each of these is the correct answer for a company of this size today, and each carries the trigger that changes it. An assessor can verify an SSIP registration in one search, and the document that survives that search is the one that never claimed the accreditation.");

approval();
d.build().catch((err) => { console.error(err); process.exit(1); });
