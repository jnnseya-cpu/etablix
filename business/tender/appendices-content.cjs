// Employer's Requirements P2 — the twelve appendices listed at section 20.
//
// Eight of them are the Employer's own documents and are written here in full.
// Four are documents produced by others — the fire engineer, the planning
// authority, the ecologist, the highway authority. Those are issued as
// controlled insertion sheets: what must be inserted, by whom, at what
// revision, what the ER depends on it for, and WHAT A TENDERER PRICES UNTIL
// IT ARRIVES. An appendix that says "to be issued" and nothing else transfers
// an unpriced risk to a tenderer who will either price it at its worst case
// or qualify its return, and both defeat the evaluation.
module.exports = {
  meta: {
    ref: "NR-ER-P2-APX", rev: "A", date: "September 2026",
    parent: "NR-ER-P2 Rev B — Employer's Requirements, P2 Modular Accommodation",
    project: "Project NORTHREACH — Workforce Accommodation Village",
    client: "Marrowbridge Infrastructure Ltd",
  },

  // Which are ours, which are inserted. Drives the front sheet and the audit.
  register: [
    ["1", "Activity schedule, in the structure to be priced", "Employer", "Issued in full", "Section 12"],
    ["2", "Fire strategy", "Employer's fire engineer", "INSERTION SHEET — the strategy is a separate document", "4.5, 4.15, 4.26, IF-11"],
    ["3", "Planning consent, conditions, and the Employer's site rules", "Planning authority / Employer", "Decision notice INSERTED; site rules issued in full", "7.4, 14.2, 14.5, IF-12"],
    ["4", "Construction Environmental Management Plan", "Employer's environmental consultant", "INSERTION SHEET", "10.6"],
    ["5", "Approved external colour and finish range", "Employer", "Issued in full", "4.3, 4.22, room data sheets"],
    ["6", "Bed demand curve, occupancy programme and sectional completion dates", "Employer", "Issued in full", "7.2, 18.1, 18.2, 4.12"],
    ["7", "Abnormal load route assessment", "Highway authority / Employer's consultant", "INSERTION SHEET — DRAFT, INCOMPLETE, and the risk is the Employer's", "7.3, 11.1, 18.3"],
    ["8", "Design loadings, site exposure, and service supply characteristics", "Employer", "Issued in full", "4.2, 4.4, 4.24, 4.25, 4.27"],
    ["9", "Overheating criterion and the Employer's comfort brief", "Employer", "Issued in full", "Section 6, room data sheets"],
    ["10", "Form of collateral warranty", "Employer's legal adviser", "CONTENT SCHEDULE issued; the form itself is drafted by lawyers", "13.6"],
    ["11", "Asset information requirements, data schema and the CDE", "Employer", "Issued in full", "15.3, 15.4, IF-14, 4.24"],
    ["12", "Social value framework and the travel-to-work area", "Employer", "Issued in full", "16.5"],
  ],

  // ---------------------------------------------------------- APPENDIX 1
  a1: {
    intro:
      "This is the structure the tender is priced in. A tenderer who alters it produces a return that cannot be compared with the others, and it will be marked accordingly.\n\nRates are inclusive of everything necessary to complete the item to the Employer's Requirements — labour, materials, plant, temporary works, supervision, testing, commissioning, overheads and profit — except where an item is expressly stated to be priced separately. A rate left blank is a rate of nil and the item is deemed included elsewhere; a tenderer who intends it to be excluded shall list it as a departure under 13.4 rather than leaving it empty.",
    rules: [
      ["Quantities", "Quantities are the Employer's and are firm. Remeasurement applies only where this document expressly permits it. A tenderer that disagrees with a quantity shall state the quantity it has priced, in the Schedule of Departures, rather than adjusting the rate to compensate."],
      ["Rates for change", "The all-in rates required at 17.2 are priced at item M and are used to value every variation for the life of the contract. They are competed here because this is the only moment at which competition exists."],
      ["Provisional sums", "There are none. Where the Employer cannot define a scope it is excluded and named, per 1.4. A provisional sum is a decision deferred to a point at which it can no longer be competed."],
      ["Currency and fluctuation", "Sterling. Fixed for the contract period. An indexation mechanism is a departure under item N with the index and base date stated."],
      ["The sample room", "Item K is priced and programmed in advance of the main delivery. It is not a proportion of item B and shall not be priced as one."],
    ],
    // [item, description, unit, qty, note]
    lines: [
      ["A", "DESIGN, CALCULATIONS AND APPROVALS", "", "", ""],
      ["A1", "Design development to the responsibility matrix at 13.3, including the Contractor's Proposals", "Sum", "1", "Includes every submission listed at 13.5"],
      ["A2", "Structural design, connections, lifting points and the temporary condition at 4.27", "Sum", "1", ""],
      ["A3", "Thermal calculations, thermal bridging and the TM59 overheating model", "Sum", "1", "Appendix 9"],
      ["A4", "Acoustic design and the flanking demonstration at 4.6", "Sum", "1", ""],
      ["A5", "Drainage design and the trap seal demonstration at 4.23", "Sum", "1", "Congested-use loading"],
      ["A6", "Maximum demand calculation, discrimination study and earthing design", "Sum", "1", "4.24"],
      ["A7", "Water design, legionella written scheme of control and the flushing regime", "Sum", "1", "4.11, 4.12"],
      ["A8", "Fire alarm design, cause and effect matrix and the BS 7273-4 door schedule", "Sum", "1", "4.15, 4.18, 4.26"],
      ["A9", "Lightning protection risk assessment to BS EN 62305-2", "Sum", "1", "4.17 — priced whether or not protection results"],
      ["A10", "Relocation method statement and the schedule of consumed components", "Sum", "1", "13.7"],
      ["A11", "Collateral warranties — Contractor and each designing sub-contractor", "Nr", "6", "Appendix 10"],

      ["B", "MANUFACTURE — BEDROOM MODULES", "", "", ""],
      ["B1", "RT-01 standard bedroom with ensuite shower room", "Nr", "199", "Rate per room, complete to the room data sheet"],
      ["B2", "RT-02 accessible bedroom with ensuite wet room", "Nr", "12", "Rate per room"],
      ["B3", "RT-03 senior / long-stay bedroom", "Nr", "14", "Rate per room"],
      ["B4", "Circulation, stairs and the module envelope serving the above", "Sum", "1", "Not to be spread into B1–B3"],

      ["C", "MANUFACTURE — AMENITY, RECEPTION AND SHELL", "", "", ""],
      ["C1", "Reception, management office and resident amenity space", "m²", "420", ""],
      ["C2", "Kitchen and dining building shell, to receive P3", "m²", "610", "IF-04. Shell only — fit-out is P3"],
      ["C3", "Laundry, drying and stores", "m²", "180", ""],
      ["C4", "Plant enclosures, acoustically treated, with the access at 4.14", "Sum", "1", ""],

      ["D", "TRANSPORT AND DELIVERY", "", "", ""],
      ["D1", "Delivery to site, bedroom modules", "Nr", "88", "Modules, not rooms. State the module count assumed"],
      ["D2", "Delivery to site, amenity and shell modules", "Nr", "26", ""],
      ["D3", "Abnormal load escorts, permits and route compliance", "Sum", "1", "Appendix 7 — route assessment incomplete, risk with the Employer per 18.3"],

      ["E", "CRANEAGE, SETTING AND CONNECTION", "", "", ""],
      ["E1", "Craneage, lift planning to BS 7121-1 and the Appointed Person", "Sum", "1", "4.21"],
      ["E2", "Setting, levelling and inter-module connection", "Nr", "114", "Per module set"],
      ["E3", "Weathering, joint sealing and the joint mock-up test", "Sum", "1", "4.22"],
      ["E4", "Connection to the P1 termination points", "Nr", "8", "Per block, all four services"],
      ["E5", "Temporary works design, independent check and permits", "Sum", "1", "4.21 — Category 2 minimum"],

      ["F", "INTERNAL FIT-OUT AND FIXED JOINERY", "", "", ""],
      ["F1", "Fit-out, RT-01", "Nr", "199", "Where not included in B1 — state which"],
      ["F2", "Fit-out, RT-02", "Nr", "12", ""],
      ["F3", "Fit-out, RT-03", "Nr", "14", ""],
      ["F4", "Circulation and amenity finishes, wall and corner protection", "Sum", "1", "4.7, 4.9"],
      ["F5", "Signage and wayfinding to the scheme at 4.20", "Sum", "1", "Including the viewing-distance calculation"],

      ["G", "MECHANICAL AND ELECTRICAL", "", "", ""],
      ["G1", "Heating and controls to the duty in the room data sheets", "Sum", "1", "State the resulting connected load per block"],
      ["G2", "Ventilation and ensuite extract", "Sum", "1", ""],
      ["G3", "Hot and cold water, TMVs, boosting and metering", "Sum", "1", "4.11, 4.25"],
      ["G4", "Above-ground drainage within the modules", "Sum", "1", "4.23"],
      ["G5", "Electrical distribution, protection and metering", "Sum", "1", "4.24"],
      ["G6", "Lighting and emergency lighting", "Sum", "1", "4.16"],
      ["G7", "Fire detection and alarm, Category L1", "Sum", "1", "4.15, 4.26"],
      ["G8", "Access control, offline battery locks and the key hierarchy", "Sum", "1", "4.18 — fail-secure to bedrooms, fail-safe to escape doors"],
      ["G9", "Structured cabling and the wireless network", "Sum", "1", "Coverage per section 6"],
      ["G10", "CCTV containment, cabling and power to the P5 termination points", "Sum", "1", "4.19 — cameras are P5"],
      ["G11", "Lightning protection installation, where the assessment requires it", "Sum", "1", "Price nil if the assessment concludes none is required, and say so"],

      ["H", "COMMISSIONING, TESTING AND DEMONSTRATION", "", "", ""],
      ["H1", "Commissioning, every outlet and every extract measured and recorded", "Nr", "225", "Per room. 8.5 — summaries are rejected"],
      ["H2", "Pre-completion acoustic testing", "Nr", "23", "One room pair in ten"],
      ["H3", "Air permeability testing, ATTMA TSL2", "Nr", "3", "One completed block in three, joints included"],
      ["H4", "Weathertightness testing — joint mock-up and site hose test", "Sum", "1", "4.22"],
      ["H5", "Demonstration of cause and effect, access control and the wireless heat map", "Sum", "1", "8.6"],

      ["I", "HANDOVER DELIVERABLES AND TRAINING", "", "", ""],
      ["I1", "As-installed drawings, model and O&M manuals", "Sum", "1", "15.2"],
      ["I2", "Asset register in the schema at Appendix 11", "Sum", "1", "IF-14"],
      ["I3", "Registers — doorsets, firestopping, keys, valves", "Sum", "1", ""],
      ["I4", "Training for P5, two recorded sessions", "Sum", "1", ""],

      ["J", "SPARES AND CONSUMABLES — PRICED SEPARATELY", "", "", ""],
      ["J1", "Twelve months' consumables from the last sectional completion", "Sum", "1", "19.5 — stated separately so the Employer can decline it knowingly"],
      ["J2", "Critical spares holding, criticality 1 assets", "Sum", "1", "19.5"],

      ["K", "SAMPLE ROOM", "", "", ""],
      ["K1", "One complete RT-01, fully finished and serviced, in advance", "Nr", "1", "8.3, 8.7 — not a proportion of B1"],

      ["L", "OPTIONS — PRICED, NOT INCLUDED IN THE LUMP SUM", "", "", ""],
      ["L1", "Window-open heating interlock, as a priced option", "Sum", "1", "4.10"],
      ["L2", "Self-testing emergency lighting", "Sum", "1", "4.16"],
      ["L3", "Improvement on the air permeability figure, per 1.0 m³/(h·m²) below 7.0", "Rate", "1", "Evaluated — section 6"],

      ["M", "RATES FOR THE VALUATION OF CHANGE", "", "", ""],
      ["M1", "All-in hourly rate, by trade and grade, site", "Rate", "—", "17.2 — list every trade and grade to be employed"],
      ["M2", "All-in hourly rate, by trade and grade, factory", "Rate", "—", "17.2"],
      ["M3", "Percentage addition for overheads", "%", "—", ""],
      ["M4", "Percentage addition for profit", "%", "—", ""],
      ["M5", "Percentage addition on sub-contracted work", "%", "—", ""],
      ["M6", "Craneage, per shift and per hour", "Rate", "—", ""],

      ["N", "DEPARTURES FROM THESE EMPLOYER'S REQUIREMENTS", "", "", ""],
      ["N1", "Each departure listed and priced individually, plus or minus", "Nr", "—", "13.4 — a departure not listed is not accepted"],
    ],
  },

  // ---------------------------------------------------------- APPENDIX 5
  a5: {
    intro:
      "External colour and finish are a planning matter before they are an aesthetic one. The range below is the range consented under the condition at Appendix 3; a colour outside it requires the condition to be varied, which is the Employer's application to make and takes time nobody has allowed for.\n\nEvery coated metal finish shall meet the durability and colour fastness requirement at 4.22 — classification not less than RUV3 to BS EN 10169, with a warranty of not less than twenty years against a colour change exceeding ΔE 3 to BS EN 13523-3 and chalking not worse than rating 2 to BS EN 13523-10, in the exposure category at Appendix 8.",
    // [ref, colour, RAL, finish, where it may be used, note]
    range: [
      ["C-01", "Anthracite grey", "RAL 7016", "Coated steel, matt 30% gloss", "Primary external wall panel, all accommodation blocks", "The consented base colour. Assume this unless the drawings say otherwise"],
      ["C-02", "Slate grey", "RAL 7015", "Coated steel, matt", "Secondary panel, recesses and set-backs", ""],
      ["C-03", "Pebble grey", "RAL 7032", "Coated steel, matt", "Amenity and reception buildings only", "Distinguishes the buildings a visitor must find"],
      ["C-04", "Traffic white", "RAL 9016", "Coated steel, satin", "Soffits, reveals and window surrounds", "Not permitted as a primary wall colour — reflectance was a planning objection"],
      ["C-05", "Moss green", "RAL 6005", "Coated steel, matt", "Boundary-facing elevations of Blocks A and B only", "Required by the landscape condition. See Appendix 3"],
      ["C-06", "Jet black", "RAL 9005", "Coated aluminium, matt", "Rainwater goods, flashings and trims", ""],
      ["C-07", "Anthracite", "RAL 7016", "Powder-coated aluminium, matt", "Window and door frames throughout", "Matched to C-01; a different anthracite is not a match"],
      ["C-08", "Signal red", "RAL 3001", "Powder-coated steel", "Fire equipment, dry riser and hydrant markers only", "Not decorative. Statutory identification"],
      ["C-09", "Natural", "—", "Fibre cement, through-coloured", "Permitted as an alternative to C-01 where offered as a departure", "Through-coloured only — a surface-coloured board fails the fastness requirement at year eight"],
    ],
    rules: [
      "Roof finishes are not colour-controlled and are not visible from any consented viewpoint. Select for the twenty-year material warranty at 4.4, not for appearance.",
      "Internal colour is not controlled by this appendix. It is controlled by the light reflectance values in the room data sheets — walls not less than 0.5, ceilings not less than 0.7 — which are a lighting requirement and not a preference.",
      "Any colour offered outside this range is a departure under 13.4 and shall be priced separately, with the tenderer stating the time required for the Employer to vary the planning condition. That time is the Employer's to spend and the tenderer's to allow for.",
      "Colour matching between the panel, the frame and the trim is the Contractor's responsibility across all three suppliers. Three manufacturers' interpretations of RAL 7016 are three colours, and the difference is visible on a two-storey elevation in flat light.",
    ],
  },

  // ---------------------------------------------------------- APPENDIX 8
  a8: {
    intro:
      "The design data the Contractor designs to. Where a figure below is marked TO BE CONFIRMED, the Contractor shall design to the stated assumption, state in its tender that it has done so, and price the assumption — it shall not treat the value as established. A figure that is confirmed later at a worse value is a change under section 17; a figure a tenderer assumed silently is not.",
    // [group, parameter, value, source / basis]
    data: [
      ["SITE AND EXPOSURE", "Site altitude above sea level", "68 m", "Topographical survey NR-SV-001"],
      ["SITE AND EXPOSURE", "Distance to shoreline", "Greater than 100 km", "Inland site — Terrain Category III"],
      ["SITE AND EXPOSURE", "Terrain category", "III (country with hedges and isolated buildings)", "BS EN 1991-1-4 and its UK National Annex"],
      ["SITE AND EXPOSURE", "Atmospheric corrosivity category", "C3 (moderate)", "BS EN ISO 12944-2. Drives the coating class at 4.22"],

      ["STRUCTURAL — WIND", "Fundamental basic wind velocity, v(b,map)", "22.5 m/s", "BS EN 1991-1-4 UK NA Figure NA.1"],
      ["STRUCTURAL — WIND", "Return period for the permanent condition", "50 years", ""],
      ["STRUCTURAL — WIND", "Return period, part-erected block left overnight or over a weekend", "5 years for the exposure period", "4.27. The Contractor states the wind speed at which a part-erected block must be tied down"],
      ["STRUCTURAL — WIND", "Directional and seasonal factors", "To be taken as 1.0 unless justified", "A reduction claimed must be shown"],

      ["STRUCTURAL — SNOW AND LOADS", "Characteristic ground snow load, s(k)", "0.50 kN/m²", "BS EN 1991-1-3 UK NA for the site altitude"],
      ["STRUCTURAL — SNOW AND LOADS", "Imposed floor load, bedrooms", "1.5 kN/m²", "Section 6"],
      ["STRUCTURAL — SNOW AND LOADS", "Imposed floor load, circulation and stairs", "2.0 kN/m²", "Section 6"],
      ["STRUCTURAL — SNOW AND LOADS", "Imposed floor load, amenity and dining", "3.0 kN/m²", "Assembly use"],
      ["STRUCTURAL — SNOW AND LOADS", "Imposed roof load, maintenance access only", "0.6 kN/m²", ""],
      ["STRUCTURAL — SNOW AND LOADS", "Basin fixing, vertical load at the front edge", "130 kg", "Room data sheets"],

      ["THERMAL", "External design temperature, winter", "−4 °C", "CIBSE Guide A, 24-hour building. Drives the heating duty in the room data sheets"],
      ["THERMAL", "Internal design temperature, bedrooms", "21 °C dry resultant", "Room data sheets"],
      ["THERMAL", "Heat-up requirement, cold start", "12 °C to 21 °C within 90 minutes", "Room data sheets"],
      ["THERMAL", "Degree days, base 15.5 °C", "2,180", "For the operational energy declaration at 16.3"],
      ["THERMAL", "Design weather file for the TM59 model", "CIBSE DSY1, 2020 high-emissions, 50th percentile", "Appendix 9"],

      ["RAINFALL AND DRAINAGE", "Design rainfall intensity, roof drainage", "0.022 l/s per m² (2 minute duration, 1 in 50 year)", "BS EN 12056-3. Drives the sizing at 4.4"],
      ["RAINFALL AND DRAINAGE", "Foul connection invert, per block", "TO BE CONFIRMED — assume 1.20 m below finished floor level", "P1 coordination drawing NR-TW-VIL-0203. Design to the assumption and price it"],
      ["RAINFALL AND DRAINAGE", "Surface water discharge rate permitted", "5 l/s per hectare", "Planning condition — Appendix 3"],

      ["ELECTRICAL SUPPLY", "Supply characteristics at the P1 termination point", "400/230 V, 50 Hz, three phase and neutral, TN-S", "4.24"],
      ["ELECTRICAL SUPPLY", "Prospective fault current at the origin", "TO BE CONFIRMED — assume 16 kA", "DNO application in progress. 4.24"],
      ["ELECTRICAL SUPPLY", "External earth fault loop impedance, Ze", "TO BE CONFIRMED — assume 0.35 Ω", "Measured and recorded per block at commissioning"],
      ["ELECTRICAL SUPPLY", "Maximum demand available, per accommodation block", "TO BE CONFIRMED — assume 250 kVA", "The Contractor's heating choice at 4.10 is checked against this. Reinforcement arising from its choice is its cost"],
      ["ELECTRICAL SUPPLY", "Standby generation available", "One 500 kVA set under P1, for life-safety and essential loads only", "The Contractor states which circuits it requires supported"],

      ["WATER SUPPLY", "Static head at the termination point", "TO BE CONFIRMED — assume 3.5 bar", "4.25"],
      ["WATER SUPPLY", "Dynamic pressure and flow at the termination point", "TO BE CONFIRMED — assume 2.0 bar at 1.5 l/s", "Design to this and state the assumption. Boosting, if required, is within P2"],
      ["WATER SUPPLY", "Fluid category at the incomer", "Category 5", "Backflow protection to BS EN 1717 and the Water Supply (Water Fittings) Regulations 1999"],
      ["WATER SUPPLY", "Maximum static pressure permitted at any outlet", "5 bar", "Pressure reducing valves where the design exceeds it"],
      ["WATER SUPPLY", "Incoming cold water temperature, summer design", "20 °C", "Drives the insulation requirement in the room data sheets"],

      ["DATA AND COMMS", "Fibre presented at the termination point", "2 no. single-mode pairs per block", "Terminated by P1; the Contractor terminates within the block"],
      ["DATA AND COMMS", "Wireless coverage requirement", "−67 dBm minimum, 2 devices per resident concurrently", "Section 6"],

      ["ACCESS AND LOGISTICS", "Laydown area allocated to this package", "0.42 ha, as shown on NR-TW-VIL-0201 Rev B", "14.3. Smaller than a tenderer may assume — satisfy yourself at tender"],
      ["ACCESS AND LOGISTICS", "Crane hardstanding design bearing pressure", "TO BE DESIGNED BY P1 to the pressure this Contractor states", "IF-03, 4.21. Not an assumption for either party to make alone"],
      ["ACCESS AND LOGISTICS", "Working hours", "As the planning consent at Appendix 3", "7.4"],
    ],
  },

  // ---------------------------------------------------------- APPENDIX 9
  a9: {
    intro:
      "This village accommodates shift workers. A proportion of them sleep during the day, in a bedroom on the sunlit side of a building, in a month when the standard overheating assessment assumes the room is empty. The criterion below is written for that, because an assessment run on a default residential occupancy profile would pass a building these residents cannot sleep in.",
    criteria: [
      ["Method", "CIBSE TM59, dynamic thermal modelling, using the weather file at Appendix 8 (CIBSE DSY1, 2020 high-emissions, 50th percentile) for the nearest applicable location.", "The model, its assumptions and its inputs are submitted before manufacture under 13.5."],
      ["Criterion A — living and amenity areas", "Hours of exceedance of the adaptive comfort threshold ΔT ≥ 1 K shall not exceed 3% of occupied hours between 1 May and 30 September.", "CIBSE TM52 Criterion 1, applied through TM59."],
      ["Criterion B — bedrooms, night", "Operative temperature shall not exceed 26 °C for more than 1% of the annual hours between 22:00 and 07:00.", "The standard TM59 bedroom criterion."],
      ["Criterion C — bedrooms, DAY-SLEEPING (this project)", "In every room modelled as day-occupied, operative temperature shall not exceed 26 °C for more than 1% of the annual hours between 08:00 and 16:00.", "THIS IS THE ADDITIONAL CRITERION. It is not in TM59 and it is required here."],
      ["Rooms to be modelled as day-occupied", "Not less than 30% of RT-01 rooms, selected as the worst case for orientation and floor level, distributed across every block.", "Appendix 6 shows the day-shift proportion. Modelling the best-oriented room proves nothing."],
      ["Occupancy assumption, day-sleeping rooms", "One person, sleeping, 08:00 to 16:00, with the blind closed and the window closed for security and noise.", "The window-open assumption that rescues most residential models is not available here — the village adjoins a live construction site."],
      ["Internal gains", "TM59 residential gains, plus the actual connected load of the Contractor's own equipment selection at 4.10 and G-series items.", "A model run on default gains and a design with higher-output equipment do not describe the same building."],
      ["Mechanical cooling", "Not permitted as the primary means of meeting these criteria. It may be offered as a departure under 13.4, priced separately, with its energy and maintenance consequence stated for P5.", "A village cooled mechanically for thirty-eight months is a different operating cost, and it is P5 that pays it."],
      ["Failure", "Where the model fails any criterion, the Contractor shall change the design and re-model. It shall not adjust the occupancy, the gains or the weather file to obtain a pass.", "Stated because it is the commonest way an overheating assessment is made to succeed."],
    ],
    comfort: [
      ["Acoustic", "The village adjoins a live construction site with consented working hours from 07:00. A day-sleeping resident is exposed to construction noise through the sleeping period, and the bedroom-to-outside sound insulation shall be designed for it — not merely for the bedroom-to-bedroom figure at section 6.", "Design and demonstrate. This interacts with overheating: a resident who must open a window for temperature loses the acoustic performance the design assumed."],
      ["Light", "Blackout to not more than 5 lux at the bed head with 20,000 lux on the external face of the glazing, per the room data sheets. A day-sleeping resident's blind is the only thing between them and the middle of the afternoon.", "Room data sheets, internal blind."],
      ["Ventilation", "The room shall be habitable with the window closed. Purge ventilation is a facility, not a design assumption.", "Room data sheets and 4.10."],
    ],
  },

  // --------------------------------------------------------- APPENDIX 11
  a11: {
    intro:
      "The asset data the Employer needs to operate and later relocate this village. The schema is agreed under IF-14 within eight weeks of award and BEFORE data collection begins — agreeing it afterwards produces a second collection exercise at the Contractor's cost.\n\nDelivery is as structured data. A folder of manufacturer PDFs is not an asset register; literature is required in addition, indexed against the same identifiers.",
    // [field, type, format / domain, mandatory, example]
    schema: [
      ["assetId", "Text", "NR-P2-<block>-<floor>-<room>-<type>-<nnn>. Must match a durable physical label on the asset.", "Yes", "NR-P2-A-01-A114-TMV-007"],
      ["classification", "Text", "Uniclass 2015 table Pr code", "Yes", "Pr_65_52_84_88"],
      ["assetType", "Text", "From the Employer's controlled list, issued with the schema", "Yes", "Thermostatic mixing valve"],
      ["manufacturer", "Text", "As on the product, not the supplier", "Yes", "—"],
      ["model", "Text", "Full model reference including variant", "Yes", "—"],
      ["serial", "Text", "Where the asset carries one", "Where applicable", "—"],
      ["block", "Text", "A to H", "Yes", "A"],
      ["floor", "Integer", "0 or 1", "Yes", "1"],
      ["room", "Text", "The room number as it appears on the signage at 4.20", "Yes", "A114"],
      ["installedDate", "Date", "ISO 8601, YYYY-MM-DD", "Yes", "2027-03-14"],
      ["commissionedDate", "Date", "ISO 8601", "Yes", "2027-03-28"],
      ["warrantyStart", "Date", "ISO 8601", "Yes", "2027-03-28"],
      ["warrantyExpiry", "Date", "ISO 8601", "Yes", "2029-03-27"],
      ["expectedLife", "Integer", "Years", "Yes", "12"],
      ["maintenanceActivity", "Text", "The activity, not a reference to a manual", "Yes", "Thermal disinfection and strainer clean"],
      ["maintenanceFrequency", "Text", "Months, or an SFG20 schedule reference", "Yes", "6"],
      ["criticality", "Integer", "1, 2 or 3. 1 = an occupant cannot remain in the room while it is out of service", "Yes", "1"],
      ["sparesReference", "Text", "Part number, and whether held or lead time", "Where criticality = 1", "TMV3-CART-15 / held"],
      ["meterPoint", "Text", "Where the asset is metered, the point name used at 4.24 and 4.25", "Where applicable", "NR-P2-A-ELEC-HEAT"],
      ["relocatable", "Boolean", "TRUE where the asset survives dismantling under 13.7", "Yes", "TRUE"],
      ["documentRefs", "Text", "Semicolon-separated document numbers in the CDE", "Yes", "NR-P2-OM-0114; NR-P2-CERT-0231"],
    ],
    rules: [
      ["Format", "COBie 2.4 (Component, Type, System, Spare, Job sheets) or the Employer's spreadsheet issued with the schema. Not PDF. Not a proprietary export nobody else can open."],
      ["Naming and the CDE", "Documents named to BS EN ISO 19650-2 and the Employer's project code, issued through the Employer's CDE. A document sent by email is not issued and does not start any review period at 13.5."],
      ["Progressive delivery", "The register is populated as assets are installed, not compiled at handover. The Employer may inspect it at any time and it is a hold on payment if it is more than one month behind installation."],
      ["Meter point naming", "The metering points at 4.24 and 4.25 use the same identifiers as the assets they measure, so that a consumption reading traces to an asset without a translation table."],
      ["Relocation", "The relocatable flag is what makes the schedule of consumed components at 13.7 checkable. An asset marked TRUE that does not survive dismantling is a defect in the data as much as in the design."],
      ["Handover test", "P5 shall be able to raise a work order against any asset, find its spare, and see its warranty position, using the register alone, on the day of handover. That is the acceptance test for this appendix."],
    ],
  },

  // --------------------------------------------------------- APPENDIX 12
  a12: {
    intro:
      "Social value is 5% of the tender score. This appendix says what is measured, in what unit, and what evidence is required, so that what is scored is a commitment rather than an assertion.\n\nCommitments offered are CONTRACTUAL. They are reported quarterly in the same units in which they were offered, and a shortfall is made good or explained. A commitment that is not measured is marketing and it will be scored as such.",
    ttwa: "The travel-to-work area for this project is defined as the area within a 25-mile road distance of the site entrance shown on NR-TW-VIL-0201. Where a commitment refers to local employment or local spend, it means within that area, evidenced by postcode.",
    // [theme, outcome, measure, unit, evidence, weight]
    framework: [
      ["Employment", "Local people into work on this package", "Full-time-equivalent roles filled by people resident in the travel-to-work area", "FTE", "Payroll postcode data, quarterly", "25%"],
      ["Employment", "People facing barriers into work", "Roles filled by people unemployed for more than six months, care leavers, ex-service personnel or prison leavers at the point of recruitment", "Nr", "Recruitment records and the referring organisation's confirmation", "15%"],
      ["Skills", "Apprenticeships and structured training delivered on this package", "Apprenticeship weeks and structured training weeks", "Weeks", "Training provider records and the apprenticeship agreement", "20%"],
      ["Skills", "Manufacturing skills, at the place of manufacture", "Training weeks delivered in the factory producing these modules", "Weeks", "Factory training records, and the disclosure required at 10.7", "10%"],
      ["Local economy", "Spend with small and medium-sized enterprises", "Contract value sub-let to SMEs as defined by the Companies Act 2006", "% of contract value", "Sub-contract records with company numbers", "15%"],
      ["Local economy", "Spend with voluntary, community and social enterprises", "Contract value spent with VCSEs", "% of contract value", "Sub-contract records and charity or CIC numbers", "5%"],
      ["The people who live here", "One commitment directed at the residents of this village", "Stated by the tenderer, measured in the unit it states", "As offered", "As offered — the tenderer defines the evidence and is held to it", "10%"],
    ],
    rules: [
      ["What is not counted", "Work the Contractor would have done anyway, counted as social value. An apprentice already employed before award is not an apprenticeship created by this package, and claiming one is a scoring matter at tender and a contractual one afterwards."],
      ["Baseline", "Every commitment is stated as an increment over the tenderer's existing position, and the existing position is disclosed. A percentage with no baseline is not a commitment."],
      ["Reporting", "Quarterly, in the same units offered, with the evidence named in the framework. Reported to the Employer and to P5, who will be operating alongside the same community for thirty-eight months."],
      ["Shortfall", "Made good within the following quarter, or explained in writing with a proposal for an equivalent. Repeated unexplained shortfall is a matter for the change and performance provisions, not a matter of goodwill."],
      ["The seventh theme", "It carries a tenth of the weight and it is the one the Employer reads first. Two hundred and twenty-five people will live on this site for up to thirty-eight months, some of them a long way from home, working shifts. A commitment aimed at them is worth more than a percentage aimed at a spreadsheet."],
    ],
  },
};
