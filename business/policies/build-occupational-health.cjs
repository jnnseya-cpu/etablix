/**
 * ETABLIX — Management of Occupational Health, including mental health
 * and fatigue. Word and PDF.
 *
 *   node business/policies/build-occupational-health.cjs
 *
 * Written to be true of a company with one working director on the day it
 * is signed. It claims no occupational health provider, no employee
 * assistance programme and no health surveillance contract, because none
 * is in place; section 11 says so in terms. A selection-stage assessor can
 * verify a provider in one telephone call, and the document that survives
 * that call is the one that did not claim one.
 *
 * Section 7 is the part that is ours rather than generic. This company
 * specifies and manages worker accommodation, so its fatigue duty does not
 * stop at its own hours — it reaches the specification that decides whether
 * a night shift worker can sleep in the day.
 *
 * The house style, and why the PDF is not converted from the Word file,
 * are in brand.cjs.
 */
const B = require("./brand.cjs");

const REV = "1";
const ISSUE = "[date]";

const d = B.doc({
  slug: "Occupational-Health-Policy",
  running: "Management of Occupational Health",
  kicker: "MANAGEMENT OF",
  title: "OCCUPATIONAL HEALTH",
  sub: "including mental health and fatigue",
  rev: REV,
  control: [
    ["Document", "Management of Occupational Health, including mental health and fatigue"],
    ["Revision", REV],
    ["Date of issue", ISSUE],
    ["Next review", "[date of issue + 12 months]"],
    ["Owner", "[name], Managing Director"],
    ["Approved by", "[name], Managing Director"],
    ["Applies to", "Every person working for or on behalf of ETABLIX, on any site or premises"],
  ],
});
const { p, rich, h1, h2, bullet, richBullet, note, fillIn, table, pageBreak, approval } = d;

/* ---- 1 ---- */
h1("1. Statement of intent");
p("JNN GLOBAL LTD, trading as ETABLIX, accepts that its duty under section 2 of the Health and Safety at Work etc. Act 1974 is a duty to secure health as well as safety, and that health means physical and mental health together. This document sets out how that duty is discharged.");
p("Occupational ill health in construction is not an occasional event. It is a slow, cumulative and largely preventable loss, and it does its damage over years rather than in the moment an accident does. Hearing, lungs, hands, backs and minds are all injured on ordinary sites by ordinary work that nobody recorded as dangerous. This company treats health risk with the same seriousness as safety risk, and refuses to treat a condition as acceptable merely because it develops slowly.");
h2("What this company does, and what it does not do");
p("ETABLIX provides construction management, commercial and site-services consultancy: project management, employer's agent services, clerk of works inspection and CDM support. It does not carry out construction work, and it does not manage or control the way construction work is carried out on site unless it is expressly appointed in writing to do so.");
rich([
  { t: "The company does not accept the duties of Principal Contractor or Principal Designer under the Construction (Design and Management) Regulations 2015 by implication, by conduct or by silence.", b: true },
  { t: " Nothing in this document, and nothing in any report or inspection record the company issues, transfers a client's or a contractor's own statutory health duties to ETABLIX." },
]);
p("The company currently has one working director and no other employees. Every arrangement in this document is written to be true at that size, and section 10 states what changes as people are engaged.");
/* ---- 2 ---- */
h1("2. The legal framework this policy works to");
p("These are the obligations that bear on the work, applied as a minimum rather than treated as a target.");
table([3400, 4900],
  ["Instrument", "What it requires of us"],
  [
    ["Health and Safety at Work etc. Act 1974, s.2", "Ensure, so far as reasonably practicable, the health, safety and welfare at work of employees. Health includes mental health."],
    ["Management of H&S at Work Regulations 1999, reg 3", "Suitable and sufficient assessment of risks to health — which includes psychosocial risk, not only physical exposure."],
    ["Management Regulations 1999, reg 7", "Appoint competent persons to assist. Where competence is not held in-house it is obtained."],
    ["Working Time Regulations 1998", "Weekly working limit, rest breaks, daily and weekly rest, night work limits and free health assessment for night workers."],
    ["Control of Noise at Work Regulations 2005", "Assess and control noise exposure; health surveillance where exposure is above the upper action value."],
    ["Control of Vibration at Work Regulations 2005", "Assess hand-arm and whole-body vibration; health surveillance where exposure warrants it."],
    ["COSHH 2002", "Assess and control exposure to substances hazardous to health, including respirable crystalline silica, wood dust and cement."],
    ["Control of Asbestos Regulations 2012", "Asbestos awareness training for anyone liable to disturb asbestos-containing materials, before the work."],
    ["RIDDOR 2013", "Report specified occupational diseases where a written diagnosis is received and the work involves the associated exposure."],
    ["Equality Act 2010", "A long-term mental impairment with substantial adverse effect is a disability. Reasonable adjustments follow, and so does the prohibition on discrimination."],
    ["UK GDPR, Article 9", "Health data is special category personal data and is handled under section 9 of this document."],
  ]);

