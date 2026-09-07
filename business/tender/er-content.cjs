// Employer's Requirements — P2 Modular Accommodation. Content, separated from layout.
// Rev B. The "basis" column on every room data sheet line is the Rev B change: see 13.2.
//   E = Employer-prescribed. The Employer has specified the thing. The Contractor provides it
//       as described and the Employer carries the risk that what is described performs.
//   C = Contractor-designed. The Employer states a duty. The Contractor selects, designs and
//       warrants the means, and carries the risk that the means achieves the duty.
module.exports = {
  meta: {
    client: "Marrowbridge Infrastructure Ltd",
    project: "Project NORTHREACH — Workforce Accommodation Village",
    package: "P2 — Modular Accommodation",
    ref: "NR-ER-P2", rev: "B", date: "September 2026",
  },

  roomTypes: [
    { code: "RT-01", name: "Standard bedroom with ensuite shower room", qty: "199", note: "The base room. Every deviation is priced against this one." },
    { code: "RT-02", name: "Accessible bedroom with ensuite wet room", qty: "12", note: "Wheelchair accessible. Layout to be confirmed with Building Control." },
    { code: "RT-03", name: "Senior / long-stay bedroom with ensuite shower room", qty: "14", note: "As RT-01 with an increased desk and storage provision." },
  ],

  // Full line-item room data sheet: [item, RT-01, RT-02, RT-03, basis]
  rds: [
    ["GENERAL", "", "", "", ""],
    ["Nominal internal floor area", "11.0 m² minimum", "16.0 m² minimum", "14.0 m² minimum", "E"],
    ["Nominal internal width", "2.85 m minimum", "3.30 m minimum", "3.10 m minimum", "E"],
    ["Clear floor-to-ceiling height", "2.40 m minimum throughout, 2.30 m minimum beneath any bulkhead", "2.40 m minimum", "2.40 m minimum", "E"],
    ["Design occupancy", "1 person, single occupancy", "1 person, single occupancy", "1 person, single occupancy", "E"],
    ["Ensuite floor area", "2.6 m² minimum", "4.5 m² minimum, level access wet room", "2.6 m² minimum", "E"],
    ["Manoeuvring space", "Not applicable", "1500 mm diameter turning circle clear of the door swing, sanitaryware and fixed joinery, in both the room and the wet room", "Not applicable", "E"],

    ["ENTRANCE DOOR", "", "", "", ""],
    ["Clear opening width", "800 mm minimum, measured to BS 8300-2 Annex", "850 mm minimum. Note the dependency: 4.7 sets a 1200 mm corridor, for which a 1200 mm corridor approach requires 825 mm; 850 mm is required here", "800 mm minimum", "E"],
    ["Doorset", "Complete factory-assembled doorset, leaf, frame, seals and ironmongery from one certified supplier. Leaf thickness, core and frame section to the Contractor's design", "As RT-01", "As RT-01", "C"],
    ["Fire rating", "FD30S. Certified as a doorset, not as a leaf; intumescent and cold smoke seals to head and both jambs", "FD30S", "FD30S", "E"],
    ["Finish", "Factory-applied, wipe-clean, colour from the approved range at Appendix 5. Resistant to cleaning to the schedule of approved products schedule at 4.9", "As RT-01", "As RT-01", "C"],
    ["Ironmongery", "Lever furniture, satin stainless; hinges to EN 1935 Grade 13. Self-closing to EN 1154. Opening force not exceeding 30 N at the leading edge", "As RT-01, opening force not exceeding 20 N at the leading edge, measured with the closer set to close the door from 90°", "As RT-01", "E"],
    ["Lock", "Electronic access control to 4.18. FAIL-SECURE on loss of power AND on fire alarm activation; escape achieved mechanically from inside without a key, without electrical power and in a single action. See 4.18 — this is not a matter for the tenderer to decide", "As RT-01, with an inside lever operable with a closed fist and no pinch grip", "As RT-01", "E"],
    ["Vision panel", "None", "None", "None", "E"],
    ["Door number", "Tactile sign, characters 40 mm, luminance contrast not less than 30 LRV points against the sign face and the sign face against the wall, mounted 1400–1600 mm AFFL on the wall to the leading edge", "As RT-01, with embossed characters and Grade 1 braille", "As RT-01", "E"],

    ["WINDOW", "", "", "", ""],
    ["Window", "To achieve the thermal, acoustic, air permeability and security requirements at section 6, and the daylight and view requirement below. Frame material and section to the Contractor's design; unplasticised PVC-U permitted only where it meets the colour fastness requirement at 4.22", "As RT-01", "As RT-01", "C"],
    ["Daylight and view", "Clear glazed area not less than 1.1 m² per room, with a view out; head of the clear glazing not less than 1.8 m AFFL and cill not more than 1.1 m AFFL", "As RT-01, cill not more than 0.8 m AFFL so that the view out is available from a seated position", "As RT-01", "E"],
    ["Opening light", "One opening light, operable from standing, providing purge ventilation of not less than 4 air changes per hour with the door closed", "As RT-01, operable from a seated position with one hand and a force not exceeding 30 N", "As RT-01", "C"],
    ["Glazing", "Toughened or laminated to BS 6206 Class A where within 800 mm of finished floor level or within 300 mm of a door edge below 1500 mm", "As RT-01", "As RT-01", "E"],
    ["Restrictor", "Opening restricted to 100 mm, released only by a key or tool held by the operator, to prevent falls", "As RT-01", "As RT-01", "E"],
    ["Trickle ventilation", "5,000 mm² equivalent area per room minimum, controllable, sited so that it does not create a draught at the bed head", "As RT-01", "As RT-01", "E"],
    ["Internal blind", "Not more than 5 lux at the bed head with 20,000 lux measured on the external face of the glazing. No looped cord; where a cord is used it shall have a breakaway connector to BS EN 13120", "As RT-01, operable from a seated position — wand or motorised", "As RT-01", "C"],

    ["FINISHES — ROOM", "", "", "", ""],
    ["Floor", "Impervious sheet finish, seams welded, coved to the wall. Slip resistance PTV ≥ 36 dry. Wear classification not less than EN ISO 10874 Class 34 / 43. Residual indentation not exceeding 0.10 mm to BS EN ISO 24343-1. To meet the 38-month durability requirement at section 6", "As RT-01, PTV ≥ 36 wet and dry throughout", "As RT-01", "C"],
    ["Skirting", "Coved and welded to the wall finish, 100 mm, integral with the floor covering, no open joint at the junction", "As RT-01", "As RT-01", "E"],
    ["Walls", "Wipe-clean impervious finish, cleanable to BS EN ISO 11998 with the approved products schedule at 4.9. Impact resistance to 1200 mm AFFL not less than Category Severe Duty to BS 5234-2. Light reflectance value not less than 0.5", "As RT-01", "As RT-01", "C"],
    ["Ceiling", "Matt finish, light reflectance value not less than 0.7, no accessible void within the room, no demountable tile in a bedroom", "As RT-01", "As RT-01", "C"],

    ["FINISHES — ENSUITE", "", "", "", ""],
    ["Floor", "Impervious, PTV ≥ 36 wet, coved 150 mm to all walls, laid to falls to the gully with no ponding when tested by flooding to 5 mm and draining", "As RT-01, falls across the whole wet room floor to a level-access gully; no upstand or threshold at the shower", "As RT-01", "C"],
    ["Walls", "Fully sealed impervious panel system, full height, no tiled joint below 2.0 m, no sealant relied on as the primary water line at an internal corner", "As RT-01", "As RT-01", "C"],
    ["Ceiling", "Moisture-resistant, factory-finished, no accessible void", "As RT-01", "As RT-01", "C"],

    ["SANITARYWARE", "", "", "", ""],
    ["Shower", "Thermostatic control to BS EN 1111 or BS EN 15092. Maximum outlet temperature 41 °C, verified per outlet at 8.5. Flow 8–10 litres/minute at the design pressure stated at 4.25. Tray or pod impervious and falling to the outlet. Shower head height adjustable between 1.4 m and 2.0 m above the floor and lockable at the set height", "Level access, no tray upstand, thermostatic, fixed and handheld head, drop-down seat and grab rails to BS 8300-2", "As RT-01", "C"],
    ["WC", "Maximum full flush 6 litres with a reduced flush available. Seat height 400–450 mm. Pan type, cistern and flush mechanism to the Contractor's design; the mechanism shall be serviceable without removing permanent construction", "Doc M compliant pan, 480 mm seat height, drop-down and fixed grab rails, spatula or lever flush on the transfer side", "As RT-01", "C"],
    ["Basin", "Wall-hung, 500 mm minimum width, single lever mixer, integral overflow. Fixing capable of a 130 kg vertical load applied at the front edge", "Doc M compliant, lever mixer, knee clearance for a seated user, same 130 kg fixing requirement", "As RT-01", "E"],
    ["Towel warming", "Heated towel rail. Touchable surface temperature not exceeding 43 °C where accessible to an occupant. Output and control to the Contractor's design, coordinated with the heating duty below", "As RT-01, at a height reachable from a seated position", "As RT-01", "C"],
    ["Accessories", "Mirror, glass shelf, toilet roll holder, robe hook", "As RT-01 plus an emergency assistance alarm — pull cord to floor level, reset within the room, indicator outside the door and repeat to reception, to BS 8300-2", "As RT-01", "E"],

    ["FITTED JOINERY — SUPPLIED UNDER THIS PACKAGE", "", "", "", ""],
    ["Wardrobe", "Fitted, 600 × 600 × 1950 mm nominal, hanging length not less than 850 mm and enclosed storage volume not less than 0.55 m³, one shelf, lockable", "As RT-01, rail at 1050 mm maximum and shelf reachable from a seated position", "Fitted, 900 mm wide, hanging rail and three shelves, lockable, storage volume not less than 0.8 m³", "E"],
    ["Desk / worktop", "Fitted worktop 1000 × 500 mm at 730 mm AFFL, cable grommet, edge and surface resistant to the approved cleaning products schedule at 4.9", "As RT-01, knee clearance 750 mm minimum over a 700 mm width, no fixed pedestal", "Fitted worktop 1400 × 600 mm with a two-drawer fixed pedestal", "E"],
    ["Shelving", "One shelf over the desk, 900 mm", "As RT-01, at reachable height", "Two shelves over the desk", "E"],
    ["Note", "Bed, mattress, chair, bin and soft furnishings are supplied under P4 Furniture and are NOT in this package. The interface is scheduled at IF-05.", "As RT-01", "As RT-01", ""],

    ["MECHANICAL", "", "", "", ""],
    ["Space heating — duty", "Maintain 21 °C dry resultant with the window closed at the external design condition at Appendix 8 (−4 °C), at the ventilation rate scheduled below, with no occupancy gain assumed. Raise the room from 12 °C to 21 °C within 90 minutes from a cold start. Emitter type, rating, position and control to the Contractor's design", "As RT-01, controls at 1000 mm AFFL maximum and operable with a closed fist", "As RT-01", "C"],
    ["Space heating — control", "Occupant set-point limited to 16–24 °C, tamper resistant, with a setback when the room is unlet. Touchable surface of any emitter not exceeding 43 °C. Where a window is opened, heating to the room shall reduce to setback within 5 minutes", "As RT-01", "As RT-01", "C"],
    ["Ventilation — room", "Trickle ventilation as scheduled, plus continuous or intermittent mechanical extract from the ensuite achieving not less than 0.5 air changes per hour to the room over 24 hours", "As RT-01", "As RT-01", "E"],
    ["Ventilation — ensuite extract", "15 litres/second minimum, humidity sensing with 15-minute overrun, ducted to outside. Measured and recorded per room at 8.5", "As RT-01", "As RT-01", "E"],
    ["Hot water", "From the central system at 4.25; outlet temperature at basin and shower limited to 41 °C by a TMV3 valve, with 50 °C available at the valve inlet within 60 seconds", "As RT-01", "As RT-01", "E"],
    ["Cold water", "From the central system at 4.25; no storage within the room; cold water at every outlet not exceeding 20 °C after 2 minutes running", "As RT-01", "As RT-01", "E"],
    ["Pipework insulation", "All hot and cold pipework insulated within the room and ensuite, to prevent both heat loss and cold-water warming above the figure above", "As RT-01", "As RT-01", "E"],

    ["DRAINAGE WITHIN THE MODULE", "", "", "", ""],
    ["Waste falls", "40 mm waste laid at not less than 1:40 and not more than 1:10; 100 mm soil at not less than 1:80. No fall achieved by flexible pipe sag", "As RT-01", "As RT-01", "E"],
    ["Trap seals", "75 mm seal to every appliance connecting to a stack. 50 mm permitted to a shower gully only where the design demonstrates the seal is retained under the pressure regime at 4.23", "As RT-01", "As RT-01", "E"],
    ["Shower gully", "Removable grating, trap accessible and cleanable from within the ensuite without removing permanent construction", "As RT-01, level-access gully with a grating flush to the finished floor and a slip resistance not less than the surrounding floor", "As RT-01", "E"],
    ["Rodding and access", "Every branch rodded from within the room or from a corridor access panel. No rodding access inside another occupant's room", "As RT-01", "As RT-01", "E"],
    ["Air admittance valves", "Permitted only where the drainage design at 4.23 demonstrates the stack is adequately ventilated. Where used: to BS EN 12380, accessible, in a ventilated space, above the flood level of the highest appliance, and every one scheduled in the O&M with its location and replacement interval", "As RT-01", "As RT-01", "C"],
    ["Connection to P1", "One connection per block at the invert on the coordination drawing, per IF-02. Within the module, the route to that connection is the Contractor's design", "As RT-01", "As RT-01", "C"],
    ["Testing", "Every waste and soil connection tested to BS EN 12056-2 and the trap seal retention tested, before any lining is closed. Recorded per room", "As RT-01", "As RT-01", "E"],

    ["ELECTRICAL", "", "", "", ""],
    ["Socket outlets", "4 no. twin switched 13 A: 2 at desk height, 1 at bedside, 1 at low level", "As RT-01, all outlets 700–1000 mm AFFL", "6 no. twin switched 13 A", "E"],
    ["Charging provision", "Integral charging at the desk and bedside positions, not less than 18 W total per outlet, connector types confirmed at design stage against the obsolescence requirement at 19.4", "As RT-01", "As RT-01", "C"],
    ["Lighting — room", "300 lux maintained at the desk plane, uniformity not less than 0.4, UGR not exceeding 19, colour rendering Ra ≥ 80. Switched at the door and at the bed head. Luminaire, lamp and control to the Contractor's design", "As RT-01, switches 900–1100 mm AFFL, with a luminance contrast of 30 LRV points against the wall", "As RT-01", "C"],
    ["Lighting — ensuite", "200 lux maintained at the basin, IP rating appropriate to the zone, interlocked with the extract", "As RT-01", "As RT-01", "C"],
    ["Reading light", "Over the bed head, independently switched, 200 lux at the pillow, not causing glare to the desk position", "As RT-01", "As RT-01", "C"],
    ["Data", "1 no. RJ45 outlet at desk position, Class E permanent link minimum, tested and certified to BS EN 50346", "As RT-01", "2 no. RJ45 outlets", "E"],
    ["Wireless", "Room to be covered by the village wireless network to the level at section 6; access points supplied and commissioned under this package", "As RT-01", "As RT-01", "E"],
    ["Television", "1 no. coaxial outlet at desk position", "As RT-01", "As RT-01", "E"],
    ["Shaver socket", "1 no. in the ensuite, IP-rated for the zone, isolating transformer to BS EN 61558-2-5", "As RT-01", "As RT-01", "E"],
    ["Smoke detection", "Optical detector to the room, addressable, connected to the village fire alarm at 4.15. Sounder level not less than 75 dB(A) at the bed head, per BS 5839-1 for a sleeping risk", "As RT-01 plus a visual alarm device to BS EN 54-23 and a vibrating pad interface at the bed position", "As RT-01", "E"],
    ["Emergency lighting", "Maintained luminaire to the corridor side of the door; escape route lighting to 4.16", "As RT-01", "As RT-01", "E"],

    ["PERFORMANCE", "", "", "", ""],
    ["Airborne sound — between bedrooms", "DnT,w + Ctr 45 dB minimum, verified by pre-completion testing on the sample described at 8.4", "As RT-01", "As RT-01", "E"],
    ["Airborne sound — bedroom to corridor", "DnT,w + Ctr 40 dB minimum, including the door", "As RT-01", "As RT-01", "E"],
    ["Impact sound — floor above", "L'nT,w 62 dB maximum", "As RT-01", "As RT-01", "E"],
    ["Fire — separating construction", "REI 60 between rooms and between room and corridor", "As RT-01", "As RT-01", "E"],
    ["Thermal — external wall", "U-value 0.22 W/m²K maximum", "As RT-01", "As RT-01", "E"],
    ["Thermal — roof", "U-value 0.16 W/m²K maximum", "As RT-01", "As RT-01", "E"],
    ["Thermal — glazing", "U-value 1.4 W/m²K maximum, whole window", "As RT-01", "As RT-01", "E"],
    ["Air permeability", "As 6 — measured on a completed block including the inter-module joints, not on a single module", "As RT-01", "As RT-01", "E"],
    ["Overheating", "Compliance with the criterion at Appendix 9, using CIBSE TM59, for a single-occupancy room occupied at night by a shift worker sleeping during the day where Appendix 6 shows day-shift working", "As RT-01", "As RT-01", "E"],
  ],
};
