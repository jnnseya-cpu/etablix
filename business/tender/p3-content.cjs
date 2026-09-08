// Employer's Requirements — P3 Kitchen and Catering Fit-Out.
// Written against the same twenty-five findings as the P2 gap register.
module.exports = {
  meta: {
    client: "Marrowbridge Infrastructure Ltd",
    project: "Project NORTHREACH — Workforce Accommodation Village",
    package: "P3 — Kitchen and Catering Fit-Out",
    ref: "NR-ER-P3", rev: "A", date: "September 2026",
    shell: "610 m² kitchen and dining building, constructed under P2 and handed to this package",
  },

  opening: [
    ["1","The one risk in this package, and where it sits",
      "This package fits out a building it does not build, to serve a demand it does not control, for an operator it is not.\n\nThe equipment is the easy part. Every serious risk in this package is at its boundary: the penetrations through a module that is manufactured in a factory four hundred miles away; the floor loading under a cold room; the drainage falls beneath a floor that is laid before anybody stands a kettle on it; the extract route through a roof somebody else warrants; the electrical supply; the ceiling height; and the width of the door the combi oven has to come through.\n\nEVERY ONE OF THOSE IS FIXED BEFORE P2 MANUFACTURES. After manufacture a penetration is a variation to a completed module built four hundred miles away, and it is priced accordingly. {{§freeze}} states what must be frozen, by whom, and by when, and it is the most important section in this document.\n\nThe Employer draws the tenderer's attention to it in these terms because the classic failure of a kitchen fit-out package is that it is priced against a shell it did not draw, by a contractor who assumed the shell would suit it, and the discovery is made on site."],
    ["2","Output specification, and where this document departs from it",
      "The default is an OUTPUT specification: the Employer states the duty and the Contractor selects, sizes and warrants the equipment that meets it. A kitchen specified by product schedule is a kitchen designed by the Employer, and the Employer then owns the question of whether it can produce the covers.\n\nEvery line of the equipment schedule at {{§equipment}} carries a code.\n\nE — EMPLOYER-PRESCRIBED. The Employer has specified the article, the dimension or the arrangement. The Contractor provides what is described and the Employer carries the risk that what is described achieves the duty.\n\nC — CONTRACTOR-DESIGNED. The Employer has stated a duty — a number of covers in a number of minutes, a temperature, a throughput, a rate. The Contractor selects and sizes the equipment and warrants that it achieves the duty.\n\nA KITCHEN CARRIES MORE PRESCRIPTION THAN A SERVICE CONTRACT DOES, and the Employer states why rather than claiming otherwise: 25 of the 38 lines below are Employer-prescribed. They fall into three groups and no others — a statutory floor (63 °C hot holding, the suppression system, the extract failure mode); a food safety flow that is not a matter of preference (raw and ready-to-eat separation, dirty-to-clean routing); and an interface dimension that another package has to build to and cannot discover later. Everything else is a duty and the Contractor designs to it."],
    ["3","What is NOT in this package",
      "The building. The shell, its structure, envelope, floor, roof, external doors, windows and the services up to the termination points are constructed under P2 Modular Accommodation. What P2 provides and in what state is at {{§iface}}.\n\nThe operation. Food, staff, menus, HACCP, cleaning and the running of the kitchen are under P5 FM and Operation. This package hands over a commissioned kitchen and trains the people who will use it — see {{§handover}}.\n\nExternal drainage beyond the building, and the incoming utility supplies, are P1 Civil Works.\n\nWhere a requirement of this document cannot be met because something provided under another package is inadequate, the Contractor's duty is to raise it before manufacture, not to work around it. A kitchen that works around its shell is a kitchen that is harder to clean, harder to maintain and shorter-lived than the one that was paid for."],
  ],

  defs: [
    ["Cover", "One meal served to one person. The demand at {{§demand}} is stated in covers because that is the only unit that sizes a kitchen."],
    ["DW/172", "The HVCA specification for kitchen ventilation systems. The reference standard for the canopy, the ductwork and its access."],
    ["Duty", "What a piece of equipment must achieve — covers in a period, a temperature, a throughput. The Contractor selects the equipment; the Employer states the duty."],
    ["E / C", "The basis codes at clause 1.2. E means the Employer prescribed it and carries the risk it works; C means the Employer stated a duty and the Contractor warrants the means."],
    ["F-gas", "The Fluorinated Greenhouse Gases Regulations. It governs the refrigerant this kitchen may use and the servicing regime for the life of the equipment — see {{spec.14}}."],
    ["Freeze date", "The date after which an interface dimension cannot change without a variation to a manufactured module. {{§freeze}}."],
    ["HACCP", "Hazard Analysis and Critical Control Points. Operated by P5, but the LAYOUT that makes it possible is designed here — see {{spec.2}}."],
    ["Grease separator", "The device that keeps kitchen fat out of the drainage. Sized to BS EN 1825. The single most common cause of a kitchen closing unexpectedly."],
    ["Interlock", "The control that shuts off the fuel or power to cooking equipment when the extract is not running. Mandatory where gas is used. {{spec.12}}."],
    ["Make-up air", "Air supplied to replace what the canopy extracts. A kitchen without it pulls air from the dining room and the fire doors will not close."],
    ["Service period", "One of the five periods at {{§demand}} in which meals are served. A shift-working village has five, not three."],
    ["Shell", "The 610 m² building constructed under P2 to receive this package."],
    ["The Operator", "P5 FM and Operation, who will run this kitchen for 38 months and who is trained under {{§handover}}."],
  ],

  // ------------------------------------------------------------ the demand
  demandNote:
    "Every number in this package comes from this table. It is derived from the bed demand curve and the day-shift proportion at Appendix 6 of the P2 requirements, at the peak: 225 residents, of whom 124 work days and 101 work nights.\n\nA SHIFT-WORKING VILLAGE HAS FIVE SERVICE PERIODS, NOT THREE. A kitchen sized on three will fail, and it will fail at the two periods a conventional design does not know exist: the night shift coming off at seven in the morning wanting a main meal, and the night shift going on at half past five wanting breakfast.",
  // [ref, period, times, who, covers, note]
  demand: [
    ["SP1","Day-shift breakfast","05:30 – 06:45","Day shift, before a 07:00 start","124","The largest breakfast and the tightest window"],
    ["SP2","Night-shift main meal","07:15 – 08:30","Night shift, coming off a 12-hour shift","101","A MAIN MEAL, not a breakfast. They have worked all night"],
    ["SP3","Night-shift breakfast","17:30 – 18:45","Night shift, before a 19:00 start","101","Their first meal of the working day"],
    ["SP4","Day-shift main meal","19:30 – 21:00","Day shift, after a 12-hour shift","124","The busiest period and the sizing case for the servery"],
    ["SP5","Night hot meal","00:00 – 01:00","Night shift, mid-shift","40","Assumed take-up 40% of the night shift. Hot and cooked — see {{spec.5}}"],
  ],
  demandTotals: [
    ["Hot covers per day, at peak occupancy","490"],
    ["Packed meals per day (one per resident going to shift)","225"],
    ["Busiest service period","SP4 — 124 covers in 90 minutes"],
    ["Servery throughput required","200 covers per hour. 60% of a period's covers arrive in its first 30 minutes, and the queueing limit at {{spec.8}} is 10 minutes"],
    ["Peak concurrent diners","50. Seating is provided at 100 — see {{spec.9}}"],
    ["Design basis for equipment","SP4 at 124 covers, produced within the period from a chilled or fresh start"],
  ],

  // ------------------------------------------------------- the area schedule
  areasNote:
    "The 610 m² shell provided under P2 is allocated as below. The allocation is the Employer's and is an input: it was derived from the demand at {{§demand}} and it is what the shell was sized on.\n\nA tenderer proposing a different allocation shall price it as a departure and shall state the effect on the shell, because a change to the internal arrangement after the freeze date at {{§freeze}} is a change to a manufactured module.",
  // [area, m², basis, note]
  areas: [
    ["Dining","200","100 seats at 2.0 m² including circulation","Twice the peak concurrent figure, so that nobody waits for a seat and a crew can sit together"],
    ["Servery","60","Two lines at 200 covers/hour, plus beverage and packed-meal collection","Packed-meal collection is separate from the hot line — otherwise SP1 blocks"],
    ["Production kitchen","150","490 hot covers/day across 5 periods","Includes hot, cold and pastry sections with the flow at {{spec.2}}"],
    ["Wash-up","45","Pot wash and dish wash, separated","THE MOST UNDER-SIZED AREA IN EVERY KITCHEN. It is stated separately here so it cannot be absorbed"],
    ["Cold stores and dry goods","75","4 days' stock at peak, with a 7-day dry goods holding","Delivery to a remote site is not daily. Section {{spec.3}}"],
    ["Waste and dirty goods-in","25","Segregated, with a route that does not cross the clean route","{{spec.2}}"],
    ["Staff changing, office and WCs","40","For the Operator's catering establishment under P5","Provided here, used by P5"],
    ["Plant, risers and circulation","15","",""],
    ["TOTAL","610","","Matches the shell at item C2 of the P2 activity schedule"],
  ],

  // ------------------------------------------------- the equipment schedule
  // [ref, item, the duty or specification, basis, note]
  equipment: [
    ["GOODS IN, STORES AND REFRIGERATION","","","",""],
    ["EQ-01","Goods-in area","Level threshold, weather-protected, with a route to stores that does not cross the clean production route or the dining area","E","{{spec.2}}"],
    ["EQ-02","Walk-in chill room","Capacity for 4 days' chilled stock at 490 covers/day. Operating temperature 1–4 °C, monitored and alarmed","C","Sizing is the Contractor's; the 4 days is the Employer's, and it is a remote-site decision"],
    ["EQ-03","Walk-in freezer room","Capacity for 7 days' frozen stock at 490 covers/day. Operating temperature −18 °C or colder, monitored and alarmed","C",""],
    ["EQ-04","Dry goods store","7 days' holding, shelved, vermin-proofed, no shelf below 150 mm from the floor","E","The 150 mm is a cleaning and pest requirement, not a preference"],
    ["EQ-05","Refrigerant","Refrigerant with a GWP not exceeding 150 for any new equipment, and F-gas compliant for the life of the installation","E","{{spec.14}}. A high-GWP refrigerant is a servicing liability transferred to P5"],
    ["EQ-06","Temperature monitoring","Every chilled and frozen space continuously monitored, logged for not less than 90 days, and alarmed locally AND to the Operator's duty manager","E","A cold room that fails at 02:00 on a Saturday loses 4 days of stock and a service period"],
    ["PREPARATION","","","",""],
    ["EQ-07","Vegetable preparation","Separate section with its own sink, board colour discipline and drainage. Sized for 490 covers/day","C",""],
    ["EQ-08","Raw meat and fish preparation","SEPARATE section, separate sink, separate refrigeration, no shared route with ready-to-eat","E","This is a HACCP requirement and it is prescribed. See {{spec.2}}"],
    ["EQ-09","Preparation surfaces","Stainless steel to BS EN 10088 grade 1.4301 or better, coved to the wall, no open joint, no exposed fixing above the working plane","E",""],
    ["EQ-10","Hand wash basins","Not fewer than 1 per preparation section and 1 per 10 m of production run, wrist or sensor operated, with soap and paper to hand","E","A hand basin the wrong side of a bench does not get used"],
    ["COOKING","","","",""],
    ["EQ-11","Primary cooking capacity","Produce 124 main-course covers within 45 minutes from a chilled or fresh start, and hold them at 63 °C or above for the service period without deterioration","C","THE DUTY, not a schedule of ovens. The Contractor states what it has selected and why"],
    ["EQ-12","Regeneration capacity","Regenerate 101 covers within 30 minutes for SP2 and SP3","C",""],
    ["EQ-13","Boiling and bulk cooking","Capacity for stocks, sauces and bulk vegetables for 490 covers/day","C",""],
    ["EQ-14","Grilling and frying","Capacity for the menu cycle at P5, with fat management and no open fryer without a lid","E","An open fryer under a canopy is the commonest kitchen fire"],
    ["EQ-15","Fuel","ELECTRIC. Gas shall not be used in this kitchen","E","{{spec.12}} states the reason. A tenderer proposing gas prices it as a departure and prices the interlock, the detection and the isolation with it"],
    ["EQ-16","Hot holding","Hold 124 covers at 63 °C or above for the whole of a 90-minute service period, with the temperature recordable","E","63 °C is the statutory floor and the record is what proves it"],
    ["EQ-17","Blast chilling","Chill 60 covers from 70 °C to 3 °C within 90 minutes","C","Required for cook-chill of the night meal at SP5"],
    ["SERVERY AND DINING","","","",""],
    ["EQ-18","Servery lines","Two lines, each capable of 200 covers per hour, operable independently so that one can serve while the other is cleaned or restocked","E","The two-line requirement is the Employer's: a single line has no redundancy across 5 periods a day for 38 months"],
    ["EQ-19","Packed-meal collection","Separate point, not on the hot line, capable of issuing 225 packed meals across SP1 and SP3 without a queue exceeding 10 minutes","E","Separating it is what stops SP1 blocking"],
    ["EQ-20","Beverage provision","Available at every service period AND continuously between them, 24 hours","E","A night-shift worker at 03:00 gets a hot drink. It is a small thing and residents notice it"],
    ["EQ-21","Dining furniture","100 covers. Tables and seating cleanable, movable for cleaning, and durable for 38 months of continuous use","C","NOT part of P4 Furniture — dining furniture is here. See {{§iface}}"],
    ["EQ-22","Dining finishes","Floor slip resistance PTV ≥ 36 wet, wipe-clean walls to 1200 mm, ceiling cleanable","E","Consistent with the P2 finishes standard"],
    ["WASH-UP","","","",""],
    ["EQ-23","Dish wash","Throughput for 124 covers within 45 minutes of the end of a service period, with a final rinse at 82 °C or above","C","Sized on SP4"],
    ["EQ-24","Pot wash","SEPARATE from dish wash, with its own sink, drainer and space to land a stack pot","E","Sharing dish and pot wash is why the wash-up is always the bottleneck"],
    ["EQ-25","Clean and dirty separation","A physical separation and a one-way flow in the wash-up: dirty in, clean out, no crossing","E","{{spec.2}}"],
    ["EQ-26","Water softening","Where the incoming water hardness requires it, softened supply to dish wash and to any steam-generating equipment","C","Scale is the largest single maintenance cost in a hard-water kitchen"],
    ["VENTILATION AND SERVICES","","","",""],
    ["EQ-27","Canopy extract","Sized to DW/172 for the equipment installed. Total extract not less than 5.0 m³/s at the design condition","C","The 5.0 is the Employer's floor; the Contractor calculates and may exceed it"],
    ["EQ-28","Make-up air","The production kitchen shall not fall below 5 Pa negative relative to the dining area at any operating condition, and shall be tempered to not less than 18 °C in winter. Make-up air will not be less than 85% of the extract volume","C","THE DUTY IS THE PRESSURE. Without it the kitchen depressurises, the dining doors bind and the fire doors do not close — and nobody connects the two"],
    ["EQ-29","Grease filtration","Removable, dishwasher-safe filters at every canopy, with a spare set","E","A filter that cannot be cleaned in the dishwasher does not get cleaned"],
    ["EQ-30","Ductwork access","Access panels at every change of direction and at intervals not exceeding 3 m, to DW/172, reachable without dismantling equipment","E","{{spec.13}}. Grease duct cleaning is a statutory-adjacent obligation and an inaccessible duct is an uncleanable one"],
    ["EQ-31","Fire suppression","Wet chemical suppression to every cooking appliance under a canopy, to LPS 1223 or equivalent, interlocked to isolate power on discharge","E","{{spec.12}}"],
    ["EQ-32","Extract on fire alarm","The kitchen extract shall SHUT DOWN on fire alarm activation, and cooking power shall isolate with it, unless the fire strategy at P2 Appendix 2 requires otherwise in writing","E","{{spec.12}}. This is the clause the P2 gap register would call fatal if it were missing"],
    ["EQ-33","Hot water","No service period or wash-up cycle shall be constrained by hot water availability, and the dish wash final rinse shall reach 82 °C throughout SP4. Indicatively not less than 1,800 litres/hour at 60 °C; the Contractor calculates and warrants the figure","C","A kitchen's peak draw dwarfs the accommodation's. It shall be independent of the blocks' demand and shall not compete with it"],
    ["EQ-34","Drainage — floor","Gullies to every wet area, falls 1:60 to 1:80, gratings removable and rodding access without lifting equipment","E","{{spec.11}}"],
    ["EQ-35","Grease separator","Sized to BS EN 1825-2 for the calculated peak flow, minimum nominal size NS 4, sited so that it can be emptied WITHOUT ENTERING THE KITCHEN","E","{{spec.11}}. A separator that can only be emptied through the kitchen is emptied during a service period or not at all"],
    ["EQ-36","Electrical supply","Dedicated supply. Connected load not exceeding 320 kW; maximum demand after diversity not exceeding 200 kVA","E","{{spec.10}}, and it is checked against P2 Appendix 8"],
    ["EQ-37","Sub-metering","The kitchen separately metered for electricity, water and hot water, reporting to the village management system","E","P5 manages consumption from measured data. P2 clause 4.24 provides the point"],
    ["EQ-38","Emergency isolation","A single clearly marked emergency isolation for all cooking equipment, at every exit from the production kitchen","E",""],
  ],
};