/* ---- 3 ---- */
h1("3. Health risk assessment");
p("A written health risk assessment is prepared for each type of activity the company undertakes, separately from the safety risk assessment, because a hazard that injures over ten years is invisible to an assessment written around what can go wrong today.");
p("Assessments cover, as a minimum: site inspection and attendance; travel and driving for work; lone working; display screen work; and psychosocial risk under section 6. Each is reviewed annually, after any incident or ill-health report, and whenever the activity changes.");
p("Site-specific health hazards are taken from the controlling contractor's own assessments and from the pre-construction information, which are requested before the first visit. Where that information is absent, its absence is itself recorded as a finding and raised with the client.");
h2("The exposures that matter on the sites we attend");
table([2400, 3100, 2800],
  ["Exposure", "Harm", "Our control while attending"],
  [
    ["Noise", "Noise-induced hearing loss, tinnitus — irreversible", "Hearing protection worn in designated zones; visits planned away from the noisiest operations where possible"],
    ["Hand-arm vibration", "HAVS, carpal tunnel syndrome — reportable", "Not applicable to our own activity; reported as a finding where controls on site are absent"],
    ["Respirable crystalline silica, and dust generally", "Silicosis, COPD, lung cancer", "Respiratory protection where required by the site; uncontrolled dry cutting reported on the day"],
    ["Asbestos-containing materials", "Mesothelioma, asbestosis, lung cancer", "Asbestos awareness training before attending refurbishment or demolition; no intrusive inspection without a current survey"],
    ["Musculoskeletal", "Back, shoulder and knee injury", "No manual handling in our scope; prolonged kneeling and ladder work avoided during inspection"],
    ["Cement and wet concrete", "Occupational dermatitis, chemical burns", "Gloves appropriate to the task; no contact with wet products"],
    ["Solar ultraviolet", "Skin cancer", "Covered clothing and sun protection on summer site attendance — a genuine construction exposure that is routinely ignored"],
    ["Cold, heat and weather", "Hypothermia, heat stress, reduced judgement", "Visits rescheduled rather than endured; welfare provision on site assessed as part of inspection"],
    ["Psychosocial", "Stress, anxiety, depression", "Section 6"],
    ["Fatigue", "Impaired judgement, collision risk, cumulative ill health", "Section 7"],
  ]);

/* ---- 4 ---- */
h1("4. Health surveillance");
p("Where a health risk assessment identifies an exposure for which health surveillance is required by law or is warranted by the level of exposure, surveillance is arranged before the exposure begins, not after it. Surveillance is delivered by a competent occupational health provider and never by the company itself.");
rich([{ t: "Current position. ", b: true }, { t: "The company's activity is short-duration attendance on sites controlled by others, and no exposure identified at section 3 currently reaches a level requiring statutory health surveillance. This is a conclusion from the assessment, not an assumption, and it is re-tested at every review and immediately on any change of scope." }]);
p("Two triggers change that position and are watched for specifically: any engagement placing a person on site for extended periods in a noise or dust environment, and the engagement of any employee or operative carrying out construction work rather than inspecting it. Either one brings surveillance into scope before the work starts.");
fillIn("[If an occupational health provider is retained, name them here with the services contracted. If none is retained, this section stands as written and says so. Do not name a provider that has not been engaged.]");
h2("Reporting occupational disease");
p("Where a written diagnosis of a disease specified in Schedule 3 to RIDDOR 2013 is received for any person working for the company, and the work involves the associated exposure, the disease is reported to the Health and Safety Executive without delay and the report reference is retained. The reportable diseases most relevant to this industry are carpal tunnel syndrome, cramp of the hand or forearm, occupational dermatitis, hand-arm vibration syndrome, occupational asthma, tendonitis of the hand or forearm, and any occupational cancer.");
p("Where a diagnosis relates to work carried out for a client on their site, the company also informs the client's duty holder in writing, because the exposure that caused it is unlikely to have been confined to one person.");
pageBreak();
/* ---- 5 ---- */
h1("5. Mental health — the position");
p("Mental health is health. The 1974 Act does not distinguish between the two, and neither does this company.");
p("Construction carries a well-documented burden of poor mental health and of suicide. The Office for National Statistics publishes analysis of suicide by occupation for England and Wales, and it has consistently found elevated rates among construction and building trades. Any figure quoted by this company is taken from the current ONS release and cited to it; no statistic appears in an ETABLIX document without a source a reader can check.");
note(
  "The conditions behind that are ordinary working conditions, not exceptional ones: insecure and self-employed work, " +
  "pay tied to output, long hours, long commutes, time away from home, a culture in which admitting difficulty is read " +
  "as admitting incapacity, and a workforce that is largely male and largely disinclined to seek help. None of these is " +
  "a personal failing and none of them is fixed by a poster.");

