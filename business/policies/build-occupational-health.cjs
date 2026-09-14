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
 * The fatigue section is the part that is ours rather than generic. This
 * company specifies and manages worker accommodation, so its fatigue duty
 * does not stop at its own hours — it extends to whether the accommodation
 * it specifies allows a night shift worker to sleep in the day.
 */
const fs = require("fs");
const path = require("path");
const D = require("/tmp/claude-0/-home-user-etablix/fe91c2e4-7425-5fd0-aa86-a0a156d734f1/scratchpad/docxlib/node_modules/docx");
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        WidthType, ShadingType, BorderStyle, PageBreak, Header, Footer,
        PageNumber, AlignmentType, LevelFormat, HeadingLevel } = D;

const INK = "14181D", GOLD = "9C7A3C", SLATE = "5B6672", PAPER = "F2EFE7", TINT = "EFE6D2";
const F = "Arial";
const OUT_DOCX = path.join(__dirname, "ETABLIX-Occupational-Health-Policy.docx");
const OUT_HTML = path.join(__dirname, ".oh.html");
const OUT_PDF  = path.join(__dirname, "ETABLIX-Occupational-Health-Policy.pdf");

/* The blocks below are recorded as data as well as rendered, so the Word file
 * and the PDF are produced from one source and cannot disagree. LibreOffice in
 * this environment has no Writer module and cannot read a .docx at all, so the
 * PDF is printed from HTML by Chromium rather than converted from the Word
 * file. Two renderers, one content list. */
const BLOCKS = [];
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const rec = (kind, data, node) => { BLOCKS.push({ kind, ...data }); return node; };

const REV = "1";
const ISSUE = "[date]";

/* ---------- primitives ---------- */
const p = (text, o = {}) => rec('p', { text, o }, new Paragraph({
  spacing: { before: o.before ?? 90, after: o.after ?? 90, line: 280 },
  alignment: o.align,
  keepNext: o.keepNext,
  border: o.rule ? { bottom: { style: BorderStyle.SINGLE, size: 6, color: GOLD, space: 6 } } : undefined,
  children: [new TextRun({ text, font: F, size: o.size ?? 20, bold: o.bold,
                           italics: o.italics, color: o.color ?? INK })],
}));

const rich = (runs, o = {}) => rec('rich', { runs, o }, new Paragraph({
  spacing: { before: o.before ?? 90, after: o.after ?? 90, line: 280 },
  alignment: o.align,
  children: runs.map((r) => new TextRun({ text: r.t, font: F, size: o.size ?? 20,
    bold: r.b, italics: r.i, color: r.c ?? INK })),
}));

const h1 = (text) => rec('h1', { text }, new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 380, after: 150 },
  keepNext: true,
  border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: GOLD, space: 6 } },
  children: [new TextRun({ text, font: F, size: 26, bold: true, color: INK })],
}));

const h2 = (text) => rec('h2', { text }, new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 260, after: 110 },
  keepNext: true,
  children: [new TextRun({ text, font: F, size: 21, bold: true, color: GOLD })],
}));

const bullet = (text, o = {}) => rec('bullet', { text, o }, new Paragraph({
  numbering: { reference: "etx-bullets", level: 0 },
  spacing: { before: 50, after: 50, line: 280 },
  children: [new TextRun({ text, font: F, size: 20, bold: o.bold, color: INK })],
}));

const richBullet = (runs) => rec('richBullet', { runs }, new Paragraph({
  numbering: { reference: "etx-bullets", level: 0 },
  spacing: { before: 50, after: 50, line: 280 },
  children: runs.map((r) => new TextRun({ text: r.t, font: F, size: 20, bold: r.b, italics: r.i, color: r.c ?? INK })),
}));

const note = (text) => rec('note', { text }, new Paragraph({
  spacing: { before: 150, after: 150, line: 280 },
  shading: { type: ShadingType.CLEAR, fill: TINT, color: "auto" },
  border: { left: { style: BorderStyle.SINGLE, size: 18, color: GOLD, space: 10 } },
  indent: { left: 170, right: 170 },
  children: [new TextRun({ text, font: F, size: 19, color: INK })],
}));

const fill = (text) => rec('fill', { text }, new Paragraph({
  spacing: { before: 90, after: 90, line: 280 },
  indent: { left: 170 },
  children: [new TextRun({ text, font: F, size: 19, italics: true, color: SLATE })],
}));

