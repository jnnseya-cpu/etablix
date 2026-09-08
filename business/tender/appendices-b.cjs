// Appendices 6, 10, and the four controlled insertion sheets (2, 3, 4, 7),
// plus the Employer's site rules, which are ours and are written in full.

// Bed demand, month by month, over the 38-month deployment. Peak 225 matches
// the room schedule at section 2 exactly: 199 RT-01 + 12 RT-02 + 14 RT-03.
const DEMAND = [
  0, 0, 0, 58, 62, 60, 96, 128, 141, 168, 190, 199,
  214, 221, 225, 225, 225, 224, 225, 225, 223, 225, 225, 220,
  218, 214, 205, 196, 178, 162, 140, 121, 98, 74, 52, 31, 14, 0,
];
// Proportion of the occupied population working a DAY shift, and therefore
// sleeping at night. The remainder sleep during the day — Appendix 9 Criterion C.
const DAYSHIFT = [
  0, 0, 0, 1.00, 1.00, 1.00, 0.85, 0.78, 0.72, 0.68, 0.65, 0.62,
  0.60, 0.58, 0.55, 0.55, 0.55, 0.55, 0.55, 0.55, 0.55, 0.55, 0.58, 0.60,
  0.62, 0.65, 0.68, 0.70, 0.74, 0.78, 0.82, 0.86, 0.90, 0.94, 1.00, 1.00, 1.00, 0,
];
const SECTIONS = [
  { n: 1, beds: 65,  byMonth: 3,  note: "Cumulative 65. First occupation: reception, one block, and the kitchen shell handed to P3." },
  { n: 2, beds: 85,  byMonth: 6,  note: "Cumulative 150. Amenity and laundry complete." },
  { n: 3, beds: 55,  byMonth: 9,  note: "Cumulative 205." },
  { n: 4, beds: 20,  byMonth: 12, note: "Cumulative 225 — the full village, including all 12 RT-02 rooms." },
];

