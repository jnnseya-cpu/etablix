// ETABLIX — Procurement Strategy and the Five-to-One Consolidation Playbook.
// Part A: why the accommodation scope splits into five, and the day-one terms
// that decide whether it can ever be pulled back into one.
module.exports = {
  meta: {
    title: "Procurement Strategy and the Five-to-One Consolidation Playbook",
    sub: "Workforce accommodation: letting five packages, and bringing them back under one prime",
    ref: "ETX-PB-01", rev: "A", date: "September 2026",
    classification: "Commercial-in-Confidence — ETABLIX method document",
  },

  // ---------------------------------------------------------------- thesis
  thesis: [
    ["1", "The claim this document makes",
      "Five packages consolidated into one is usually described afterwards as a rescue. It is presented as an admission that the packaging was wrong, and the people who chose five spend the rest of the job defending the decision.\n\nThat reading is wrong, and it costs money twice — once when a client who should split does not, and again when a client who has split refuses to consolidate because consolidating would look like a mistake.\n\nTHE CLAIM. Letting five packages and then consolidating them under one prime is a strategy, not a failure, and it is available to any client who writes four clauses into the original five contracts. It buys two things that no other route buys together: five competitively tendered prices, and single-point management of the interfaces between them. Tendering one prime from the start buys the second and gives away the first. Running five to the end buys the first and pays for the second in the client's own management time, which is the most expensive way there is to buy it.\n\nWhat makes the difference between a strategy and a rescue is not the decision to consolidate. It is whether the day-one contracts made consolidation possible without four separate negotiations from a position of no leverage. Section {{§enabling}} is the four clauses. Everything else in this document assumes them."],
    ["2", "Who this is for, and what it is not",
      "This is a method document for a client, an employer's agent or a construction manager procuring a workforce accommodation village of two hundred beds or more, on a programme long enough that the accommodation runs alongside a live construction site rather than before it.\n\nIt is not a legal document and it is not legal advice. Novation is a three-party contract and its effect turns on the words used, the law of the contract and the facts. Every mechanism in this document is a commercial structure that a lawyer must draft and advise on. Where this document states a legal position it states it so that the commercial decision is taken with the position in view — not so that it is taken without a lawyer."],
    ["3", "The two numbers that decide it",
      "Two numbers run through this document and it is worth stating both at the front.\n\nTHE INTERFACE COUNT. Interfaces between packages grow as n(n−1)÷2. Five packages have ten interfaces between them. Ten packages have forty-five. Adding a sixth package to five adds one contract and five interfaces. The management load is not in the contracts; it is in the gaps between them, and the gaps grow faster than the contracts do.\n\nTHE NOTICE COUNT. Under the Housing Grants, Construction and Regeneration Act 1996 as amended, every construction contract carries its own payment due date, final date for payment, payment notice deadline and pay-less notice deadline. Five contracts are five sets of dates every month. Miss one pay-less notice and the sum applied for becomes the notified sum and is payable in full, whatever it was worth. Five contracts do not make that five times more likely — they make it more likely than that, because the fifth set of dates is administered by whoever has least time left in the month.\n\nA client who consolidates five contracts into one has not saved a management fee. It has removed fifty-nine of the sixty statutory notice deadlines it faces each year, and nine of the ten interfaces it was standing in the middle of."],
  ],

  // ------------------------------------------------------- the five packages
  packages: [
    ["P1", "Civil works and infrastructure",
      "Ground preparation, bases and plinths, roads, hardstanding, parking, drainage, below-ground services to the termination point per block, external lighting, fencing and the site boundary.",
      "Everything above the termination point. The modules themselves. Anything inside a building.",
      "Earliest on site, latest to finish. Sets the tolerance every other package works to.", "I-01, I-02, I-03, I-04"],
    ["P2", "Modular accommodation",
      "Volumetric modules, their structure, envelope, internal fit-out, fixed joinery, and the mechanical, electrical, fire, drainage and access-control systems within them, up to the P1 termination points.",
      "Bases. Loose furniture. Kitchen fit-out. Operation.",
      "The largest sum and the longest lead time. Its manufacture slot is the programme's real constraint.", "I-01, I-02, I-03, I-05, I-06, I-07, I-08"],
    ["P3", "Kitchen and catering fit-out",
      "Catering equipment, extraction, cold stores, servery, wash-up, and the commissioning of all of it.",
      "The building shell it sits in, which is P2. The people who cook, who are P5.",
      "Priced against a shell it does not build, to a layout it did not draw. The classic interface failure.", "I-05, I-09"],
    ["P4", "Furniture, fittings and equipment",
      "All loose furniture: beds, mattresses, seating, soft furnishings, bins, and the amenity and common-room furniture.",
      "Anything fixed, which is P2. Consumables, which are P5.",
      "Lowest value, highest nuisance. Installs last, into rooms someone else built, and blocks handover if it slips.", "I-06, I-07, I-10"],
    ["P5", "Facilities management and operation",
      "Housekeeping, catering operation, security, transport, reception, planned and reactive maintenance, utilities management, waste, and the resident-facing service for the whole deployment.",
      "Construction of anything. It receives what the other four built.",
      "The only package that runs the full duration. The only one that meets all four others in use. Remember this at {{mechanism.3}}.", "I-04, I-08, I-09, I-10"],
  ],

  // -------------------------------------------------- the interface register
  interfaces: [
    ["I-01", "P1 ↔ P2", "Base setting-out, level tolerance, and the survey that proves it", "±5 mm across a base, ±3 mm between adjacent bases under one module", "P2 cannot manufacture until P1's tolerance is agreed, and cannot deliver until it is proved"],
    ["I-02", "P1 ↔ P2", "One termination point per service per block — water, foul, power, data — at a stated position and invert", "A coordination drawing signed by both before either orders material", "The single most common cause of a module standing unconnected on its base"],
    ["I-03", "P1 ↔ P2", "Craneage hardstanding, access route, turning and outrigger ground bearing pressure", "P1 designs to the pressure P2 states, not to an assumption", "P2 states it at tender or P1 designs a hardstanding to a guess"],
    ["I-04", "P1 ↔ P5", "Roads, lighting, parking and external areas at the standard the operator has to maintain", "The maintenance regime agreed before the surface is chosen", "P5 inherits a surface it did not choose and cannot afford to keep"],
    ["I-05", "P2 ↔ P3", "Kitchen building shell: penetrations, floor loading, drainage falls, extract routes", "P3 confirms the penetration schedule before P2 manufactures", "After manufacture a penetration is a variation to a completed module"],
    ["I-06", "P2 ↔ P4", "The line between fixed joinery and loose furniture, item by item", "One common schedule issued by the client before either package is let", "Both price the wardrobe, or neither does. There is no third outcome"],
    ["I-07", "P2 ↔ P4", "Access for furniture installation after setting and before handover", "A sequence agreed at award, with secure storage if it slips", "P4 arrives to a room that is not ready and charges for the visit"],
    ["I-08", "P2 ↔ P5", "Commissioning, demonstration, O&M, asset data and training", "Complete and demonstrated before any occupation", "P5 opens a village it has never been shown how to run"],
    ["I-09", "P3 ↔ P5", "Catering equipment handover, training, consumables and the maintenance regime", "Demonstrated to the operator, with the spares holding agreed", "The first service is the first time the operator sees the equipment"],
    ["I-10", "P4 ↔ P5", "Furniture condition at handover, the replacement standard and the consumables split", "A condition schedule signed at handover, room by room", "Every mark becomes an argument at the end of the deployment"],
  ],

  // -------------------------------------------------------- the packaging test
  packaging: [
    ["1", "Three routes, and what each one buys",
      "There are three ways to buy a workforce accommodation village and the choice is usually made on instinct. It should be made on what each route actually buys.\n\nONE PRIME FROM THE START. One tender, one contract, one point of accountability, and the interfaces are the prime's problem from day one. What it buys is management. What it gives away is price: the client sees one number, has no visibility of what any package cost, and is negotiating a wrap on prices it has never seen competed. On a village this is usually a 20 to 30 per cent addition on a base the client cannot examine.\n\nFIVE PACKAGES, RUN TO THE END. Five tenders, five competitive prices, full visibility of every sum. What it buys is price. What it gives away is management: the ten interfaces at section {{§interfaces}} and the sixty statutory notice deadlines a year at {{claim.3}} all sit with the client, and they sit with the same people who are running the main project.\n\nFIVE PACKAGES, CONSOLIDATED. Five competitive prices, fixed. Then one of the five, or a sixth party, takes the other four under it and the client holds one contract. What it buys is both — the price and the management — and what it costs is the wrap on prices the client has already seen, plus the transaction cost of the transfer. What it requires is that the day-one contracts allow it.\n\nThe third route is the one this document is about, and the reason it is not the obvious answer everywhere is section {{§enabling}}: it is only available if somebody wrote four clauses at the start."],
    ["2", "When five is right, and when it is not",
      "Five is right when: the packages have genuinely different supply markets, so competing them separately reaches firms that would never appear under a single prime; the value is large enough that the competitive difference on each package exceeds the wrap; and the client has, or can buy, enough management capacity to hold the interfaces until it consolidates.\n\nFive is wrong when: two of the five are the same supply market and would be tendered to the same three firms; the total is small enough that five procurement exercises cost more than the price difference they find; or the client's management capacity is already committed to the main project, in which case the client is not choosing five packages, it is choosing to under-manage five packages, which is a different decision and a worse one.\n\nThe honest test is not whether five is theoretically better. It is whether the client can name the person who will hold the ten interfaces, and whether that person has the time. If the answer is a name and a role that is already full, the client has chosen five and resourced one."],
    ["3", "The management load, counted rather than felt",
      "Consolidation is usually argued for on the grounds that five is 'too much'. That is true and it is not an argument, because it is not a number. Count it instead.\n\nWith five packages the client holds: five contracts to administer; ten interfaces between packages; five interfaces between the accommodation and the main project; five monthly valuations; five sets of statutory payment dates; five change registers; five risk registers; five progress reports; and five sets of insurance, bonds and warranties to keep current.\n\nAfter consolidation the client holds: one contract; one interface with the accommodation; one valuation; one set of statutory dates; one change register; one risk register; one report.\n\nThe ten internal interfaces do not disappear. They move inside the prime's scope and they are priced there. Anybody who tells a client that consolidation removes ten interfaces is selling something. It removes them from the client, which is worth paying for, and it charges for holding them, which is what the wrap at section {{§pricing}} is."],
  ],

  // load comparison: [what, with five, after consolidation]
  load: [
    ["Contracts administered", "5", "1"],
    ["Interfaces the client stands in the middle of", "10", "0 — transferred and priced"],
    ["Interfaces with the main project", "5", "1"],
    ["Monthly valuations to assess", "5", "1"],
    ["Statutory payment and pay-less notice deadlines per year", "60 (5 × 12 pairs)", "12"],
    ["Change registers", "5", "1"],
    ["Risk registers", "5", "1"],
    ["Monthly progress reports to read and reconcile", "5", "1"],
    ["Insurance, bond and warranty sets to keep current", "5", "1 (plus sub-tier evidence held by the prime)"],
    ["Parties who can claim an extension of time against the client", "5", "1"],
    ["Parties who can be delayed by another and claim against the client for it", "5", "0 — it becomes an internal matter for the prime"],
  ],

  // ---------------------------------------------- the four enabling clauses
  enabling: [
    ["E1", "The novation obligation",
      "The contract shall oblige the contractor, on the employer's written notice, to enter into a deed of novation in the form annexed to the contract, transferring the contract to a party the employer names, within a stated period of not more than twenty working days.",
      "Without it, novation requires the contractor's consent given for the first time at the moment the employer needs it — which is the moment the contractor has most leverage and least reason to give it cheaply. One of four refusing does not stop the consolidation; it makes the consolidation partial, which is worse than either extreme.",
      "The form of deed is annexed AT EXECUTION. A clause obliging a party to sign 'a deed in a form to be agreed' obliges them to nothing."],
    ["E2", "The named-party limitation",
      "The employer may nominate as transferee any party which, at the date of the notice, holds a contract with the employer on the same project, or which meets stated financial and insurance criteria set out in the contract.",
      "It is the clause that makes E1 acceptable to a contractor. A bare obligation to novate to anyone the employer names is a covenant to accept an unknown counterparty, and a well-advised contractor will not give it. Limiting the field to an existing project party, or to a party meeting a stated credit test, is reasonable, is accepted, and — this is the point — still permits consolidation onto an incumbent.",
      "State the financial criteria as numbers: net asset position, professional indemnity limit, public liability limit. 'A party of equivalent standing' is not a criterion."],
    ["E3", "The cut-off valuation mechanism",
      "The contract shall provide that on novation the works shall be valued at the date of transfer in accordance with a stated procedure, and that the sum so valued shall be conclusive as between employer and contractor as to work executed to that date, save for latent defects and any matter notified before the transfer.",
      "Novation without a cut-off leaves the transferred contract carrying an unvalued past. The new prime will not take on a liability it cannot see, so it will either price it at its worst case or refuse to take it. Both are expensive, and both are avoidable by valuing on a stated date under a procedure agreed before anyone had a reason to argue about it.",
      "It also fixes the four sums, which is what protects the competitive prices the client bought. Without it the prime will want the four to become provisional."],
    ["E4", "The retention, bond and warranty carry-over",
      "The contract shall state what happens on novation to retention held, to any bond or parent company guarantee given to the employer, and to collateral warranties: which survive to the employer, which are re-issued to the transferee, and who bears the cost of any re-issue.",
      "A performance bond is a contract with a surety, and a surety is not bound by a novation it did not agree to. A bond that lapses on the day of transfer takes with it the only security the client had, and nobody notices until it is needed. Retention held by the employer for work now managed by a prime is either a debt the employer owes the prime, or a fund the employer still administers under a side agreement — and if the contract does not say which, both parties will assume the answer that suits them.",
      "Get the surety's consent in principle at the time the bond is taken out, not on the day of the transfer."],
  ],
};