/* ---------- tables ---------- */
const cell = (text, o = {}) => new TableCell({
  width: { size: o.w, type: WidthType.DXA },
  shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill, color: "auto" } : undefined,
  margins: { top: 70, bottom: 70, left: 110, right: 110 },
  children: [new Paragraph({
    spacing: { before: 0, after: 0, line: 250 },
    children: [new TextRun({ text, font: F, size: o.size ?? 18, bold: o.bold,
                             color: o.color ?? INK })],
  })],
});

const table = (widths, head, rows) => rec('table', { head, rows }, new Table({
  width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
  columnWidths: widths,
  rows: [
    new TableRow({ tableHeader: true,
      children: head.map((t, i) => cell(t, { w: widths[i], bold: true, fill: INK, color: "FFFFFF", size: 17 })) }),
    ...rows.map((r, ri) => new TableRow({
      children: r.map((t, i) => cell(t, { w: widths[i], fill: ri % 2 ? PAPER : undefined })) })),
  ],
}));

/* ===CONTENT=== */
const body = [];

/* ---- cover ---- */
body.push(rec('brand', {}, new Paragraph({ spacing: { before: 900, after: 0 },
  children: [new TextRun({ text: "ETABLIX", font: F, size: 56, bold: true, color: INK })] })));
body.push(rec('strap', {}, new Paragraph({ spacing: { before: 0, after: 60 },
  children: [new TextRun({ text: "INTEGRATED SITE SERVICES", font: F, size: 18, bold: true, color: GOLD })] })));
body.push(p("A trading name of JNN GLOBAL LTD · Company number 15405437", { size: 18, color: SLATE, rule: true, after: 380 }));

body.push(rec('kicker', { text: "MANAGEMENT OF" }, new Paragraph({ spacing: { before: 260, after: 0 },
  children: [new TextRun({ text: "MANAGEMENT OF", font: F, size: 30, bold: true, color: GOLD })] })));
body.push(rec('title', { text: "OCCUPATIONAL HEALTH" }, new Paragraph({ spacing: { before: 0, after: 0 },
  children: [new TextRun({ text: "OCCUPATIONAL HEALTH", font: F, size: 44, bold: true, color: INK })] })));
body.push(rec('sub', { text: "including mental health and fatigue" }, new Paragraph({ spacing: { before: 60, after: 420 },
  children: [new TextRun({ text: "including mental health and fatigue", font: F, size: 26, color: SLATE })] })));

body.push(table([2300, 6000],
  ["", ""],
  [
    ["Document", "Management of Occupational Health, including mental health and fatigue"],
    ["Revision", REV],
    ["Date of issue", ISSUE],
    ["Next review", "[date of issue + 12 months]"],
    ["Owner", "[name], Managing Director"],
    ["Approved by", "[name], Managing Director"],
    ["Applies to", "Every person working for or on behalf of ETABLIX, on any site or premises"],
  ]));

body.push(p("", { after: 300 }));
body.push(note(
  "This document is issued in draft until every bracketed field is completed and it is signed and dated. " +
  "An unsigned, undated policy is treated at a selection stage as a draft, and a draft evidences nothing."));

body.push(rec('break', {}, new Paragraph({ children: [new PageBreak()] })));

/* ---- 1 ---- */
body.push(h1("1. Statement of intent"));
body.push(p("JNN GLOBAL LTD, trading as ETABLIX, accepts that its duty under section 2 of the Health and Safety at Work etc. Act 1974 is a duty to secure health as well as safety, and that health means physical and mental health together. This document sets out how that duty is discharged."));
body.push(p("Occupational ill health in construction is not an occasional event. It is a slow, cumulative and largely preventable loss, and it does its damage over years rather than in the moment an accident does. Hearing, lungs, hands, backs and minds are all injured on ordinary sites by ordinary work that nobody recorded as dangerous. This company treats health risk with the same seriousness as safety risk, and refuses to treat a condition as acceptable merely because it develops slowly."));