h2("The particular exposure at this company");
p("Honesty about the specific risk is more useful than a general commitment. A one-person consultancy carries a concentrated version of the industry's psychosocial risk:");
bullet("Isolation. Most site attendance is alone, and most working days contain no colleague to speak to.");
bullet("No separation between the person and the business. Commercial pressure, cash-flow pressure and professional criticism all land on the same individual, with no organisation to absorb any of it.");
bullet("Unbounded hours. There is nobody to send you home, and no shift that ends.");
bullet("Silence as the failure mode. A sole director who is struggling has no line manager who might notice, and the first visible sign is usually missed work rather than a conversation.");
p("Naming those is the control. The arrangements below exist because of them, and they apply to the Managing Director first.");
/* ---- 6 ---- */
h1("6. Managing psychosocial risk");
p("Work-related stress is assessed as a risk under regulation 3 of the Management Regulations, using the Health and Safety Executive's Management Standards. The six areas, and what each means here:");
table([1700, 3200, 3400],
  ["Standard", "The risk", "The arrangement"],
  [
    ["Demands", "Workload, pattern and environment beyond what a person can meet", "Engagements are accepted against capacity, not against appetite. Work that cannot be staffed is declined at enquiry."],
    ["Control", "No say over how the work is done", "Method and sequence are the practitioner's. Client deadlines are negotiated, not absorbed silently."],
    ["Support", "No encouragement, sponsorship or resource", "Named external contacts at section 8, and competent advice bought in rather than improvised."],
    ["Relationships", "Conflict, bullying, unacceptable behaviour", "Unacceptable behaviour from a client or on a site is raised in writing. An engagement will be ended over it."],
    ["Role", "Not knowing what is expected, or conflicting duties", "The written scope at the start of every engagement, and the CDM position stated in every appointment."],
    ["Change", "Poorly managed or communicated organisational change", "Changes to scope are agreed in writing before they take effect."],
  ]);

h2("What the company does in practice");
bullet("Every engagement begins with a written scope, because ambiguity about what is expected is the most reliable generator of stress in this work.");
bullet("Workload is reviewed against available working days monthly. Where forecast work exceeds capacity, work is declined or postponed rather than delivered at cost to health.");
bullet("Lone working arrangements at section 3.5 of the health and safety policy include a contact at the start and end of every site visit. That is a mental health control as much as a physical one.");
bullet("Deliberate contact with other people in the industry is treated as work, not as a break from it, because the isolation described above is the principal exposure.");
bullet("An unacceptable client relationship is ended. No engagement is worth the health of the person delivering it, and the company would rather lose the fee.");
h2("Where a person is struggling");
p("Anyone working for the company who is finding the work or anything else difficult should say so to the Managing Director, and will be met with practical adjustment rather than assessment. There is no requirement to explain a diagnosis and no requirement to disclose one.");
p("Adjustments that are available without argument, and which cost this company nothing: changed or reduced hours, a changed deadline negotiated with the client, work reallocated, time off, and a period where site attendance is not required. Where a person has a disability within the meaning of the Equality Act 2010, reasonable adjustments are a legal duty and are made as such.");
rich([
  { t: "What this company does not do. ", b: true },
  { t: "It does not diagnose, it does not counsel, and it does not treat. Those belong to clinicians. It does not require anybody to disclose a condition, and it does not treat a disclosure as a reason to reduce someone's work or standing. It will refer, adjust and pay for help, and it will keep the confidence." },
]);

