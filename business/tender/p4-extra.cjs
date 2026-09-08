// P4 — the boundary with P2, performance, handover, and the management sections.
module.exports = {

// ---------------------------------------------------------------- boundary
boundary: [
["1","Why this is the first section a tenderer should read",
  "This package has almost no independent work. Every serious risk in it is at the line where P2's fitted joinery stops and this package's loose furniture starts.\n\nTHE FAILURE THIS SECTION PREVENTS. P2 manufactures a bedroom in a factory, complete with a fitted wardrobe, a fitted desk worktop and fitted shelving. Months later this package arrives with a bed, a chair, a bedside unit and a bin. If the two lists were never reconciled, one of three things happens, and all three are discovered with 114 modules already built:\n\nAN ITEM IS SUPPLIED TWICE. Two parties both priced a bedside unit, and one of them is a credit nobody wants to give.\nAN ITEM IS SUPPLIED BY NOBODY. Each party read the other's document and assumed. The first resident moves into a room with no chair.\nAN ITEM DOES NOT FIT. The wardrobe door opens into the space the bed occupies, or the desk chair will not go under the fitted worktop, and neither is anybody's fault under either contract.\n\nThe third is the expensive one, because the module is already built and the only remedy left is different furniture."],
["2","The Common Schedule",
  "THE EMPLOYER SHALL ISSUE A SINGLE COMMON SCHEDULE, listing every item in a bedroom and allocating each to P2 or to P4, and it shall be issued and signed by both parties BEFORE EITHER PACKAGE IS LET. It is scheduled at P2 IF-05 and at {{iface.IF-01}}.\n\nThe schedule below is the Employer's starting position and is the basis on which this package is priced. It is not a summary of another document: where it and the P2 room data sheets differ, the difference is resolved before either party orders anything, and this clause prevails until they are reconciled.\n\nEVERY LINE STATES FOUR THINGS: the item, what P2 provides fitted, what this package provides loose, and what goes wrong if the line is missed. The fourth column is there because a boundary schedule that lists only the split gets skimmed, and the point of the exercise is to make somebody think about each line.\n\nEACH PARTY CONFIRMS IN WRITING, against the schedule, before it orders: that it has priced every line allocated to it, and that it has priced none of the lines allocated to the other. A tender that does not include that confirmation is incomplete."],
["3","Dimensional coordination, which is the half that is not about who supplies what",
  "Agreeing WHO supplies the bed does not prevent the bed from being the wrong size for the room P2 built.\n\nBEFORE THIS CONTRACTOR ORDERS ANYTHING it shall obtain from P2, and shall confirm its layout against: the internal room dimensions as manufactured; the position, depth and door swing of the fitted wardrobe; the position, height, depth and knee clearance of the fitted desk worktop; the height and projection of the fitted shelving; the position of every socket, data outlet, switch, radiator and reading light; and the door swing and clear opening. {{iface.IF-02}} and {{iface.IF-05}}.\n\nThe bed at F-01 is prescribed at 900 × 2000 mm for exactly this reason. It is the one dimension P2 has already designed the room around and it is not the Contractor's to change.\n\nTHE CHAIR UNDER THE DESK is the coordination check that is most often missed. P2 states a fitted worktop at 730 mm above finished floor level with a stated knee clearance. The task chair at F-07 shall fit under it, at its lowest setting, with its arms if it has them, and the Contractor shall demonstrate it in the sample room at {{spec.13}} rather than assert it from a dimension sheet."],
["4","Change after the freeze, and who pays for it",
  "Once P2 has commenced manufacture, the Common Schedule is fixed. A change to it after that point is a change to two packages and it is instructed by the Employer under {{§change}}, never agreed between contractors.\n\nWHERE THE CHANGE ARISES FROM AN ERROR IN THE SCHEDULE ITSELF — an item allocated to nobody, or allocated to both — the Employer carries it, because the Employer issued the schedule.\n\nWHERE IT ARISES FROM A PARTY FAILING TO CONFIRM under {{boundary.2}}, or from a party ordering against a dimension it did not verify under {{boundary.3}}, it is that party's.\n\nThat allocation is stated now, in advance, because after the event both positions are arguable and neither is provable."],
],
// [ref, the item, P2 provides — fitted, P4 provides — loose, if this line is missed]
boundaryReg: [
["B-01","Wardrobe and hanging","Fitted unit, 600 × 600 × 1950 mm nominal in RT-01, lockable, with the hanging length and storage volume stated","Nothing","Both parties price a wardrobe, or the door opens into the bed"],
["B-02","Desk and work surface","Fitted worktop at 730 mm AFFL with cable grommet","Nothing","The commonest double-supply on a village of this kind"],
["B-03","Shelving over the desk","Fitted, per room type","Nothing",""],
["B-04","Desk chair","Nothing","Task chair to F-07, fitting under the fitted worktop at its lowest setting","Nobody supplies a chair, or the chair does not go under the desk"],
["B-05","Bed and mattress","Nothing","Frame, mattress, encasement, pillows and duvet — F-01 to F-05","THE 900 × 2000 DIMENSION IS FIXED BY THE ROOM P2 BUILT"],
["B-06","Bedside surface","Nothing","Free-standing bedside unit to F-06","Assumed fitted by one party and loose by the other"],
["B-07","Mirror","Ensuite mirror is P2, fitted","Full-length room mirror to F-10","Two mirrors, or none in the room"],
["B-08","Blinds and window dressing","Internal blind, fitted, to the P2 blackout requirement","Nothing","Do not add curtains. The blind already meets the requirement and fabric is fire load"],
["B-09","Waste bin","Nothing","Bin to F-08","Small item, always forgotten, immediately noticed"],
["B-10","Laundry bag","Nothing","Hamper to F-09","P5 cannot run a linen service without one"],
["B-11","Fire action notice holder","Nothing","Holder to F-11. The NOTICE itself is P5's","A notice taped to a wall in every one of 225 rooms"],
["B-12","Any fixing into the structure","P2 provides the pattress or reinforced zone where agreed","Submits the fixing schedule and fixes only to an accepted detail","A bracket in a partition that was not designed for it — {{spec.7}}"],
],

// -------------------------------------------------------------- performance
// [criterion, requirement, verification]
perf: [
["Mattress fire performance","BS 7177 medium hazard minimum, permanently labelled","Test report submitted; label checked on every item at room acceptance"],
["Upholstered seating fire performance","BS 7176 medium hazard minimum, permanently labelled","Test report submitted; label checked at acceptance"],
["Label durability","Label present and legible for the whole deployment","Checked at acceptance and at each annual inspection"],
["Amenity fire load","Seating schedule confirmed against the fire strategy","Written confirmation from the Employer's fire engineer before order"],
["Non-domestic seating strength","BS EN 16139 severity level L2","Test report per item type"],
["Task chair","BS EN 1335-1, -2, -3 type B","Test report"],
["Tables and desks","BS EN 15372 level 5; desking to BS EN 527","Test report"],
["Storage furniture","BS EN 16121 / 16122, level 5 in resident areas","Test report"],
["Bed frame","BS EN 1725","Test report"],
["Outdoor furniture","BS EN 581-1 and -2, contract use","Test report"],
["Storage stability","Stable with the heaviest drawer extended and loaded, unanchored","Demonstrated on the sample, per item type"],
["Glass","Safety glass to BS EN 12600 class 2 minimum; no glass table tops","Inspection and product data"],
["Bed dimension","900 × 2000 mm sleeping surface","Measured on the sample room"],
["Clear height beneath bed frame","≥ 150 mm across the full footprint","Measured on the sample room"],
["RT-02 turning space","≥ 1500 mm diameter clear, WITH furniture in place","Measured in each of the 12 rooms, recorded"],
["RT-02 transfer space","≥ 1000 mm clear to one side of the bed, full length","Measured in each of the 12 rooms, recorded"],
["RT-02 mattress height","450–500 mm to the top of the mattress, compressed","Measured in each of the 12 rooms, recorded"],
["RT-02 reach ranges","All storage, surfaces and controls within BS 8300-2 seated reach","Measured in each of the 12 rooms, recorded"],
["Route clear width in RT-02","≥ 900 mm to the door and to the ensuite, with furniture placed","Measured in each of the 12 rooms, recorded"],
["Mattress protection","Zipped, waterproof, vapour-permeable encasement, 60 °C launderable, one plus one spare","Inspection at room acceptance"],
["Bed frame inspectability","No open tube end, no upholstered base, no fabric headboard","Confirmed by P5 before order; inspected on the sample"],
["Access into the room","Every item passes the door, corridor and stair with ≥ 50 mm clearance","Contractor's access statement; demonstrated on the three largest items"],
["Manual handling","No component routinely moved exceeding 23 kg; heavier items marked","Weighed at the sample; masses stated in the Proposals"],
["Bed movability","Movable clear of every wall by one person","Demonstrated on the sample"],
["Cleaning compatibility","Withstands P5's chemical schedule for the deployment without degradation","Written compatibility statement per product"],
["Upholstery covers","Removable and washable at 60 °C, or impervious and wipe-cleanable","Product data and inspection"],
["Fixings","No fixing to the structure without an accepted P2 detail","Fixing schedule accepted before installation"],
["Attrition stock","≥ 3% bedroom lines, ≥ 5% seating lines, at the FIRST sectional handover","Inventory issued to P5 and counted"],
["Replacement lead time","≤ 4 weeks for any bedroom line during the deployment","Stated in the Proposals; measured in service"],
["Model continuity","Deployment plus 12 months, or 6 months' notice and a compatible alternative","Written undertaking with the tender"],
["Warranty","5 years frame and structure, 2 years moving parts and upholstery","Warranty documents issued at each sectional handover"],
["Sample rooms","One of each type furnished on site and approved before bulk delivery","Joint inspection by the Employer and P5"],
["Room acceptance","Every one of 225 rooms checked and signed individually","Signed checklist per room, not a sample"],
["Packaging","Removed from site the day it is generated; none in any escape route","Daily inspection; monthly waste report"],
["Delivery security","Sealed deliveries, seal numbers recorded, weekly inventory reconciliation","Inventory and delivery records"],
["Resident response","No scheduled item raised by more than 10% of respondents in two consecutive surveys","P5's residents' satisfaction survey"],
],

// ---------------------------------------------------------------- handover
// [deliverable, requirement]
handover: [
["Room acceptance records","One signed checklist per room, all 225, issued as a set per section"],
["RT-02 clearance records","The measured record for each of the 12 accessible rooms, with the furniture in place"],
["Inventory","Every item, by room and by space, reconciled to the delivery records and acknowledged by P5"],
["Attrition stock inventory","Counted and signed at the FIRST sectional handover, held at R-10"],
["Fire test evidence","The test report and hazard level for every mattress, seating and fabric line supplied"],
["Warranties","Per item type, with the start date at the sectional handover and the claim route named"],
["Care and cleaning instructions","Per item type, in the form P5 will actually use — one page per item, not a manufacturer's booklet"],
["Bed inspection and treatment method","The method P5 will use for the inspection at {{spec.5}}, agreed with P5 before order"],
["Linen dimensions","Mattress, pillow and duvet dimensions, issued to P5 before P5 procures linen"],
["Replacement route","Contact, lead time and ordering process for every line, and the model continuity undertaking"],
["Asset data","Every item recorded to the schema at P2 Appendix 11, at the granularity P5 will maintain and replace at"],
],

// --------------------------------------------------------------- programme
programme: [
["1","The four dates, and being last in the sequence",
  "This package has no completion date of its own that matters. It has four, and they are the sectional occupation dates: 65 beds at month 3, cumulative 150 at month 6, 205 at month 9, and 225 at month 12.\n\nFor each section, this package is complete when every room in that section has passed the room acceptance check at {{spec.13}} and the inventory has been issued to P5.\n\nBEING LAST IS THE PROGRAMME RISK AND IT IS NOT THIS PACKAGE'S FAULT. Furniture goes in after the modules are set and after services commissioning, and before handover. Every delay in every package upstream arrives here as a compressed window.\n\nThe Contractor shall state, with its tender, the minimum installation window it requires per section and the resource it will apply, and the Employer will hold the programme to it. A window that is compressed below the stated minimum is a change under {{§change}} and not an expectation."],
["2","The dates before the dates",
  "Three deliverables in this package sit months ahead of any delivery, and they are the ones that matter:\n\nTHE COMMON SCHEDULE at {{§boundary}}, confirmed before either package is let.\nTHE DIMENSIONAL CONFIRMATION at {{boundary.3}}, before P2 manufactures.\nTHE SAMPLE ROOMS at {{spec.13}}, approved before any bulk delivery.\n\nThe Contractor shall show all three on its programme, with the lead time behind each, and shall state the date at which a delay in any of them becomes critical to the month 3 date. A programme that shows only deliveries is a programme that has not understood this package."],
["3","Progress and reporting",
  "Monthly progress report stating: orders placed by line and their lead times; the status of the Common Schedule and the dimensional confirmation; the sample room status; rooms accepted to date against the number required for the next sectional date; every open interface at {{§iface}} and its status; and any matter that could affect a sectional date, whether or not it is this Contractor's responsibility.\n\nLEAD TIMES ARE REPORTED HONESTLY AND EARLY. Contract furniture is manufactured to order and a twelve-week lead time discovered in week ten is a section that is not furnished. The Employer would far rather hear about it in month one."],
["4","Delay, and what a late section costs",
  "Delay damages apply to each sectional occupation date separately, at £145 PER BED PER DAY for every bed in that section that cannot be occupied on its date. It is the same rate as the P2 sectional damages because it is the same loss: the Employer houses those people somewhere else, at the cost of a bed elsewhere and a longer journey to work.\n\nIt is stated as a genuine pre-estimate of that loss and it is not a penalty, and it is stated in this document rather than in a schedule so that a tenderer prices the risk of a late section knowingly.\n\nA ROOM WITHOUT A BED IS AN UNOCCUPIABLE ROOM. It does not matter that the module cost two hundred times what the bed cost.\n\nWHERE THE DELAY IS NOT THIS CONTRACTOR'S, an extension of time is granted and damages do not run. The causes are: a change instructed under {{§change}}; an installation window compressed below the stated minimum at {{programme.1}}; late issue or late reconciliation of the Common Schedule; a building not ready or not secure to receive delivery under {{spec.16}}; and any act of prevention by the Employer or another package. Notification within 10 working days, supported by records kept at the time."],
],

// --------------------------------------------------------------------- hse
hse: [
["1","The duties this section does not restate",
  "The Contractor shall comply with the Health and Safety at Work etc. Act 1974, the Construction (Design and Management) Regulations 2015 as they apply to it, the Manual Handling Operations Regulations 1992 and every other applicable statutory requirement. Nothing in this document reduces those duties.\n\nThe clauses below are the requirements this package has that a competent furniture contractor's standard arrangements do not automatically cover, because this is not a delivery into an empty office block."],
["2","Working in a village where people are already asleep",
  "From month 3 this package installs furniture in a building next to buildings where people are living, and by month 12 it is installing on a site that is almost entirely occupied.\n\nThe site rules at Appendix 3 apply in full, including the noise rule near occupied blocks. Flat-pack assembly is a noisy activity carried out for weeks; the Contractor shall programme it inside permitted hours and shall not assume that an internal activity is exempt because it is indoors.\n\nDELIVERY VEHICLES follow the routes P1 states at {{iface.IF-07}} and stop where P1 says they stop. No vehicle reverses in a resident pedestrian area without a marshal.\n\nNOTHING IS STORED IN AN ESCAPE ROUTE, a corridor or a stairwell, at any time, including during a working day. {{spec.15}}."],
["3","Manual handling, which is the real risk in this package",
  "This package carries several thousand items up stairs, along corridors and into rooms, over a short window, repetitively. That is the injury profile of a furniture installation and it is entirely predictable.\n\nThe 23 kg limit at {{spec.9}} applies to the installation as well as to the operation. The Contractor shall submit a manual handling assessment for the installation covering the stair, the turn, the corridor length and the repetition, and shall state the equipment it will use.\n\nA method statement that says 'two-person lift where required' without stating which items require it is not an assessment. The masses are known: they are in the Contractor's own Proposals under {{spec.9}}."],
["4","People entering rooms in an occupied village",
  "In an occupied section, an installer entering a room is entering somebody's home. Entry to any occupied room is under P5's entry procedure, logged, and never unaccompanied by arrangement with P5.\n\nEvery person is inducted, identifiable and recorded before starting work. The conduct standards at {{§labour}} apply to every person this Contractor brings to site, at every tier and including agency labour, and a breach is a removal from site.\n\nNo photography of residents or of the interior of occupied rooms, per the site rules."],
],

// -------------------------------------------------------------------- info
info: [
["1","What is delivered, and in what form",
  "Asset information to the schema at P2 Appendix 11, which applies to this package unamended.\n\nTHE GRANULARITY IS THE DECISION THAT MATTERS AND THIS DOCUMENT MAKES IT. Every bed, mattress, task chair and item of amenity seating is recorded individually, by room, because those are the items P5 replaces one at a time and it has to know which one it is replacing. Bins, laundry bags and mirrors are recorded by type and quantity per room, because nobody tracks a bin by serial number and pretending otherwise produces a register nobody maintains.\n\nA register at the wrong granularity is worse than no register, because it is abandoned in month four and then relied on in month thirty."],
["2","When",
  "Progressively, section by section, issued within 2 weeks of each sectional acceptance and a precondition of the payment for that section under {{§pricing}}. Not held to the end and compiled from delivery notes."],
["3","What P5 actually needs",
  "P5 replaces, cleans, moves and inspects this furniture for thirty-eight months. It needs, per item type: the identification, the supplier, the replacement lead time, the cleaning method, the fire classification and where the label is, and the warranty position.\n\nThe care instructions at {{§handover}} shall be one page per item type, written for a housekeeper on a shift, not a manufacturer's brochure. A forty-page booklet is not read and the chair is cleaned with the wrong product on day one."],
],

// ------------------------------------------------------------------ change
change: [
["1","The only route by which anything changes",
  "No change to these Requirements, to the Common Schedule, to a prescribed dimension or to a fire classification takes effect except by written instruction from the Employer's authorised representative.\n\nNo instruction from another package's contractor, from a site meeting, or from P5's operational team has any effect. A request from the Operator is not an instruction, however reasonable it is and however senior the person making it."],
["2","Valuation",
  "Every proposed change is valued and its programme effect stated BEFORE it is instructed, using the rates in the priced schedule at {{§pricing}}, or where no rate applies by a build-up the Contractor submits and the Employer accepts. Quotation within 10 working days of a request.\n\nA CHANGE AFTER ORDER IS DIFFERENT FROM A CHANGE BEFORE ORDER, and the Contractor shall state, for each line, the date beyond which a change carries a cancellation or restocking cost. Contract furniture is manufactured to order and that date is real."],
["3","Change originating in another package",
  "Where P2 changes a fitted item, a dimension or a fixing position, or P3 changes the dining boundary, it is a change to this package and it is instructed by the Employer under {{change.1}}. It is not agreed between contractors.\n\nWhere this Contractor becomes aware that a requirement of another package cannot be met because of something in this one, it shall notify the Employer immediately rather than leave it for that package to find. The allocation of cost for a Common Schedule error is at {{boundary.4}}."],
],

// ----------------------------------------------------------------- defects
defects: [
["1","Period",
  "The defects liability period is 12 months from the acceptance of each section, running separately for each.\n\nTHE WARRANTIES AT {{spec.2}} RUN LONGER and are not extinguished by it: 5 years on frames and structural components, 2 years on moving components and upholstery, from the sectional handover at which the item was installed.\n\nA SYSTEMIC DEFECT — the same failure in more than 5% of any supplied line — is a defect in the whole line, not in the items that have failed so far. The remedy is replacement of the line, and the Contractor shall not wait for each item to fail before acting on it. That rule exists because 225 of anything fails on a curve, and the Contractor sees the curve before the Employer does."],
["2","Response, in an occupied village",
  "PRIORITY 1 — anything that makes a room unusable or unsafe: a bed that has failed structurally, a chair that has collapsed, a storage unit that has become unstable, or damage that presents a sharp or trapping hazard. Attend or replace from attrition stock within 24 hours; the room is not left unusable overnight.\n\nPRIORITY 2 — an item that is unusable but does not make the room unusable, or a failure in an amenity space that reduces its capacity. Replace within 5 working days.\n\nPRIORITY 3 — everything else, including cosmetic damage. 20 working days or an agreed programme.\n\nThese are achievable BECAUSE of the attrition stock at {{spec.12}}. Priority 1 is met from stock held on site, not from a manufacturing lead time, and that is the whole reason the stock is delivered at the first handover rather than the last."],
["3","Fair wear, damage and who pays",
  "Damage caused by a resident is P5's to recover through its own arrangements and is not a defect. Failure of an item in normal use within its warranty period is the Contractor's.\n\nTHE LINE BETWEEN THEM IS DRAWN BY THE SYSTEMIC RULE AT {{defects.1}}, not by argument item by item. One broken chair leg in 225 rooms is wear. Twelve broken chair legs in the same line is a chair that is not fit for the use it was bought for, whatever the residents did to it, because the use was stated in this document.\n\nThe Contractor shall attend and inspect on request rather than assess a failure from a photograph."],
],

// ----------------------------------------------------------------- sustain
sustain: [
["1","The product itself",
  "The Contractor shall state, for every scheduled line: the principal materials by mass; the recycled content; the proportion by mass that is separable and recyclable at end of life; and the certification of any timber, which shall be FSC or PEFC certified without exception.\n\nUPHOLSTERY AND FOAM shall be free of added halogenated flame retardants where the required BS 7176 or BS 7177 classification can be achieved without them, and the Contractor shall state where it has and has not achieved this. The fire classification is not negotiable; how it is reached is a legitimate question and this clause asks it.\n\nThe Employer will evaluate a tender partly on these answers, and a tenderer that returns 'not known' on every line is telling the Employer something about its supply chain."],
["2","Packaging and delivery",
  "Packaging volume, its removal and its recycling rate reported monthly per {{spec.15}}, and a returnable or blanket-wrap delivery method evaluated favourably.\n\nDelivery consolidation: the Contractor shall state the number of vehicle movements it expects to make and shall consolidate rather than deliver line by line. A site with a 0.42 ha laydown does not have room for thirty part-loads."],
["3","End of life, which is the point of this package",
  "This is the most reusable package in the village. A base is broken out and a module is dismantled, but a bed, a chair and a table are removed intact and used again somewhere else, and that is the single largest sustainability decision available here.\n\nThe Contractor shall state, with its tender, its take-back position at the end of the deployment: what it will take back, on what terms, and the residual value it would place on it. That figure is evaluated and it is carried into {{§relocation}}.\n\nA tenderer that will not take back what it supplied is telling the Employer what it thinks the furniture will be worth in three years."],
],

// ------------------------------------------------------------------ labour
labour: [
["1","Standards that apply to everybody this Contractor brings",
  "The requirements apply to every person working on this package, including every subcontractor at every tier and every agency worker.\n\nNo person shall pay any fee to obtain or keep work on this project. No person's identity document shall be retained by anybody. Every person shall have a written contract in a language they understand, shall be paid not less than the applicable statutory minimum, directly into an account in their own name, in full and on time. Working hours and rest periods to the Working Time Regulations 1998.\n\nThe Modern Slavery Act 2015 applies and compliance is evidenced, not asserted."],
["2","The place of manufacture, which is where the real risk in this package is",
  "This is the package most likely to be manufactured outside the United Kingdom, and furniture manufacturing is a sector with a documented history of forced labour, unsafe conditions and undeclared subcontracting.\n\nTHE CONTRACTOR SHALL DISCLOSE, WITH ITS TENDER, THE PLACE OF MANUFACTURE OF EVERY SCHEDULED LINE — the country and the site, not the country alone, and not the address of a trading company. Where a line is subcontracted onward, that is disclosed too.\n\nThe Employer reserves the right to audit any place of manufacture, at any tier, without notice, itself or through a third party, and to interview workers privately. A refusal is a breach.\n\nUndisclosed subcontracting of a manufacturing operation is a material breach in its own right, whatever the conditions at the undisclosed site turn out to be, because the undisclosed site is the one nobody audits.\n\nCOTTON AND TEXTILES. Where a line contains cotton or textile components the Contractor shall state the origin of the fibre and shall evidence it. This is a live and specific risk in soft furnishings and it is not discharged by a supplier's self-declaration."],
["3","Social value",
  "The social value framework at P2 Appendix 12 applies unamended, reported quarterly.\n\nThis package has a smaller footprint than the others and one real opportunity: the installation labour is local, short-term and repetitive, and it is exactly the kind of work that goes to agencies by default. The Employer will evaluate a proposal to employ and train that labour directly."],
],

// -------------------------------------------------------------- relocation
relocation: [
["1","What happens to it in thirty-eight months",
  "At the end of the deployment the village is removed and, if the Employer elects, relocated. This package's contents are the part with a genuine second life.\n\nTHE CONTRACTOR SHALL STATE, WITH ITS TENDER, three things, and they are evaluated:\n\nWhich lines it expects to be reusable at the end of the deployment, and in what condition.\nWhich lines are consumed by the deployment and will not be — the mattresses being the obvious case, for the reasons at {{spec.5}}.\nIts take-back terms and the residual value it would place on the reusable lines at month 38.\n\nAn honest answer here is worth more than an optimistic one. A tenderer claiming every chair will be as good as new after thirty-eight months and 225 residents is either not telling the truth or has not done this before."],
["2","Removal",
  "Removal is from occupied and recently vacated rooms in a live village, under the same regime as installation: the access constraints at {{spec.8}}, the manual handling limits at {{spec.9}}, and P5's entry procedure.\n\nItems for reuse are removed, cleaned, inspected, inventoried and packed to a stated standard. Items for disposal are segregated by stream and reported under {{§sustain}}. Mattresses are disposed of under the withdrawal criteria at {{spec.5}} and their disposal route is stated.\n\nNothing is left in a room, a store or a container for somebody else to deal with. The inventory issued at handover is the list that is reconciled at removal, item by item, which is the other reason the granularity at {{info.1}} matters."],
],
};