body.push(h2("What this company does, and what it does not do"));
body.push(p("ETABLIX provides construction management, commercial and site-services consultancy: project management, employer's agent services, clerk of works inspection and CDM support. It does not carry out construction work, and it does not manage or control the way construction work is carried out on site unless it is expressly appointed in writing to do so."));
body.push(rich([
  { t: "The company does not accept the duties of Principal Contractor or Principal Designer under the Construction (Design and Management) Regulations 2015 by implication, by conduct or by silence.", b: true },
  { t: " Nothing in this document, and nothing in any report or inspection record the company issues, transfers a client's or a contractor's own statutory health duties to ETABLIX." },
]));
body.push(p("The company currently has one working director and no other employees. Every arrangement in this document is written to be true at that size, and section 10 states what changes as people are engaged."));

/* ---- 2 ---- */
body.push(h1("2. The legal framework this policy works to"));
body.push(p("These are the obligations that bear on the work, applied as a minimum rather than treated as a target."));
body.push(table([3400, 4900],
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
  ]));

/* ---- 3 ---- */
body.push(h1("3. Health risk assessment"));
body.push(p("A written health risk assessment is prepared for each type of activity the company undertakes, separately from the safety risk assessment, because a hazard that injures over ten years is invisible to an assessment written around what can go wrong today."));
body.push(p("Assessments cover, as a minimum: site inspection and attendance; travel and driving for work; lone working; display screen work; and psychosocial risk under section 6. Each is reviewed annually, after any incident or ill-health report, and whenever the activity changes."));
body.push(p("Site-specific health hazards are taken from the controlling contractor's own assessments and from the pre-construction information, which are requested before the first visit. Where that information is absent, its absence is itself recorded as a finding and raised with the client."));

body.push(h2("The exposures that matter on the sites we attend"));
body.push(table([2400, 3100, 2800],
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
  ]));

/* ---- 4 ---- */
body.push(h1("4. Health surveillance"));
body.push(p("Where a health risk assessment identifies an exposure for which health surveillance is required by law or is warranted by the level of exposure, surveillance is arranged before the exposure begins, not after it. Surveillance is delivered by a competent occupational health provider and never by the company itself."));
body.push(rich([{ t: "Current position. ", b: true }, { t: "The company's activity is short-duration attendance on sites controlled by others, and no exposure identified at section 3 currently reaches a level requiring statutory health surveillance. This is a conclusion from the assessment, not an assumption, and it is re-tested at every review and immediately on any change of scope." }]));
body.push(p("Two triggers change that position and are watched for specifically: any engagement placing a person on site for extended periods in a noise or dust environment, and the engagement of any employee or operative carrying out construction work rather than inspecting it. Either one brings surveillance into scope before the work starts."));
body.push(fill("[If an occupational health provider is retained, name them here with the services contracted. If none is retained, this section stands as written and says so. Do not name a provider that has not been engaged.]"));

body.push(h2("Reporting occupational disease"));
body.push(p("Where a written diagnosis of a disease specified in Schedule 3 to RIDDOR 2013 is received for any person working for the company, and the work involves the associated exposure, the disease is reported to the Health and Safety Executive without delay and the report reference is retained. The reportable diseases most relevant to this industry are carpal tunnel syndrome, cramp of the hand or forearm, occupational dermatitis, hand-arm vibration syndrome, occupational asthma, tendonitis of the hand or forearm, and any occupational cancer."));
body.push(p("Where a diagnosis relates to work carried out for a client on their site, the company also informs the client's duty holder in writing, because the exposure that caused it is unlikely to have been confined to one person."));

body.push(rec('break', {}, new Paragraph({ children: [new PageBreak()] })));

/* ---- 5 ---- */
body.push(h1("5. Mental health — the position"));
body.push(p("Mental health is health. The 1974 Act does not distinguish between the two, and neither does this company."));
body.push(p("Construction carries a well-documented burden of poor mental health and of suicide. The Office for National Statistics publishes analysis of suicide by occupation for England and Wales, and it has consistently found elevated rates among construction and building trades. Any figure quoted by this company is taken from the current ONS release and cited to it; no statistic appears in an ETABLIX document without a source a reader can check."));
body.push(note(
  "The conditions behind that are ordinary working conditions, not exceptional ones: insecure and self-employed work, " +
  "pay tied to output, long hours, long commutes, time away from home, a culture in which admitting difficulty is read " +
  "as admitting incapacity, and a workforce that is largely male and largely disinclined to seek help. None of these is " +
  "a personal failing and none of them is fixed by a poster."));

