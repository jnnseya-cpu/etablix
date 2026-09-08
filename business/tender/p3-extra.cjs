// P3 — the shell freeze, performance, handover, and the commercial sections.
module.exports = {

freeze: [
["1","What a freeze date is, and why it is absolute here",
  "This kitchen is fitted into a building manufactured in a factory. Once a module is manufactured, an interface dimension cannot be changed: it can only be cut, patched or worked around, on a completed module, at a cost that bears no relation to what the change would have cost a week earlier.\n\nTHE FREEZE DATE IS EIGHT WEEKS BEFORE P2 COMMENCES MANUFACTURE OF THE KITCHEN AND DINING BUILDING. Every item in the register at {{freeze.2}} is fixed by then, in writing, signed by this Contractor and by P2.\n\nEight weeks is not a comfort margin. It is the period P2 needs to incorporate a penetration schedule into a manufacturing drawing, order the components and have them at the line — and it is stated as a date rather than as a principle because a principle slips and a date does not."],
["2","The freeze register","Every item below is fixed at the freeze date. The Contractor produces the information; P2 confirms it can build to it; the Employer records the agreement. An item not fixed by the date is escalated the same day, not the following month."],
["3","The loading the P2 appendix does not currently carry",
  "The Employer states this against itself rather than letting a tenderer find it.\n\nAppendix 8 of the P2 Employer's Requirements gives an imposed floor load of 3.0 kN/m² for 'amenity and dining'. IT STATES NO LOADING FOR A KITCHEN PRODUCTION FLOOR, and a kitchen production floor is not an amenity floor: a walk-in cold room, a bank of combi ovens on a stand and a full stock room impose more, and they impose it as concentrated point loads rather than as a uniform area load.\n\nTHIS PACKAGE REQUIRES, and P2 shall confirm it can provide:\n\n5.0 kN/m² uniformly distributed across the production kitchen and wash-up.\n7.5 kN/m² beneath the walk-in chill and freezer rooms, and beneath any equipment the Contractor's schedule identifies as exceeding it.\nPoint loads as stated on the Contractor's fixing schedule at {{spec.4}}, item by item.\n3.0 kN/m² across dining, as the appendix already provides.\n\nThe Contractor shall submit its loading schedule not later than TWO WEEKS BEFORE the freeze date, so that there is time for P2 to confirm or to object. P2 Appendix 8 is to be updated to carry these figures before manufacture; until it is, this clause is the requirement and it prevails.\n\nA tenderer that reads Appendix 8, prices a 3.0 kN/m² floor and discovers a cold room on it has been failed by the Employer's own documents. Which is why it is written here."],
["4","After the freeze date",
  "A change to any item in the register after the freeze date is a variation, valued under {{§change}}, and it carries THE FULL COST OF THE CHANGE TO P2 — abortive manufacturing drawings, re-ordered components, a delayed manufacturing slot, or a modification to a completed module — as well as the cost to this package.\n\nWhere the change arises from this Contractor's own development of its design, that cost is this Contractor's. Where it arises from an Employer instruction, it is the Employer's, and the Employer would rather know the number before it instructs.\n\nThe Contractor shall therefore treat the eight weeks before the freeze date as the period in which its design is actually settled, and shall not rely on developing it during manufacture. A fit-out contractor is accustomed to a shell it can drill. This one is not."],
],

// [ref, what is fixed, produced by, confirmed by, if it changes after the freeze]
freezeReg: [
["F-01","Penetration schedule — position, size and sealing detail for every service through floor, wall, ceiling and roof","This Contractor","P2","A cut through a manufactured module, with the fire and vapour seal re-made on site"],
["F-02","Floor loading, uniform and point, across every area","This Contractor","P2","Structural modification to a completed floor cassette. Usually not possible"],
["F-03","Drainage invert, gully positions and floor falls","This Contractor","P2 and P1","The floor is manufactured to falls. It cannot be re-laid"],
["F-04","Electrical supply capacity, position and route","This Contractor","P2 and P1","Reinforcement, at the cost of whoever exceeded the stated figure at {{spec.10}}"],
["F-05","Water supply capacity, position and incoming hardness","This Contractor","P2 and P1","Re-routing within a manufactured wall"],
["F-06","Clear internal heights — canopy, duct zone and finished ceiling, coordinated","This Contractor","P2","The commonest late discovery: the duct does not fit above the canopy under the ceiling"],
["F-07","Clear widths on the route for the three largest items, from the external door to the final position","This Contractor","P2","A door manufactured 400 miles away, and an oven on a lorry outside it"],
["F-08","Roof loading and position for condensers, fans and any roof-mounted plant","This Contractor","P2","Roof structure and the 20-year membrane warranty at P2 4.4"],
["F-09","Duct route and roof termination position, with the separation to intakes and to sleeping accommodation","This Contractor","P2 and the fire engineer","A roof penetration in the wrong place, and a warranty to argue about"],
["F-10","Make-up air intake position relative to the extract discharge","This Contractor","P2","Short-circuiting: the kitchen draws in its own extract. Undetectable on paper, obvious on the first hot day"],
["F-11","The extract and cooking-power failure mode on fire alarm, confirmed by the fire strategy","Employer's fire engineer","This Contractor and P2","A cause and effect matrix that has to be rewritten after commissioning"],
["F-12","Acoustic separation from sleeping accommodation for all plant, per {{spec.16}}","This Contractor","P2 and the Employer","Plant that cannot run at night, in a kitchen that opens at 05:00"],
],

// [criterion, requirement, how verified]
perf: [
["Production capacity","124 main-course covers within 45 minutes from a chilled or fresh start","The test meal at {{spec.7}}, witnessed"],
["Regeneration capacity","101 covers within 30 minutes","Measured at commissioning"],
["Servery throughput","200 covers per hour per line, two lines independent","The test meal, measured"],
["Queueing","Not exceeding 10 minutes at the 90th percentile at 124 covers","The test meal, timed"],
["Hot holding","63 °C or above for a 90-minute service period, recordable","Measured at commissioning and at the test meal"],
["Blast chilling","70 °C to 3 °C within 90 minutes for 60 covers","Measured at commissioning"],
["Dish wash throughput","124 covers within 45 minutes of the end of a service period","The test meal, followed by a full wash-up cycle"],
["Dish wash final rinse","82 °C or above, sustained through the SP4 cycle","Measured at commissioning and during the test meal"],
["Chill room temperature","1–4 °C, held at the full stock loading with the door cycled","Measured over 24 hours at full load, not empty"],
["Freezer temperature","−18 °C or colder, same condition","As above"],
["Canopy extract","Not less than 5.0 m³/s, and the capture velocity DW/172 requires at every appliance","Measured at every canopy at commissioning"],
["Kitchen pressure","Not more than 5 Pa negative relative to dining at any operating condition","Measured with all extract and make-up air running"],
["Make-up air temperature","Not less than 18 °C in winter at the supply terminal","Measured, and calculated for the design condition"],
["Duct access","Every panel reachable without dismantling equipment or erecting a scaffold","Demonstrated at commissioning, not drawn"],
["Suppression","Discharges and isolates power to every protected appliance","Demonstrated, per the manufacturer's commissioning"],
["Extract on fire alarm","Extract and cooking power shut down on activation, per {{spec.12}}","DEMONSTRATED jointly with P2 at commissioning, against the cause and effect matrix"],
["Hot water","No service period or wash-up cycle constrained; 82 °C rinse sustained","The test meal"],
["Grease separator","Sized to BS EN 1825-2 for the calculated flow; emptying access without entering the kitchen","Calculation submitted; access demonstrated"],
["Electrical demand","Maximum demand after diversity not exceeding 200 kVA","Calculation submitted at tender; measured at the test meal"],
["Plant noise","Not exceeding 40 dB(A) at the nearest bedroom window at night, and within the planning limit","Assessment at tender; measured at commissioning at night"],
["Refrigerant","GWP not exceeding 150; leak detection on every walk-in system","Manufacturer's data and the commissioning record"],
["Finishes","PTV ≥ 36 wet; impervious; withstand 38 months of daily cleaning with the Operator's approved products","Manufacturer's data plus an in-situ pendulum test on a sample"],
],

// [deliverable, requirement]
handover: [
["As-installed drawings and model","Every discipline, reflecting what was built. Produced from the model, not separately from it"],
["O&M manuals","Every item, indexed, with the manufacturer's literature and the spares schedule"],
["Commissioning certificates","Individual results for every measurement at {{§performance}}. Summaries are rejected"],
["The test meal record","Covers served, times, queue measurement, temperatures, and the wash-up cycle. Signed by the Employer and P5"],
["Asset register","In the schema at P2 Appendix 11, with identifiers on physical labels, and a criticality rating per asset"],
["Maintenance schedule","Task, frequency, standard and trade per asset, so that P5 can price its regime rather than discover it"],
["Warranties","Assigned to the Employer, including every manufacturer's equipment warranty and its start date"],
["Grease separator data","Sizing calculation, assumed emptying frequency, and the access route"],
["Refrigerant inventory","Per system: refrigerant, charge, GWP, CO₂e, leak-check interval and the F-gas record from commissioning"],
["Duct access drawing","Every access panel and the means of reaching it"],
["Training","Not fewer than 2 recorded sessions for P5's catering management and staff, covering failure as well as operation"],
["Spares and consumables","12 months' consumables and a critical spares holding, listed and priced separately at {{§pricing}} item J"],
],

programme: [
["1","The date that governs this package",
  "The kitchen shell is handed to this package at the Section 1 sectional completion, at the end of month 3 of the P2 programme, and the first meal is served on the day the first 65 residents arrive.\n\nTHAT DATE IS THE FIXED POINT. Sixty-five people arriving to a village with no kitchen are sixty-five people the Employer accommodates and feeds commercially, at the rate at {{programme.3}}, until there is one.\n\nWorking backwards from it: the test meal at {{spec.7}} not less than 2 weeks before; commissioning complete not less than 3 weeks before; handover to P5 and training not less than 4 weeks before, per IF-08. The Contractor's programme shall show each of them and shall show the float it holds."],
["2","And the date that governs everything else",
  "The freeze date at {{§freeze}} — eight weeks before P2 commences manufacture — falls MONTHS before this Contractor is on site. It is the earlier of the two dates and it is the one a fit-out contractor is least accustomed to.\n\nThe Contractor's design is settled at the freeze date, not at mobilisation. Its tender programme shall show the design period leading to it and shall name the person responsible for the information P2 needs."],
["3","Delay",
  "Liquidated damages of £145 per bed per calendar day apply where the first meal service is not available on the date the first section is occupied, calculated on the beds occupied and unfed, and capped in aggregate at 7.5% of the contract sum.\n\nThe rate is the same as the P2 sectional rate and is built up the same way — substitute accommodation, subsistence, travel and administration — because the loss is the same loss: a resident who cannot be fed here is accommodated elsewhere. The build-up is at clause 18.2 of the P2 requirements and it is not restated so that there is one version of it.\n\nWhere the first meal service is unavailable for a cause within P2 — a shell handed over late or not to the freeze register — the damages do not fall on this Contractor, and the Contractor's duty is to have given the early warning that proves it."],
],

hse: [
["1","CDM and the site",
  "The Employer has appointed a Principal Designer and Principal Contractor for the project. This Contractor is a contractor under CDM 2015 and complies with the construction phase plan. Nothing in this document appoints it to either statutory role.\n\nThe Employer's site rules apply, including induction, competence cards, drug and alcohol testing, PPE and permits. Installation takes place alongside a live construction site and, for the later sections, alongside an OCCUPIED VILLAGE."],
["2","Working next to people who are asleep",
  "From the Section 1 sectional completion onward there are residents 40 metres away, and a proportion of them are asleep at every hour.\n\nThe Contractor shall plan noisy work — core drilling, fixing, plant commissioning, extract balancing — by zone and shift under the same discipline P5 applies at its own clause on quiet hours, and shall agree its noisy-work windows with the Employer weekly rather than starting at eight and finding out.\n\nCommissioning the extract at full volume at two in the afternoon wakes the night shift. It is not a courtesy point: they work a 12-hour shift that evening."],
["3","Hot works, and the specific risk here",
  "Hot works permit required, issued by the Principal Contractor, with a fire watch during and for not less than 60 minutes after.\n\nThe specific risk in this package is hot works in a building with a grease extract system partly installed and a suppression system not yet commissioned. The Contractor shall not carry out hot works within a canopy or duct once grease-bearing surfaces exist, and shall state in its method statement the point in its sequence after which that prohibition applies."],
["4","Manual handling and lifting into a finished building",
  "Equipment is lifted into a completed building through a door. The Contractor shall produce a lifting and handling plan for every item exceeding 100 kg, covering the route, the equipment used, the floor protection and the floor loading during the move — which is a point load on a manufactured floor and is not the same as the loading in service."],
],

info: [
["1","What the Employer receives, and in what form",
  "The asset register in the schema at P2 Appendix 11 — not a new schema, and not a folder of PDFs. Identifiers are allocated in the P2 convention and are on durable physical labels on the equipment.\n\nEvery document issued through the Employer's common data environment, named to BS EN ISO 19650-2 and the project code. A document sent by email is not issued.\n\nThe model produced and issued in native format and as IFC 4, on the origin agreed with P2 — a kitchen modelled on its own origin is a kitchen that cannot be federated with the building it sits in.\n\nCriticality rating on every asset: 1 where a service period cannot run without it, 2 where the service is degraded, 3 otherwise. P5 builds its Priority 1 list from it, so a wrong rating becomes a wrong response time for 38 months."],
],

change: [
["1","Who may instruct",
  "Only a written instruction from the Employer's Representative. Not P2, not P5, not the Principal Contractor, and not a caterer with a preference.\n\nRequests from the Operator to change equipment, layout or specification are referred to the Employer's Representative within 2 working days. On a kitchen this is the commonest route by which unpriced scope arrives: a chef's preference, agreed to be helpful during commissioning, and permanent."],
["2","How a change is valued",
  "In this order: the rates in the activity schedule at {{§pricing}}; those rates pro rata; then a fair valuation from the all-in rates the Contractor states in its tender — hourly rates by trade and grade, percentage additions for overhead, profit and sub-contracted work. They are competed at tender because that is the only moment competition exists.\n\nA change instructed after the freeze date carries the P2 consequence at {{freeze.4}} as well as its own cost, and the Contractor shall quote both before the instruction is issued."],
],

defects: [
["1","Defects liability",
  "12 months from the date of certified handover of the kitchen. Where a defect is rectified, the period for that item begins again from rectification. Where the same defect occurs in more than one item of the same type, it is systemic: the Contractor investigates the cause and rectifies every instance including those not yet reported.\n\nEquipment warranties run from commissioning and are assigned to the Employer, with their start dates recorded in the asset register."],
["2","Response, in an operating kitchen",
  "PRIORITY 1 — anything that stops a service period: the primary cooking capacity, the servery, the dish wash, a walk-in cold room, the extract, the suppression system, the hot water, or a drainage blockage. ATTEND WITHIN 4 HOURS. Make safe or provide a working alternative within 8. Rectify within 5 working days.\n\nPRIORITY 2 — a single item out of service where the period can still run: rectify within 5 working days.\n\nPRIORITY 3 — cosmetic and non-operational: 20 working days, and may be batched.\n\nTHE TIMES ARE DELIBERATELY THE SAME AS THE P2 DEFECTS REGIME and are longer than P5's reactive times, because P5's maintenance contractor is on site and this Contractor is travelling. Where an item falls to both, P5 attends first to its own times and this Contractor rectifies to these — the Operator sees the faster of the two.\n\nACCESS. This kitchen serves 5 periods a day. The Contractor shall work around service, or out of hours, and shall price for it. A rectification that requires the kitchen for a day requires the Employer's agreement and a plan for feeding 225 people that day."],
["3","Obsolescence and support",
  "For every item the Contractor shall state at tender: the manufacturer's committed spares availability period from handover; the notice given of end-of-life; and whether the control system is open or proprietary.\n\nSpares and support shall be available for not less than the 38-month deployment plus 24 months. Where a manufacturer will not commit, the Contractor shall say so at tender rather than after.\n\nNo item shall be offered whose function depends on a subscription, licence or cloud service that, if not renewed, disables it or its monitoring. Where a subscription is required for anything else, its cost for the deployment plus 24 months is stated and included."],
],

sustain: [
["1","Energy and water",
  "The kitchen is the largest single energy user in the village. The Contractor shall state, with its tender, the predicted annual energy and water consumption of its equipment selection at the demand at {{§demand}}, with the assumptions disclosed, and shall be evaluated on it.\n\nEquipment shall be selected on whole-life cost and not on capital cost alone. Where a higher-capital item has a lower predicted consumption, the Contractor shall offer it and show the comparison over 38 months — the Employer will take the better trade, but only if it is shown the arithmetic.\n\nThe sub-metering at EQ-37 exists so that the declaration can be checked against measured data in operation, and P5 will check it."],
["2","Waste and heat recovery",
  "Food waste is P5's to reduce, but it is this package's to make measurable: provision for segregated food waste storage, chilled where the collection interval requires it, sited on the dirty route at {{spec.2}}.\n\nHeat recovery from the extract shall be offered and priced as an option, with the payback stated over the REMAINING term rather than over the life of the equipment.\n\nWater: pre-rinse spray valves, flow restriction where it does not compromise the 82 °C rinse, and condensate management that does not simply run to drain."],
],

labour: [
["1","Ethical employment",
  "The Employer Pays Principle applies without exception: no worker on this package pays any fee to obtain or keep work, and any fee already paid is reimbursed. No identity document retained. A written contract in a language the worker understands. Working time recorded.\n\nCompliance with the Modern Slavery Act 2015, with a statement under section 54 where turnover requires one and an equivalent policy where it does not.\n\nThe requirements flow down unamended to every sub-contractor. The Employer may audit any of them, may bring an independent auditor, and may interview workers privately without a representative of the Contractor present.\n\nThe place of manufacture of the principal equipment shall be disclosed at tender. Catering equipment is manufactured globally and the Employer will not audit a factory it has not been told about."],
],

relocation: [
["1","The kitchen moves too",
  "The village is intended to be dismantled and re-erected on at least one further site. The equipment in this package is a substantial part of its residual value and most of it is capable of being moved.\n\nThe Contractor shall provide, with its tender, a relocation statement covering: which items are demountable and reusable; which are consumed by removal — bonded floor finishes, sealed penetrations, ductwork, fixed pipework — and must be renewed each time, with a budget rate for each; the condition the equipment can be expected to be in after 38 months; and the manufacturer's position on re-commissioning and warranty after a move.\n\nIt shall not design so as to make relocation impossible: fixings demountable where they can be, services connected so that equipment can be isolated and removed, and the duct and canopy arrangement recorded so that it can be rebuilt rather than redesigned.\n\nThe relocation works are not in this package and are not priced here. What is required is that the design does not prevent them and that the Employer is told, before award, what a move will cost it in renewed components."],
],
};