module.exports = {
  DEMAND, DAYSHIFT, SECTIONS,

  a6: {
    intro:
      "Every number in this village comes off this curve. Beds, kitchen covers, drainage discharge, transport, laundry, catering, the size of the reception — all of it is sized from the peak, and a village sized off a peak that is really a spike is a village half empty for thirty months.\n\nThe delivery sequence at 7.2 is driven by this curve and not by manufacturing convenience. A tenderer proposing a different sequence prices it as a departure and states the effect on the first-occupation date.",
    notes: [
      "PEAK. 225 beds, first reached in month 15 and held, within two beds, from month 15 to month 23. This matches the room schedule at section 2 exactly: 199 RT-01, 12 RT-02, 14 RT-03. The village is nonetheless sized and completed for 225 by the end of month 12, because a bed that arrives in the month it is needed has arrived late.",
      "THE ACCESSIBLE ROOMS ARE NOT PROPORTIONAL. All twelve RT-02 rooms are required by sectional completion 4. They are not distributed pro rata across the four sections, because an accessible room is required by whoever needs one, in whatever month they arrive, and the Employer cannot programme that.",
      "DAY-SHIFT PROPORTION. The last column drives Appendix 9 Criterion C. At the peak, 45% of residents are sleeping during the day. A thermal model run on a night-occupancy profile does not describe this building.",
      "THE CURVE IS THE EMPLOYER'S FORECAST, NOT A GUARANTEE. It is issued so that the Contractor sizes to it and so that the sectional completion dates can be tested against it. Variation within it is not a change; a change to the peak or to a sectional completion date is.",
      "STANDING TIME. Blocks complete against this curve stand partly occupied or unoccupied for months. That is the specific legionella risk at 4.12, and the written scheme of control shall address it rather than assume continuous occupation.",
    ],
    ld: "Liquidated damages at 18.2 are £145 per bed per calendar day, applied per section from its completion date until it is certified, capped in aggregate at 7.5% of the contract sum. The build-up is at 18.2 and is stated there so the rate survives being looked at.",
  },

  // ---------------------------------------------------------- APPENDIX 10
  a10: {
    intro:
      "This is a CONTENT SCHEDULE, not a warranty. The form itself is drafted by the Employer's legal adviser and issued as an addendum before the clarification deadline. It is issued in this form now so that a tenderer can price the obligation — the number of warranties, the insurance it must carry and for how long — rather than pricing a document it has not seen.\n\nA tenderer that requires an amendment to any clause below shall state it as a departure under 13.4 at tender. An amendment raised after award is a negotiation the Employer conducts having already lost its alternative.",
    // [clause, what it requires, why it is there, the negotiation to expect]
    clauses: [
      ["Duty of care", "The warrantor warrants it has exercised and will exercise the reasonable skill and care of a consultant experienced in work of a similar size, scope and complexity.", "It gives the beneficiary a direct contractual route where none otherwise exists.", "A warrantor may seek 'reasonable skill and care' without the experience qualifier. The qualifier is what makes the standard measurable and it should be kept."],
      ["No greater liability", "The warrantor owes no greater duty to the beneficiary than it owes under the underlying contract, and may rely on any defence it would have under it.", "Without it the warranty can be a larger liability than the contract it warrants, and the warrantor's insurer will say so.", "This one is standard and is not usually resisted. A warranty offered without it should be looked at twice."],
      ["Net contribution", "Liability is limited to the proportion that would be just and equitable having regard to the responsibility of other parties.", "It is the clause the warrantor's insurer requires. Refusing it usually means no warranty at all.", "Expect it. The Employer's protection is to hold warranties from every designer rather than to refuse this clause to one."],
      ["Copyright and licence", "An irrevocable, royalty-free, non-exclusive licence with the right to sub-licence, for every purpose connected with the village — including relocation under 13.7 — surviving termination and not conditional on payment of any sum not already due.", "The Employer intends to move this village. A licence that dies with the contract makes that impossible.", "A warrantor may want the licence conditional on payment. Resist: the licence must survive a dispute, because a dispute is exactly when the Employer needs it."],
      ["Professional indemnity insurance", "Not less than £5,000,000 for each and every claim, maintained for twelve years from the last sectional completion, with evidence of renewal produced annually, and immediate notice if cover ceases to be available on commercially reasonable terms.", "13.6. Twelve years matches the limitation period for a deed.", "A smaller warrantor may only carry £2m, or carry it in the aggregate. Decide the minimum before tender and state it, rather than discovering the position at warranty stage."],
      ["Step-in rights", "The beneficiary may, on notice, step into the underlying contract in place of the Employer, and the warrantor shall not terminate without first giving the beneficiary notice and a period in which to step in.", "It is what makes a warranty worth having to a funder. Without it, the funder's security is a right to sue after the project has stopped.", "Warrantors accept step-in but negotiate the notice period. Twenty-one days is usual; less than fourteen is not workable."],
      ["Assignment", "Assignable by the beneficiary on not fewer than two occasions without the warrantor's consent.", "A village that may be sold or relocated may change hands. A warranty that cannot follow it is worth nothing to the next owner.", "Two is the market position. A warrantor offering one is offering half of what is needed here."],
      ["Deleterious materials", "The warrantor has not and will not specify materials known at the time of specification to be deleterious, or not in accordance with relevant British or European Standards or Agrément certificates.", "It is a design warranty in a specific and testable form.", "Expect a request to limit it to a named list. A list dated at execution ages badly; the general obligation does not."],
      ["Execution", "As a deed, so that the limitation period is twelve years rather than six.", "Six years is not long enough for a latent defect in sleeping accommodation to appear and be traced.", "Not usually resisted, but it must be executed correctly — a deed executed as a simple contract is a six-year warranty nobody realises they have."],
      ["Beneficiaries required", "To the Employer, and to any funder, purchaser or subsequent site owner the Employer names. Two beneficiaries assumed at tender; item A11 of Appendix 1 prices six warranties in total across the Contractor and its designing sub-contractors.", "So the count is priced rather than argued about.", "Where the Employer later names more beneficiaries than assumed, the additional warranties are valued under section 17 at the rate in item A11."],
    ],
  },

  // ------------------------------------------------- APPENDIX 3, our part
  siteRules: [
    ["Induction", "Every person, before first entry, without exception. Project induction plus a village-specific module once the first block is occupied — the second one exists because a site where people are asleep two hundred metres away is not the same site.", "14.5"],
    ["Competence", "Valid competence card for the work being done, carried and produced on request. A card that has expired is a card that has expired."],
    ["Hours", "As the planning consent. Work outside them requires the Employer's prior written agreement AND the discharge of the relevant condition — the two are separate and both are needed.", "7.4, IF-12"],
    ["Deliveries", "Booking slot from the Principal Contractor not less than 48 hours ahead. A vehicle without a slot may be turned away and the abortive cost is the Contractor's. No vehicle waits on the public highway.", "14.2"],
    ["Speed and traffic", "10 mph throughout. No reversing without a banksman. Wheel wash before leaving. Pedestrian routes segregated and lit.", "14.2"],
    ["Drugs and alcohol", "Testing on a for-cause and random basis. A positive test or a refusal is removal from site.", "14.5"],
    ["Smoking", "Designated areas only. Not within 10 m of any accommodation block, at any stage, including before occupation — a habit formed during construction persists into occupation.", ""],
    ["PPE", "Safety footwear, hi-vis, hard hat and eye protection as a minimum, task-specific PPE per the risk assessment.", ""],
    ["Permits", "Required for: hot works, work at height, confined space, excavation, isolation of any live service, and any lift under 4.21. Issued by the Principal Contractor. Allow for the time in the programme rather than treating it as a delay.", "14.5, 4.21"],
    ["Noise near occupied blocks", "Once any block is occupied, no work generating more than 65 dB(A) at the facade of an occupied block between 20:00 and 07:00 without the Employer's written agreement. Residents on nights are asleep during the working day and this is a safety matter, not a courtesy.", "4.26"],
    ["Photography", "No photography of residents or of the interior of occupied rooms. Progress photography of construction areas is permitted and expected.", ""],
    ["Parking", "Limited to the spaces stated in the Employer's allocation. Transport is the Contractor's problem for any operative beyond that number. No parking on the village access road at any time — it is the emergency route.", "14.4"],
    ["Welfare", "The Contractor provides its own to CDM 2015 Schedule 2 for the whole of its time on site. It does not use the village it is building.", "14.4"],
    ["Emergency", "Assembly points as the fire strategy. The village alarm and the construction site alarm are separate systems and a person on site must know which one they have heard.", "4.26"],
  ],

  // ------------------------------------------- controlled insertion sheets
  // [appendix, title, author, status, what the ER depends on it for, what a tenderer prices until it arrives]
  insertions: [
    {
      n: "2", title: "Fire strategy", author: "The Employer's fire engineer",
      status: "To be inserted. Revision C is expected before the clarification deadline.",
      depends: [
        "The evacuation strategy and zoning decisions at 4.26 — the Employer has stated them and the fire engineer's strategy must confirm or vary them.",
        "Compartmentation and the REI 60 requirement at 4.6 and section 6.",
        "Escape route widths and travel distances, which set the corridor width at 4.7 and therefore the door clear opening width in the room data sheets.",
        "Doorset ratings — FD30S to bedrooms, FD60S where the strategy requires.",
        "External wall reaction-to-fire requirements for the building height and use, per section 6.",
        "The separation distance between blocks that permits each to be a separate evacuation entity under 4.26.",
        "Confirmation of the alarm category — this document states L1 unless the strategy requires otherwise (4.15).",
      ],
      priceOn: [
        "Category L1 alarm to BS 5839-1 throughout.",
        "Simultaneous evacuation, each block a separate evacuation entity, no voice alarm — as stated at 4.26.",
        "REI 60 compartmentation between rooms and between room and corridor.",
        "FD30S bedroom doorsets, certified as doorsets.",
        "1200 mm corridors, 1500 mm on accessible routes.",
        "Bedroom doors FAIL-SECURE, escape route doors FAIL-SAFE, per 4.18.",
      ],
      ifDifferent: "Where the issued strategy requires more than the above, the difference is a change under section 17 valued at the rates in item M of Appendix 1. Where it requires less, the saving is the Employer's. A tenderer that prices a worse case silently has not made an allowance, it has made itself uncompetitive.",
    },
    {
      n: "3", title: "Planning consent and conditions", author: "The local planning authority; the site rules below are the Employer's",
      status: "The decision notice is to be inserted in full. Not a summary — a summary of a condition is somebody's reading of it, and the reading is what is being complied with.",
      depends: [
        "Working hours, at 7.4 and in the site rules.",
        "External appearance and the approved colour range at Appendix 5.",
        "External lighting, ecology and landscape conditions affecting the site boundary.",
        "The surface water discharge rate at Appendix 8.",
        "The duration of the consent, against the 38-month deployment and the relocation intention at 13.7.",
      ],
      priceOn: [
        "Working hours 07:00–19:00 Monday to Friday, 08:00–13:00 Saturday, none on Sundays or bank holidays.",
        "The colour range at Appendix 5 as consented.",
        "No external lighting spill beyond the site boundary; luminaires to be full cut-off.",
      ],
      ifDifferent: "Discharge of conditions is the Employer's and is scheduled at IF-12. Compliance once discharged is the Contractor's. A condition discharged late is an Employer delay under 18.3 only where the Contractor has given the early warning required at 18.5.",
    },
    {
      n: "4", title: "Construction Environmental Management Plan", author: "The Employer's environmental consultant",
      status: "To be inserted. The obligations this document already imposes are listed below and stand whatever the CEMP adds.",
      depends: [
        "Hours, noise, dust and lighting controls at 10.6 and in the site rules.",
        "Ecological constraints, including any seasonal restriction on works near the site boundary.",
        "Waste, duty of care and the 90% diversion target at 10.5.",
        "Water discharge and pollution prevention during installation.",
      ],
      priceOn: [
        "90% diversion from landfill, reported monthly, with transfer notes for every movement.",
        "Packaging taken back or recycled — not left as a disposal problem for the Employer.",
        "Dust suppression and wheel wash as the site rules.",
        "No seasonal restriction assumed. Where one is imposed, its programme effect is a change.",
      ],
      ifDifferent: "The CEMP may impose a seasonal ecological restriction on works near the boundary. It is stated here as a known unknown so that a tenderer asks rather than assumes, and so that the assumption is visible in the tender.",
    },
    {
      n: "7", title: "Abnormal load route assessment", author: "The Employer's transport consultant, with the highway authority",
      status: "DRAFT AND INCOMPLETE. It is issued in that state deliberately. The route includes a structure subject to assessment and the assessment is not finished.",
      depends: [
        "The delivery method and vehicle configuration at 7.3.",
        "The module dimensions the Contractor's design produces — the route constrains the module, not the other way round, until the assessment says otherwise.",
        "Escort, permit and timing requirements at item D3 of Appendix 1.",
      ],
      priceOn: [
        "The route as drafted, with the structure available.",
        "Vehicle configuration and axle loading as the tenderer states with its tender, per 7.3.",
      ],
      ifDifferent: "THE RISK THAT THE ROUTE IS UNAVAILABLE IS THE EMPLOYER'S. It is a relevant event for an extension of time under 18.3, and it is stated as such at 11.1. The Contractor shall not assume the route is available and shall not price a contingency for it — the risk is not the Contractor's to carry and a tenderer carrying it prices itself out. What the Contractor shall do is state the vehicle configuration it needs, so that the assessment is completed against a real vehicle rather than an assumed one.",
    },
  ],
};