body.push(h2("The particular exposure at this company"));
body.push(p("Honesty about the specific risk is more useful than a general commitment. A one-person consultancy carries a concentrated version of the industry's psychosocial risk:"));
body.push(bullet("Isolation. Most site attendance is alone, and most working days contain no colleague to speak to."));
body.push(bullet("No separation between the person and the business. Commercial pressure, cash-flow pressure and professional criticism all land on the same individual, with no organisation to absorb any of it."));
body.push(bullet("Unbounded hours. There is nobody to send you home, and no shift that ends."));
body.push(bullet("Silence as the failure mode. A sole director who is struggling has no line manager who might notice, and the first visible sign is usually missed work rather than a conversation."));
body.push(p("Naming those is the control. The arrangements below exist because of them, and they apply to the Managing Director first."));

/* ---- 6 ---- */
body.push(h1("6. Managing psychosocial risk"));
body.push(p("Work-related stress is assessed as a risk under regulation 3 of the Management Regulations, using the Health and Safety Executive's Management Standards. The six areas, and what each means here:"));
body.push(table([1700, 3200, 3400],
  ["Standard", "The risk", "The arrangement"],
  [
    ["Demands", "Workload, pattern and environment beyond what a person can meet", "Engagements are accepted against capacity, not against appetite. Work that cannot be staffed is declined at enquiry."],
    ["Control", "No say over how the work is done", "Method and sequence are the practitioner's. Client deadlines are negotiated, not absorbed silently."],
    ["Support", "No encouragement, sponsorship or resource", "Named external contacts at section 8, and competent advice bought in rather than improvised."],
    ["Relationships", "Conflict, bullying, unacceptable behaviour", "Unacceptable behaviour from a client or on a site is raised in writing. An engagement will be ended over it."],
    ["Role", "Not knowing what is expected, or conflicting duties", "The written scope at the start of every engagement, and the CDM position stated in every appointment."],
    ["Change", "Poorly managed or communicated organisational change", "Changes to scope are agreed in writing before they take effect."],
  ]));

body.push(h2("What the company does in practice"));
body.push(bullet("Every engagement begins with a written scope, because ambiguity about what is expected is the most reliable generator of stress in this work."));
body.push(bullet("Workload is reviewed against available working days monthly. Where forecast work exceeds capacity, work is declined or postponed rather than delivered at cost to health."));
body.push(bullet("Lone working arrangements at section 3.5 of the health and safety policy include a contact at the start and end of every site visit. That is a mental health control as much as a physical one."));
body.push(bullet("Deliberate contact with other people in the industry is treated as work, not as a break from it, because the isolation described above is the principal exposure."));
body.push(bullet("An unacceptable client relationship is ended. No engagement is worth the health of the person delivering it, and the company would rather lose the fee."));

body.push(h2("Where a person is struggling"));
body.push(p("Anyone working for the company who is finding the work or anything else difficult should say so to the Managing Director, and will be met with practical adjustment rather than assessment. There is no requirement to explain a diagnosis and no requirement to disclose one."));
body.push(p("Adjustments that are available without argument, and which cost this company nothing: changed or reduced hours, a changed deadline negotiated with the client, work reallocated, time off, and a period where site attendance is not required. Where a person has a disability within the meaning of the Equality Act 2010, reasonable adjustments are a legal duty and are made as such."));
body.push(rich([
  { t: "What this company does not do. ", b: true },
  { t: "It does not diagnose, it does not counsel, and it does not treat. Those belong to clinicians. It does not require anybody to disclose a condition, and it does not treat a disclosure as a reason to reduce someone's work or standing. It will refer, adjust and pay for help, and it will keep the confidence." },
]));

body.push(h2("On other people's sites"));
body.push(p("Where a person working for this company is concerned about the wellbeing of somebody on a site being visited, they should speak to that person if it is appropriate to do so, and raise it with the person in control of that site. The company does not manage another employer's workforce, but a concern that is not passed on is a concern that was not acted on. Say it, and record that it was said."));

body.push(rec('break', {}, new Paragraph({ children: [new PageBreak()] })));

/* ---- 7 ---- */
body.push(h1("7. Fatigue"));
body.push(p("Fatigue sits in this document rather than in the safety policy because it is both: it degrades judgement in the moment and it damages health over time. It is also the health risk this company is most likely to run on itself, because the hours belong to nobody but the person working them."));