h2("On other people's sites");
p("Where a person working for this company is concerned about the wellbeing of somebody on a site being visited, they should speak to that person if it is appropriate to do so, and raise it with the person in control of that site. The company does not manage another employer's workforce, but a concern that is not passed on is a concern that was not acted on. Say it, and record that it was said.");
pageBreak();
/* ---- 7 ---- */
h1("7. Fatigue");
p("Fatigue sits in this document rather than in the safety policy because it is both: it degrades judgement in the moment and it damages health over time. It is also the health risk this company is most likely to run on itself, because the hours belong to nobody but the person working them.");
h2("The limits that apply");
table([3400, 4900],
  ["Working Time Regulations 1998", "The limit"],
  [
    ["Weekly working time", "48 hours a week averaged over 17 weeks, unless an individual opt-out is signed. An opt-out is a choice, never a condition of engagement, and it is revocable."],
    ["Daily rest", "11 consecutive hours in each 24."],
    ["Weekly rest", "24 uninterrupted hours each week, or 48 hours each fortnight."],
    ["Rest breaks", "20 minutes uninterrupted where the day exceeds six hours."],
    ["Night work", "An average of 8 hours in each 24 over the reference period."],
    ["Night workers' health assessment", "A free health assessment before night work begins, and at regular intervals after."],
  ]);
note(
  "The Working Time Regulations set a floor, not a standard. Eleven hours between finishing on site in Scotland and " +
  "starting at a desk in Birmingham is legal and is not adequate. This company works to the rules below, which are " +
  "tighter than the Regulations in the places where the Regulations do not describe this work.");

h2("The company's own rules");
bullet("A working day including travel does not exceed [13] hours door to door. Where a visit cannot be done within that, it becomes an overnight stay. The cost of a hotel is lower than the cost of the alternative.");
bullet("Driving does not begin after [11] hours of combined work and travel. If that point is reached, the journey does not happen that day.");
bullet("No site attendance and no driving for work after a night of fewer than [6] hours' sleep. Nobody is asked to certify this; it is a rule the individual applies honestly.");
bullet("Journeys are planned so that site attendance does not require driving at the end of a full working day. Where that cannot be arranged, rail is used or the visit moves.");
bullet("No more than [6] consecutive days worked without a full day away from work.");
bullet("Hours are recorded. A pattern that is not recorded cannot be reviewed, and fatigue is cumulative rather than daily.");
fillIn("[Set each bracketed figure to what will genuinely be worked to, and then work to it. A limit stated at a level the company routinely breaches is worse than no limit, because it is evidence of a rule being ignored.]");
h2("Fatigue in what we specify for others");
p("This is the part of the duty that is specific to this company's scope, and it reaches further than its own hours.");
p("ETABLIX specifies and manages worker accommodation, welfare and site services. Where a workforce lives in accommodation this company has specified, the quality of that accommodation determines whether they can rest — and a workforce that cannot rest is a workforce whose judgement is impaired on a construction site the following morning. Fatigue management therefore begins at the specification, months before anybody arrives.");
richBullet([{ t: "Sleep, for night workers, happens in daylight. ", b: true }, { t: "Accommodation for a project running shifts is specified with effective blackout, acoustic separation from circulation and plant, and controllable ventilation and heating. A room that is adequate at night and unusable at two in the afternoon has failed for half the workforce." }]);
richBullet([{ t: "Travel to and from site is part of the working day. ", b: true }, { t: "Accommodation sited so that a shift begins with an hour on a minibus has added two hours to every day, and the programme was priced as though it had not." }]);
richBullet([{ t: "Catering hours have to match shift hours. ", b: true }, { t: "A canteen that closes before the late shift returns produces a workforce that eats badly and sleeps worse, and it is a specification defect rather than a catering one." }]);
richBullet([{ t: "Occupancy and rotation are a fatigue control. ", b: true }, { t: "Where the company manages accommodation, sustained over-occupancy and rotation patterns that erode rest are reported to the client as findings, in the same way a safety defect would be." }]);
h2("Fatigue observed on site");
p("Where a person attending on this company's behalf observes evidence of fatigue in a workforce — shift patterns without adequate rest, sustained excessive hours, people sleeping in vehicles, or a near miss whose most likely cause is tiredness — it is reported to the person in control of that site on the day, recorded with the time and the name of the person it was reported to, and escalated in writing to the client if it is not addressed. The company does not direct another employer's operatives; observation and report is the duty it holds, and it discharges it every time.");
/* ---- 8 ---- */
h1("8. Support available");
p("These are published, independent services. They are listed because a policy that describes a duty without naming a route to help has done half the job.");
table([2900, 2100, 3300],
  ["Service", "Contact", "What it is"],
  [
    ["Samaritans", "116 123, free, 24 hours", "Confidential emotional support, any time, including in a crisis."],
    ["Lighthouse Construction Industry Charity", "Helpline published at lighthouseclub.org", "The construction industry's own charity — emotional, physical and financial wellbeing support for construction workers and their families."],
    ["Mates in Mind", "matesinmind.org", "Construction-sector mental health awareness and training for organisations."],
    ["NHS 111", "111, option 2 for mental health", "Urgent NHS mental health help, 24 hours."],
    ["Emergency", "999", "Where there is an immediate risk to life."],
    ["General practitioner", "[practice]", "The route to diagnosis, treatment and referral, and the route to a fit note."],
  ]);
