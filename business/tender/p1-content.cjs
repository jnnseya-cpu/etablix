// Employer's Requirements — P1 Civil Works and Infrastructure.
// Written against the same twenty-five findings as the P2 gap register.
module.exports = {
  meta: {
    client: "Marrowbridge Infrastructure Ltd",
    project: "Project NORTHREACH — Workforce Accommodation Village",
    package: "P1 — Civil Works and Infrastructure",
    ref: "NR-ER-P1", rev: "A", date: "September 2026",
    scope: "Bases for 114 modules across 8 accommodation blocks and the amenity, kitchen and reception buildings; roads, hardstanding, drainage, services to the termination points, and reinstatement",
  },

  opening: [
    ["1","First on, last off, and everything is built on what this package leaves behind",
      "This package is on site before anyone else and it is still there after everyone else has gone. It builds nothing anybody sleeps in and it is the reason everything else stands up.\n\nTHE DEFINING FACT. Every other package works to a tolerance this one sets. 114 modules are manufactured 400 miles away to a dimension, and they are set on bases built here to a tolerance measured in millimetres. A base 8 mm out is not a civils defect; it is a module that does not sit, a joint that does not seal, and a delivery vehicle standing on a haul road with nowhere to put its load.\n\nTHE SECOND FACT. This package builds much of its work BEFORE the packages that depend on it have finished designing. Drainage inverts, service positions and base levels are fixed while P2 is still developing its module and P3 is still selecting its equipment. That is unavoidable and it is why {{§tolerance}} and the interface schedule at {{§iface}} matter more here than the specification of any material.\n\nTHE THIRD FACT, and the one that gets people hurt. This package excavates, it lifts, and from month 3 it does both alongside a village where people are asleep. {{§hse}} and {{§occupied}} are written for that and they are not boilerplate."],
    ["2","Output specification, and where this document departs from it",
      "The default is an OUTPUT specification. The Employer states the outcome — a bearing pressure, a tolerance, a discharge rate, a settlement limit — and the Contractor designs the earthworks, the pavement, the drainage and the foundations that achieve it, and warrants that they do.\n\nEvery line of the works register at {{§works}} carries a code.\n\nE — EMPLOYER-PRESCRIBED. The Employer has specified the thing. The Contractor provides it as described and the Employer carries the risk that what is described achieves the outcome.\n\nC — CONTRACTOR-DESIGNED. The Employer has stated a duty. The Contractor investigates, designs, selects and warrants the means.\n\nThe prescribed lines here are of two kinds and no others: a TOLERANCE or LEVEL that another package has to build to and cannot discover later, and a STATUTORY or LIFE-SAFETY requirement. Everything else is a duty.\n\nGROUND CONDITIONS ARE THE CONTRACTOR'S. The ground investigation available is at {{§appendices}} and it is not exhaustive. The Contractor shall satisfy itself, shall carry out any further investigation its design requires, and shall price it. Where a condition is encountered that could not reasonably have been foreseen from the information provided and a competent investigation, {{change.3}} states how it is dealt with — because pretending that risk does not exist produces a priced allowance nobody can see and an argument nobody can settle."],
    ["3","What is NOT in this package",
      "Anything above the termination points, and anything inside a building. The modules, their structure and their internal services are P2 Modular Accommodation. The kitchen fit-out is P3. Loose furniture is P4. Operation is P5.\n\nThe distinction is stated in a single line because it is where the money is lost: THIS PACKAGE DELIVERS A SERVICE TO A POINT, AT A POSITION, AT AN INVERT, WITH A STATED CHARACTERISTIC. What happens on the other side of that point belongs to somebody else, and what happens on this side of it belongs here, including making good if it is wrong.\n\nWhere a requirement of another package cannot be met because of something delivered here, the Contractor's duty is to raise it under {{§change}}, not to leave it for the package that finds it."],
  ],

  defs: [
    ["Base", "The foundation on which one module sits. 114 of them, and the tolerance at {{§tolerance}} applies to every one."],
    ["Block", "One accommodation building, formed of several modules set on adjacent bases. 8 of them, plus the amenity, kitchen and reception buildings."],
    ["CBR", "California Bearing Ratio — the measure of subgrade strength the pavement design is built on. Established by the Contractor's investigation, not assumed."],
    ["Differential settlement", "The difference in settlement between two points. It is the figure that damages a building; total settlement on its own rarely does. {{§tolerance}}."],
    ["E / C", "The basis codes at clause 1.2. E means the Employer prescribed it and carries the risk it works; C means the Employer stated a duty and the Contractor warrants the means."],
    ["FFL", "Finished floor level of a module, set by the base level. The 15 mm threshold requirement at P2 clause 4.5 is measured from it to the external finished level — see {{tolerance.4}}."],
    ["HSG47", "The HSE guidance on avoiding danger from underground services. The basis of the permit-to-dig regime at {{hse.3}}."],
    ["Outrigger pressure", "The load a crane puts into the ground through one outrigger pad. Stated by P2, designed for here. The most dangerous number in this document — {{spec.7}}."],
    ["Segregation line", "The physical line between the village and the live construction site. Built under this package and shown on NR-TW-VIL-0201."],
    ["Termination point", "Where a service provided under this package ends and another package's begins. One per service per block: water, foul, power, data. Position, invert and characteristic all stated."],
    ["Tolerance", "The permitted deviation from a stated dimension or level. Not an aspiration and not a target — the figure beyond which the work is rejected."],
  ],

  // ------------------------------------------------------ the works register
  // [ref, work, requirement or duty, basis, note]
  works: [
    ["GROUND AND EARTHWORKS","","","",""],
    ["W-01","Site clearance and preparation","Clear the village and laydown areas of vegetation, obstructions and made ground, within the ecological constraints of the CEMP and the seasonal restrictions it imposes","C","The seasonal restriction is the programme risk. Confirm it before pricing"],
    ["W-02","Earthworks","Cut, fill, compact and test to achieve the formation levels and the subgrade the pavement and foundation designs require. Cut and fill balanced on site so far as the levels permit","C","Material taken off site is a cost and a carbon consequence — {{§sustain}}"],
    ["W-03","Ground improvement","Where the Contractor's investigation shows the ground will not achieve the settlement limits at {{§tolerance}} without it","C","The need is the Contractor's to establish. The limits are the Employer's"],
    ["W-04","Module bases","114 bases, to the tolerances at {{§tolerance}}, each surveyed and the survey issued","E","THE TOLERANCES ARE PRESCRIBED. Everything else about the base is the Contractor's design"],
    ["W-05","Building slabs","Slabs to the kitchen and dining, amenity and reception buildings, to the loadings at {{spec.4}}","E","The kitchen loading is at {{spec.4}} and it is NOT the loading P2 Appendix 8 currently carries"],
    ["ROADS, HARDSTANDING AND EXTERNAL AREAS","","","",""],
    ["W-06","Site roads and haul routes","Designed for the construction traffic including 114 abnormal load deliveries, and for the operational traffic for 38 months thereafter, without reconstruction in between","C","A road built for construction and re-laid for operation is two roads"],
    ["W-07","Crane hardstanding","Designed to the outrigger bearing pressure P2 states, proved by plate bearing test before any lift","E","{{spec.7}}. THE MOST DANGEROUS NUMBER IN THIS DOCUMENT"],
    ["W-08","Laydown area","0.42 ha as shown on NR-TW-VIL-0201, surfaced and drained for module storage at the stated bearing pressure","E","The extent is fixed. P2 has been told it is smaller than it may assume"],
    ["W-09","Car parking and transport pick-up","Parking to the planning allocation, and a bus turning and pick-up facility sized for the transport fleet under P5","C","P5 runs buses on shift change. The turning circle is sized for the vehicle it will actually use"],
    ["W-10","Footpaths and external routes","Between every block and the amenity, kitchen and reception buildings, and to the transport pick-up. Slip resistant, drained, lit, and gritted in winter by P5","E","A night-shift worker walks these at 05:00 in January. {{spec.11}}"],
    ["DRAINAGE","","","",""],
    ["W-11","Foul drainage","Collection from every block termination point to the outfall, sized for the peak occupancy at Appendix 6 of the P2 requirements with a congested-use discharge unit loading","C","124 leave for day shift and 101 come off nights inside the same 40 minutes. Domestic loading is the wrong basis"],
    ["W-12","Surface water and attenuation","Discharge from the site restricted to 5 litres/second per hectare, with attenuation sized for the 1 in 100 year event plus 40% for climate change","E","The 5 l/s/ha is the planning condition. The 1 in 100 + 40% is the Employer's requirement"],
    ["W-13","Grease separator chamber and connection","Chamber, access and connection for the separator provided under P3, sited so it can be emptied without a tanker entering the village or crossing a footpath","E","{{spec.10}}, and P3 IF-06. A separator that can only be emptied from inside is not emptied"],
    ["SERVICES TO THE TERMINATION POINTS","","","",""],
    ["W-14","Water supply and distribution","To 8 block termination points plus the kitchen, at not less than 2.0 bar dynamic at 1.5 l/s at each, with a static head not exceeding 5 bar","E","P2 and P3 design to these figures. If they cannot be achieved, say so before they are relied on"],
    ["W-15","Electrical supply and distribution","To 8 block termination points at 400/230 V, 50 Hz, three phase and neutral, TN-S, at not less than 250 kVA per block, plus a dedicated supply to the kitchen at not less than 200 kVA","E","{{spec.12}}. The prospective fault current is confirmed by the Contractor, not assumed"],
    ["W-16","Standby generation","One 500 kVA set, its base, enclosure, fuel storage, bunding and changeover, serving life-safety and essential loads only","E","P2 and P5 state the circuits they require supported. This package provides the set and the changeover"],
    ["W-17","Data and communications ducting","Duct and draw rope to every block termination point and to the kitchen, with 2 no. single-mode fibre pairs per block terminated","E",""],
    ["W-18","External lighting","To every footpath, road, car park, transport pick-up and assembly point, to the levels at {{spec.11}}, full cut-off, and not spilling into a bedroom window","E","Two requirements pulling against each other, and both are stated"],
    ["FIRE, BOUNDARY AND SITE","","","",""],
    ["W-19","Fire appliance access and hydrants","Access and hydrants to {{spec.14}}, available from the FIRST occupation and not from completion","E","People sleep here from month 3. The fire service does not wait for the last block"],
    ["W-20","Fencing, gates and the segregation line","The village boundary, the gatehouse position, and the physical segregation line between the village and the live construction site","E","{{§occupied}}. It is a physical line, not a notional one"],
    ["W-21","Landscape and ecology","Planting, habitat and the works the CEMP requires, within its seasonal constraints","C",""],
    ["TEMPORARY WORKS, RECORDS AND REINSTATEMENT","","","",""],
    ["W-22","Temporary works and temporary drainage","All temporary works to BS 5975, and drainage of the site during construction so that a partly built village does not flood the part that is occupied","C","{{hse.2}}"],
    ["W-23","As-built survey and the relocation record","Every base, service, invert, chamber and duct surveyed and recorded to a stated coordinate system, issued as data","E","{{§info}}. This is what the village is relocated with, and it is a deliverable in its own right"],
    ["W-24","Reinstatement","Removal of hardstanding, bases and services at the end of the deployment, and reinstatement to the condition the planning consent requires","E","{{§demob}}. Priced now, carried out in 38 months, and it is the item everybody forgets to price"],
  ],

  // ------------------------------------------------------------- tolerances
  toleranceNote:
    "This is the section the rest of the project is built on. Every figure is a REJECTION THRESHOLD, not a target: work outside it is not accepted and is corrected before the package that depends on it arrives.\n\nThe tolerances at rows 1 to 3 are taken verbatim from clause 4.1 of the P2 Employer's Requirements, because they are P2's requirement of this package and there must be one version of them. The rest are this package's own.",
  // [ref, what, tolerance, measured how, why it matters]
  tolerances: [
    ["T-01","Level across any single base","± 5 mm","Levelled survey, every base, before handover","A module sits on the base. Out of level, it does not sit flat and the inter-module joint does not close"],
    ["T-02","Plan position of a base","± 10 mm","Coordinated survey against the setting-out drawing","Out of position, the module overhangs or the services miss their termination"],
    ["T-03","Relative level between adjacent bases supporting ONE module","± 3 mm","Survey, every adjacent pair, computed and reported","THE TIGHTEST FIGURE IN THIS DOCUMENT. A module spanning two bases at different levels is racked before it is loaded"],
    ["T-04","External finished level at every door threshold, relative to module FFL","−15 mm to 0 mm","Survey at every external door after external works","P2 clause 4.5 requires a threshold not exceeding 15 mm. It is achievable only if this package's finished level is right, and it is scheduled at P2 IF-15"],
    ["T-05","Base bearing surface flatness","3 mm under a 1 m straightedge in any direction","Straightedge, at not fewer than 5 positions per base","A base level on average and dished in the middle bears on its edges"],
    ["T-06","Setting-out of the block grid, cumulative","± 15 mm over the length of any block","Survey against the setting-out drawing","Cumulative error across 8 or 10 bases is what pushes the last module off its base"],
    ["T-07","Service termination position, horizontal","± 50 mm","As-built survey","P2 and P3 connect to it. Beyond this it is a re-route, on their side, at their cost or an argument about whose"],
    ["T-08","Service termination invert, vertical","± 25 mm","As-built survey","A foul invert 60 mm high is a drain that does not fall. It is discovered when the building is occupied"],
    ["T-09","Finished road and hardstanding level","± 20 mm","Survey grid at not more than 10 m centres","Ponding, and a haul route that holds water in front of a delivery"],
    ["T-10","Drainage gradient","Within 10% of the design gradient, and never flatter than the minimum for the pipe size","Survey of invert levels at every manhole","A gradient laid flat is a blockage in year two"],
    ["T-11","Total settlement of any base over the deployment","15 mm maximum","Monitoring per {{spec.5}}","See {{spec.5}}. Total settlement rarely damages a building on its own"],
    ["T-12","Differential settlement between adjacent bases under one module","5 mm maximum","Monitoring, computed per pair","THIS IS THE ONE THAT DAMAGES THE BUILDING. It racks the module, opens the joint and breaks the service connection"],
    ["T-13","Differential settlement across any one block","10 mm maximum","Monitoring, computed across the block","Doors bind, drainage falls reverse, and nobody connects it to the ground"],
  ],
};