body.push(h2("The limits that apply"));
body.push(table([3400, 4900],
  ["Working Time Regulations 1998", "The limit"],
  [
    ["Weekly working time", "48 hours a week averaged over 17 weeks, unless an individual opt-out is signed. An opt-out is a choice, never a condition of engagement, and it is revocable."],
    ["Daily rest", "11 consecutive hours in each 24."],
    ["Weekly rest", "24 uninterrupted hours each week, or 48 hours each fortnight."],
    ["Rest breaks", "20 minutes uninterrupted where the day exceeds six hours."],
    ["Night work", "An average of 8 hours in each 24 over the reference period."],
    ["Night workers' health assessment", "A free health assessment before night work begins, and at regular intervals after."],
  ]));
body.push(note(
  "The Working Time Regulations set a floor, not a standard. Eleven hours between finishing on site in Scotland and " +
  "starting at a desk in Birmingham is legal and is not adequate. This company works to the rules below, which are " +
  "tighter than the Regulations in the places where the Regulations do not describe this work."));

body.push(h2("The company's own rules"));
body.push(bullet("A working day including travel does not exceed [13] hours door to door. Where a visit cannot be done within that, it becomes an overnight stay. The cost of a hotel is lower than the cost of the alternative."));
body.push(bullet("Driving does not begin after [11] hours of combined work and travel. If that point is reached, the journey does not happen that day."));
body.push(bullet("No site attendance and no driving for work after a night of fewer than [6] hours' sleep. Nobody is asked to certify this; it is a rule the individual applies honestly."));
body.push(bullet("Journeys are planned so that site attendance does not require driving at the end of a full working day. Where that cannot be arranged, rail is used or the visit moves."));
body.push(bullet("No more than [6] consecutive days worked without a full day away from work."));
body.push(bullet("Hours are recorded. A pattern that is not recorded cannot be reviewed, and fatigue is cumulative rather than daily."));
body.push(fill("[Set each bracketed figure to what will genuinely be worked to, and then work to it. A limit stated at a level the company routinely breaches is worse than no limit, because it is evidence of a rule being ignored.]"));

body.push(h2("Fatigue in what we specify for others"));
body.push(p("This is the part of the duty that is specific to this company's scope, and it reaches further than its own hours."));
body.push(p("ETABLIX specifies and manages worker accommodation, welfare and site services. Where a workforce lives in accommodation this company has specified, the quality of that accommodation determines whether they can rest — and a workforce that cannot rest is a workforce whose judgement is impaired on a construction site the following morning. Fatigue management therefore begins at the specification, months before anybody arrives."));
body.push(richBullet([{ t: "Sleep, for night workers, happens in daylight. ", b: true }, { t: "Accommodation for a project running shifts is specified with effective blackout, acoustic separation from circulation and plant, and controllable ventilation and heating. A room that is adequate at night and unusable at two in the afternoon has failed for half the workforce." }]));
body.push(richBullet([{ t: "Travel to and from site is part of the working day. ", b: true }, { t: "Accommodation sited so that a shift begins with an hour on a minibus has added two hours to every day, and the programme was priced as though it had not." }]));
body.push(richBullet([{ t: "Catering hours have to match shift hours. ", b: true }, { t: "A canteen that closes before the late shift returns produces a workforce that eats badly and sleeps worse, and it is a specification defect rather than a catering one." }]));
body.push(richBullet([{ t: "Occupancy and rotation are a fatigue control. ", b: true }, { t: "Where the company manages accommodation, sustained over-occupancy and rotation patterns that erode rest are reported to the client as findings, in the same way a safety defect would be." }]));

body.push(h2("Fatigue observed on site"));
body.push(p("Where a person attending on this company's behalf observes evidence of fatigue in a workforce — shift patterns without adequate rest, sustained excessive hours, people sleeping in vehicles, or a near miss whose most likely cause is tiredness — it is reported to the person in control of that site on the day, recorded with the time and the name of the person it was reported to, and escalated in writing to the client if it is not addressed. The company does not direct another employer's operatives; observation and report is the duty it holds, and it discharges it every time."));