fillIn("[Verify each contact route before issue. A helpline number printed wrongly in a wellbeing policy is the worst possible error in this document, and it is the one nobody checks.]");
/* ---- 9 ---- */
h1("9. Health information, confidentiality and records");
p("Information about a person's health is special category personal data under Article 9 of the UK GDPR. It is handled accordingly.");
bullet("Health information disclosed to the company is held in confidence and is not shared without the individual's consent, save where there is an immediate risk to life or a legal obligation to disclose.");
bullet("Where health surveillance is carried out, the company receives the provider's fitness-for-work conclusion. It does not receive, ask for or retain clinical records.");
bullet("Health records are held separately from other personnel information, with access restricted to those who need it.");
bullet("Health surveillance records are retained for the periods required by the regulations under which they are made, and for at least 40 years where required for asbestos, noise or vibration surveillance.");
bullet("A disclosure of a mental health condition is not recorded as a performance matter and does not affect the allocation of work, except in the form of adjustments made at the individual's request.");
/* ---- 10 ---- */
h1("10. Responsibility, monitoring and review");
p("The Managing Director owns this document and is accountable for it. Until other people are engaged, every arrangement in it sits with that post and nowhere else. Competent assistance under regulation 7 of the Management Regulations is obtained externally where a question exceeds the company's own competence; it is referred, not guessed at.");
p("The register of planned hires includes an HSEQ and Assurance Manager. On that appointment, the arrangements in sections 3, 4, 6 and 7 transfer to that post and this document is reissued.");
p("The Managing Director reviews this document at least annually, and immediately after any report of work-related ill health, any occupational disease diagnosis, any change to the work, and any change in the law affecting it. Each review is dated on the cover. What is reviewed: ill-health and fatigue reports and their causes, hours actually worked against the limits at section 7, whether the arrangements were in fact followed, and what should change.");
/* ---- 11 ---- */
h1("11. What is not yet in place");
p("Stated plainly, because a reader will establish it anyway and the document that survives the check is the one that did not claim otherwise.");
bullet("No occupational health provider is retained. None is currently required by the health risk assessment at section 3, and one will be engaged before any engagement or appointment that brings health surveillance into scope.");
bullet("No employee assistance programme is in place. With one working director there is nobody to enrol; the independent services at section 8 are the route, and a programme will be put in place with the first employment.");
bullet("No mental health first aider is trained. [State the intention and the date, or state that the external routes at section 8 are relied on.]");
bullet("No health surveillance is being carried out, for the reason given at section 4.");
bullet("No sickness absence data exists, because there has been no workforce to generate it. It will be recorded and reviewed from the first engagement.");
note(
  "Nothing in this section is a defect to be concealed. Each item is the correct answer for a company of this size " +
  "today, each carries the trigger that changes it, and a reader who sees them stated trusts the rest of the document.");

approval();

d.build().catch((err) => { console.error(err); process.exit(1); });