/* ---- 8 ---- */
body.push(h1("8. Support available"));
body.push(p("These are published, independent services. They are listed because a policy that describes a duty without naming a route to help has done half the job."));
body.push(table([2900, 2100, 3300],
  ["Service", "Contact", "What it is"],
  [
    ["Samaritans", "116 123, free, 24 hours", "Confidential emotional support, any time, including in a crisis."],
    ["Lighthouse Construction Industry Charity", "Helpline published at lighthouseclub.org", "The construction industry's own charity — emotional, physical and financial wellbeing support for construction workers and their families."],
    ["Mates in Mind", "matesinmind.org", "Construction-sector mental health awareness and training for organisations."],
    ["NHS 111", "111, option 2 for mental health", "Urgent NHS mental health help, 24 hours."],
    ["Emergency", "999", "Where there is an immediate risk to life."],
    ["General practitioner", "[practice]", "The route to diagnosis, treatment and referral, and the route to a fit note."],
  ]));
body.push(fill("[Verify each contact route before issue. A helpline number printed wrongly in a wellbeing policy is the worst possible error in this document, and it is the one nobody checks.]"));

/* ---- 9 ---- */
body.push(h1("9. Health information, confidentiality and records"));
body.push(p("Information about a person's health is special category personal data under Article 9 of the UK GDPR. It is handled accordingly."));
body.push(bullet("Health information disclosed to the company is held in confidence and is not shared without the individual's consent, save where there is an immediate risk to life or a legal obligation to disclose."));
body.push(bullet("Where health surveillance is carried out, the company receives the provider's fitness-for-work conclusion. It does not receive, ask for or retain clinical records."));
body.push(bullet("Health records are held separately from other personnel information, with access restricted to those who need it."));
body.push(bullet("Health surveillance records are retained for the periods required by the regulations under which they are made, and for at least 40 years where required for asbestos, noise or vibration surveillance."));
body.push(bullet("A disclosure of a mental health condition is not recorded as a performance matter and does not affect the allocation of work, except in the form of adjustments made at the individual's request."));

/* ---- 10 ---- */
body.push(h1("10. Responsibility, monitoring and review"));
body.push(p("The Managing Director owns this document and is accountable for it. Until other people are engaged, every arrangement in it sits with that post and nowhere else. Competent assistance under regulation 7 of the Management Regulations is obtained externally where a question exceeds the company's own competence; it is referred, not guessed at."));
body.push(p("The register of planned hires includes an HSEQ and Assurance Manager. On that appointment, the arrangements in sections 3, 4, 6 and 7 transfer to that post and this document is reissued."));
body.push(p("The Managing Director reviews this document at least annually, and immediately after any report of work-related ill health, any occupational disease diagnosis, any change to the work, and any change in the law affecting it. Each review is dated on the cover. What is reviewed: ill-health and fatigue reports and their causes, hours actually worked against the limits at section 7, whether the arrangements were in fact followed, and what should change."));

/* ---- 11 ---- */
body.push(h1("11. What is not yet in place"));
body.push(p("Stated plainly, because a reader will establish it anyway and the document that survives the check is the one that did not claim otherwise."));
body.push(bullet("No occupational health provider is retained. None is currently required by the health risk assessment at section 3, and one will be engaged before any engagement or appointment that brings health surveillance into scope."));
body.push(bullet("No employee assistance programme is in place. With one working director there is nobody to enrol; the independent services at section 8 are the route, and a programme will be put in place with the first employment."));
body.push(bullet("No mental health first aider is trained. [State the intention and the date, or state that the external routes at section 8 are relied on.]"));
body.push(bullet("No health surveillance is being carried out, for the reason given at section 4."));
body.push(bullet("No sickness absence data exists, because there has been no workforce to generate it. It will be recorded and reviewed from the first engagement."));
body.push(note(
  "Nothing in this section is a defect to be concealed. Each item is the correct answer for a company of this size " +
  "today, each carries the trigger that changes it, and a reader who sees them stated trusts the rest of the document."));

/* ---- signature ---- */
body.push(h1("Approval"));
body.push(p("This policy is a live document. It is reviewed on the dates recorded on the cover and reissued whenever the work, the people or the law changes.", { after: 380 }));
body.push(p("Signed  ..............................................................", { after: 140 }));
body.push(p("Name  [name]", { after: 60 }));
body.push(p("Position  Managing Director", { after: 60 }));
body.push(p("Date  ....................................", { after: 300 }));

/* ===RENDER=== */
const doc = new Document({
  creator: "ETABLIX — Integrated Site Services",
  title: "Management of Occupational Health, including mental health and fatigue",
  description: "ETABLIX occupational health policy and arrangements",
  numbering: {
    config: [{
      reference: "etx-bullets",
      levels: [{
        level: 0, format: LevelFormat.BULLET, text: "–", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 360, hanging: 200 } },
                 run: { color: GOLD, font: F, bold: true } },
      }],
    }],
  },
  styles: { default: { document: { run: { font: F, size: 20, color: INK } } } },
  sections: [{
    properties: { page: { margin: { top: 1100, right: 1100, bottom: 1100, left: 1100 } } },
    headers: { default: new Header({ children: [new Paragraph({
      alignment: AlignmentType.RIGHT,
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: TINT, space: 4 } },
      children: [new TextRun({ text: "ETABLIX · Management of Occupational Health · Rev " + REV,
                               font: F, size: 14, color: SLATE })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({ text: "JNN GLOBAL LTD · 15405437          ", font: F, size: 14, color: SLATE }),
        new TextRun({ children: [PageNumber.CURRENT], font: F, size: 14, color: SLATE }),
        new TextRun({ text: " of ", font: F, size: 14, color: SLATE }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], font: F, size: 14, color: SLATE }),
      ] })] }) },
    children: body,
  }],
});

/* ---------- HTML renderer, for the PDF ---------- */
const runsHtml = (runs) => runs.map((r) =>
  `<span${r.b ? ' class="b"' : r.i ? ' class="i"' : ""}>${esc(r.t)}</span>`).join("");

function html() {
  const out = [];
  let inList = false;
  const closeList = () => { if (inList) { out.push("</ul>"); inList = false; } };
  const openList = () => { if (!inList) { out.push("<ul>"); inList = true; } };

  for (const b of BLOCKS) {
    if (b.kind !== "bullet" && b.kind !== "richBullet") closeList();
    switch (b.kind) {
      case "brand":  out.push('<p class="brand">ETABLIX</p>'); break;
      case "strap":  out.push('<p class="strap">INTEGRATED SITE SERVICES</p>'); break;
      case "kicker": out.push(`<p class="kicker">${esc(b.text)}</p>`); break;
      case "title":  out.push(`<h1 class="doctitle">${esc(b.text)}</h1>`); break;
      case "sub":    out.push(`<p class="docsub">${esc(b.text)}</p>`); break;
      case "break":  out.push('<div class="pb"></div>'); break;
      case "h1":     out.push(`<h2>${esc(b.text)}</h2>`); break;
      case "h2":     out.push(`<h3>${esc(b.text)}</h3>`); break;
      case "note":   out.push(`<div class="note">${esc(b.text)}</div>`); break;
      case "fill":   out.push(`<p class="fillin">${esc(b.text)}</p>`); break;
      case "bullet": openList(); out.push(`<li>${esc(b.text)}</li>`); break;
      case "richBullet": openList(); out.push(`<li>${runsHtml(b.runs)}</li>`); break;
      case "rich":   out.push(`<p>${runsHtml(b.runs)}</p>`); break;
      case "p": {
        if (!b.text) { out.push('<p class="spacer"></p>'); break; }
        const cls = [];
        if (b.o && b.o.rule) cls.push("rule");
        if (b.o && b.o.color === SLATE) cls.push("muted");
        out.push(`<p${cls.length ? ` class="${cls.join(" ")}"` : ""}>${esc(b.text)}</p>`);
        break;
      }
      case "table": {
        const blank = b.head.every((h) => h === "");
        const rows = b.rows.map((r) =>
          `<tr>${r.map((c, i) => `<td${blank && i === 0 ? ' class="k"' : ""}>${esc(c)}</td>`).join("")}</tr>`).join("");
        const head = blank ? "" :
          `<thead><tr>${b.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>`;
        out.push(`<table${blank ? ' class="plain"' : ""}>${head}<tbody>${rows}</tbody></table>`);
        break;
      }
      default: break;
    }
  }
  closeList();

  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8">
<title>ETABLIX — Management of Occupational Health</title>
<style>
  @page { size: A4; margin: 19mm 19mm 20mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; line-height: 1.5;
         color: #${INK}; margin: 0; }
  p { margin: 0 0 7pt; }
  .spacer { margin: 0 0 10pt; }
  .b { font-weight: 700; } .i { font-style: italic; }
  .muted { color: #${SLATE}; }
  .brand { font-size: 30pt; font-weight: 700; letter-spacing: -0.5pt; margin: 26mm 0 0; }
  .strap { font-size: 9pt; font-weight: 700; letter-spacing: 2pt; color: #${GOLD}; margin: 0 0 3pt; }
  .rule { border-bottom: 1.2pt solid #${GOLD}; padding-bottom: 6pt; margin-bottom: 16pt; }
  .kicker { font-size: 15pt; font-weight: 700; color: #${GOLD}; margin: 12pt 0 0; letter-spacing: 0.5pt; }
  .doctitle { font-size: 25pt; font-weight: 700; margin: 0; line-height: 1.1; letter-spacing: -0.5pt; }
  .docsub { font-size: 13pt; color: #${SLATE}; margin: 3pt 0 18pt; }
  h2 { font-size: 13.5pt; margin: 20pt 0 7pt; padding-bottom: 4pt;
       border-bottom: 1.4pt solid #${GOLD}; page-break-after: avoid; }
  h3 { font-size: 11pt; color: #${GOLD}; margin: 14pt 0 5pt; page-break-after: avoid; }
  ul { margin: 4pt 0 8pt; padding-left: 16pt; }
  li { margin: 0 0 3.5pt; padding-left: 3pt; }
  li::marker { color: #${GOLD}; font-weight: 700; content: "– "; }
  .note { background: #${TINT}; border-left: 3pt solid #${GOLD};
          padding: 8pt 11pt; margin: 9pt 0; font-size: 9.5pt; page-break-inside: avoid; }
  .fillin { font-style: italic; color: #${SLATE}; font-size: 9.5pt; padding-left: 9pt; }
  table { width: 100%; border-collapse: collapse; margin: 7pt 0 11pt;
          font-size: 8.8pt; page-break-inside: avoid; }
  th { background: #${INK}; color: #fff; text-align: left; padding: 5pt 7pt;
       font-size: 8.4pt; font-weight: 700; }
  td { padding: 5pt 7pt; vertical-align: top; border-bottom: 0.5pt solid #d8d3c6; }
  tbody tr:nth-child(even) td { background: #${PAPER}; }
  table.plain th { display: none; }
  td.k { font-weight: 700; width: 28%; }
  .pb { page-break-after: always; }
</style></head><body>
${out.join("\n")}
</body></html>`;
}

/* ---------- write both ---------- */
const { execSync } = require("child_process");
const PLAYWRIGHT = process.env.ETABLIX_PLAYWRIGHT
  || path.join(execSync("npm root -g").toString().trim(), "playwright");

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(OUT_DOCX, buf);
  console.log("wrote " + OUT_DOCX);

  fs.writeFileSync(OUT_HTML, html());
  // LibreOffice in this environment ships without its Writer module and cannot
  // read a .docx at all, so the PDF is printed from the same content by
  // Chromium rather than converted from the Word file.
  // Printed through Playwright rather than the Chromium command line, because
  // only the protocol print exposes a footer template — and a twelve-page
  // policy without page numbers is a document nobody can reference in a
  // meeting. The Word file's footer says the same thing.
  const { chromium } = require(PLAYWRIGHT);
  const rule = `color:#${SLATE};font-family:Arial,Helvetica,sans-serif;font-size:7pt;width:100%;padding:0 19mm;`;
  (async () => {
    const browser = await chromium.launch({ args: ["--no-sandbox"] });
    const page = await browser.newPage();
    await page.goto("file://" + OUT_HTML, { waitUntil: "load" });
    await page.pdf({
      path: OUT_PDF,
      format: "A4",
      printBackground: true,
      margin: { top: "22mm", right: "19mm", bottom: "17mm", left: "19mm" },
      displayHeaderFooter: true,
      headerTemplate: `<div style="${rule}text-align:right;">ETABLIX · Management of Occupational Health · Rev ${REV}</div>`,
      footerTemplate: `<div style="${rule}display:flex;justify-content:space-between;">` +
        `<span>JNN GLOBAL LTD · 15405437</span>` +
        `<span><span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`,
    });
    await browser.close();
    if (!process.env.ETABLIX_KEEP_HTML) fs.unlinkSync(OUT_HTML);
    console.log("wrote " + OUT_PDF);
  })().catch((err) => { console.error(err); process.exit(1); });
});
