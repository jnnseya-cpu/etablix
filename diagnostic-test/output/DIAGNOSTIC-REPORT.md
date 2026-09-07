# Site Systems Diagnostic — Ridgeway Grid Connection

**Synthetic test document. Not a real project, client or engagement.**
Produced from the eight inputs in `../inputs/` to test whether the twelve
advertised deliverables can actually be produced from what the website asks a
client to provide.

Basis of preparation: figures are first-pass planning estimates from the
information supplied. Every load, ratio and duration below is flagged for
validation by a competent person. Where information was not provided, that is
stated rather than assumed.

---

## Findings in one paragraph

The programme is not deliverable as written, and the reason is not
construction. Site access is set for 1 March 2027, but three consents that
must precede it have not been applied for: the Section 278 for the only
access (20 weeks from application), the badger licence covering Parcel B
(12–16 weeks), and the DNO connection for a supply nobody has yet sized.
Working backwards from 1 March, the last responsible date to start the
Section 278 is around mid-October 2026 — roughly six weeks away. Separately,
two-shift working from January 2028 is prohibited by planning condition 14 as
currently worded, which no document reconciles. Nine of the eleven
site-services packages are unstarted or unowned, two of the started ones were
enquired separately by different buyers three weeks apart, and reinstatement
is assumed to sit with a contractor whose works finish twenty months before
it is needed.

---

## 1 · Site-service package map

Eighteen packages are required. Eleven are recognised in the EPC's list;
seven are not identified anywhere.

| # | Package | Status in EPC list | Scope boundary |
|---|---|---|---|
| P01 | Enabling civils & hardstanding | Tendering | Compound formation, haul roads, drainage, hardstanding |
| P02 | Cabin hire — offices | Enquiry issued | Supply, install, maintain, remove office accommodation |
| P03 | Cabin hire — welfare | Within P02 enquiry | WCs, showers, drying, canteen, lockers |
| P04 | Temporary power generation | Enquiry issued | Generation, distribution, fuel, maintenance |
| P05 | Grid connection (DNO) | **Not identified** | Application, connection works, metering |
| P06 | Temporary water supply | Not started | Source, storage, distribution, potability |
| P07 | Foul drainage & effluent | Not started | Collection, treatment or tankering, consent |
| P08 | Security — guarding & systems | Not started | Manned guarding, CCTV, access control, perimeter |
| P09 | Cleaning | Not started | Welfare, offices, accommodation |
| P10 | Waste management | Not started | Segregation, storage, removal, duty of care |
| P11 | Catering | Not started | Canteen operation, provisions, food safety |
| P12 | Workforce accommodation | "Site team to arrange" | Beds, servicing, transport, resident management |
| P13 | Personnel transport / shuttle | Not identified | Shuttle, parking management, travel plan |
| P14 | Site comms & IT | Within EPC scope | Wi-fi, mobile, CCTV backhaul, site systems |
| P15 | Temporary heating | **Not identified** | Cabin, accommodation and process heating |
| P16 | Fuel storage & management | **Not identified** | Bunded storage, dispensing, spill control |
| P17 | Dust, wheel-wash & road cleaning | **Not identified** | Suppression, wheel-wash, off-site road sweeping |
| P18 | Reinstatement & demobilisation | Assumed in P01 | Removal, remediation, restoration, handback |

**Seven unowned packages: P05, P13, P15, P16, P17, and functionally P12 and
P18.** Each is a cost and a lead time nobody currently holds.

---

## 2 · Scope-gap assessment

Ten gaps. Ranked by how much programme they can take.

| Ref | Gap | Consequence | Severity |
|---|---|---|---|
| G01 | Section 278 not applied for; 20-week authority lead time against a 1 Mar 2027 access date | No lawful access. Blocks everything including 9 abnormal loads | **Critical** |
| G02 | Two-shift working (Jan 2028) conflicts with planning condition 14 hours | Either the programme or the consent is wrong; 9 months of erection at risk | **Critical** |
| G03 | No DNO application; supply not sized | Connection lead times run 3–12 months. Generation cost and fuel logistics undefined | **Critical** |
| G04 | Badger licence not applied for; 12–16 weeks; sett 40m from Parcel B | Parcel B unusable at the date it is needed | High |
| G05 | Accommodation unowned: 112 beds needed at peak against 180 in the local town, with a competing project mobilising Q3 2027 | Cost escalation and a workforce that cannot reach site | High |
| G06 | 90 parking spaces against ~280 on site at shift overlap; no shuttle strategy | Overspill parking on the B-road; planning and community risk | High |
| G07 | No ground investigation in the temporary works areas; made ground of unknown depth beneath the proposed compound | Hardstanding design unquantifiable; P01 price is a guess | High |
| G08 | Reinstatement assumed within P01, whose works end Jun 2027 for a Feb 2029 need | Almost certainly not in the contract. Late, sole-source, expensive | Medium |
| G09 | No water or foul enquiry; no mains within 1.4 km; no discharge consent | Tankering by default at ~1.5 loads/day each way, unbudgeted and untracked in the traffic plan | Medium |
| G10 | Parcel B separated from Parcel A by a cable easement no heavy plant may cross | Whatever goes on Parcel B cannot be serviced conventionally | Medium |

---

## 3 · Supplier-interface matrix

Twenty-two interfaces identified. The twelve that fail expensively:

| Ref | Between | The interface | If unowned | Proposed owner |
|---|---|---|---|---|
| IF-01 | P02/P03 ↔ P04 | Generator sized to the cabin schedule | Enquiries went out 3 weeks apart from different buyers — the generator is being sized against a schedule that has since changed | ETABLIX |
| IF-02 | P04 ↔ P05 | Generation as bridge to, or substitute for, grid connection | Generators hired for 26 months at a cost nobody compared against connection | ETABLIX |
| IF-03 | P12 ↔ P13 | Beds to shuttle to shift start | Workforce housed 40 minutes away with no transport; late starts every day | ETABLIX |
| IF-04 | P12 ↔ P03 | Whether welfare sizes for residents or day workers | Welfare undersized at handover or oversized for 26 months | ETABLIX |
| IF-05 | P06 ↔ P11 | Potable water for catering | Catering opens without a potable certificate; food-safety stop | P06 |
| IF-06 | P06 ↔ P07 | Inflow drives outflow volume | Foul sized on a guess; tanker frequency wrong | ETABLIX |
| IF-07 | P01 ↔ P02/P03 | Cabin bases and services ducting before delivery | Cabins arrive to unprepared ground; craneage stands | P01 |
| IF-08 | P01 ↔ P18 | Who removes what P01 built | The gap in G08 — reinstatement priced late, by whoever is left | ETABLIX |
| IF-09 | P08 ↔ P14 | CCTV backhaul, power and comms to the gatehouse | The classic: gatehouse built, no data link | ETABLIX |
| IF-10 | P09/P10 ↔ P11 | Catering waste segregation and removal frequency | Food waste held on site; pest and reputational risk | P10 |
| IF-11 | P17 ↔ highway authority | Wheel-wash performance vs. condition on road cleanliness | Enforcement action; possible stop notice | P17 |
| IF-12 | P16 ↔ P04 | Fuel storage, bunding and dispensing for generators | Generators delivered, no compliant fuel storage; environmental exposure | ETABLIX |

Full register of 22 in the issued report.

---

## 4 · Workforce-demand profile

| Period | Average | Peak | Beds required | Parking demand |
|---|---|---|---|---|
| Mar–Jun 2027 | 45 | 70 | 28 | 55 |
| Jul–Dec 2027 | 120 | 165 | 66 | 120 |
| Jan–Sep 2028 (2 shifts) | 210 | **280** | **112** | **≈200 at overlap** |
| Oct 2028–Jan 2029 | 150 | 190 | 76 | 135 |
| Feb–Apr 2029 | 60 | 85 | 34 | 65 |

Beds at 40% of peak, per the supplied estimate. **That 40% is unverified** —
no local labour market assessment exists, and it is the single number that
most changes accommodation cost. A 10-point error is 28 beds for 15 months.

Parking demand assumes a 45-minute shift overlap places both shifts on site
simultaneously. **90 spaces are provided. The shortfall at overlap is
approximately 110.**

---

## 5 · Temporary-utility demand assessment

### Power — indicative, for engineer validation

| Load | Connected | Diversity | Diversified |
|---|---|---|---|
| Offices (70 desks, ~315 m²) | 32 kW | 1.0 | 32 kW |
| Welfare — showers, water heating | 119 kW | 0.4 | 48 kW |
| Canteen | 40 kW | 0.6 | 24 kW |
| Drying room | 20 kW | 1.0 | 20 kW |
| Accommodation (112 beds, if on site) | 168 kW | 0.6 | 101 kW |
| Site and task lighting | 25 kW | 1.0 | 25 kW |
| Security, CCTV, comms | 10 kW | 1.0 | 10 kW |
| Construction small power, welding, workshop | 200 kW | 0.6 | 120 kW |
| **Total** | | | **380 kW** |

At 0.9 power factor with 25% headroom: **≈530 kVA with accommodation on
site; ≈400 kVA without.**

That difference is the point. **The accommodation decision changes the
connection by roughly 130 kVA and must be made before the DNO application,
not after.**

### Water and foul — indicative

| | With on-site accommodation | Off-site |
|---|---|---|
| Welfare, 50 l/person/day × 280 | 14.0 m³/day | 14.0 m³/day |
| Accommodation, 140 l/person/day × 112 | 15.7 m³/day | — |
| Dust suppression and wheel-wash (net of recycling) | 2.0 m³/day | 2.0 m³/day |
| **Peak potable demand** | **≈32 m³/day** | **≈16 m³/day** |
| **Foul at 90%** | **≈29 m³/day** | **≈14 m³/day** |

No mains within 1.4 km. At 20 m³ per tanker that is **up to 1.6 deliveries
and 1.5 removals per day at peak** — three HGV movements a day that appear
nowhere in the logistics plan (input 04) and were not counted in the 45/day
peak.

---

## 6 · Welfare and accommodation requirements

Sized to peak 280, against Schedule 2 of CDM 2015. Ratios are the planning
figures in common use; confirm against the client's own standard.

| Provision | Basis | Requirement |
|---|---|---|
| WCs | 1 per 25 | 12 |
| Wash basins | 1 per WC | 12 |
| Showers | 1 per 20 (dirty work) | 14 |
| Drying room capacity | Largest shift | 150 person-capacity |
| Lockers | 1 per person, largest shift | 150 |
| Canteen seats | 50% of largest shift, staggered breaks | 75 minimum, 100 recommended |
| Office desks | Management, HSEQ, EPC staff, support | 70 desks, ≈315 m² |
| First aid / medical room | Site population > 250 | 1 dedicated |

Accommodation: **112 beds at peak, sustained Apr 2028 – Jul 2028**, tapering
to 34 by Feb 2029. Against 180 hotel beds in the nearest town and a competing
project mobilising Q3 2027, sole reliance on local hotels is not a strategy.
Three options should be priced before Q1 2027:

1. **On-site modular village on Parcel B** — solves availability, but Parcel B
   is behind an uncrossable easement (G10, IF-10) and inside the badger
   licence area (G04). Servicing route must be designed first.
2. **Block-booked local capacity** — fastest, but exposed to the competing
   project and to seasonal rates.
3. **Off-site managed accommodation within a shuttle radius** — most likely
   deliverable, and makes P13 (shuttle) mandatory rather than optional.

---

## 7 · Mobilisation constraints

The consent chain, worked backwards from the 1 March 2027 access date:

| Consent | Lead time | Latest start | Applied for? |
|---|---|---|---|
| Section 278 (access bellmouth) | 20 weeks | **≈12 Oct 2026** | No |
| Badger exclusion licence (Parcel B) | 12–16 weeks | ≈16 Nov 2026 | No |
| CEMP approval (condition 22) | Assume 8 weeks | ≈04 Jan 2027 | No |
| DNO connection offer and works | 3–12 months, unquantified | **Already late if ≥6 months** | No |
| Planning discharge (stated assumption) | — | 15 Feb 2027 | Not confirmed |

**Approximately six weeks remain before the Section 278 makes 1 March 2027
undeliverable.** That is the finding this report exists to surface.

Physical constraints: single access point shared by 45 HGV/day, 9 abnormal
loads and up to 280 people; a 6" gas main crossing the northern access route;
made ground of unknown depth beneath the proposed compound; and a cable
easement dividing the two temporary works parcels.

---

## 8 · Procurement strategy

**Principle: buy the interfaces, not just the packages.** Fifteen of the
eighteen packages have at least one dependency on another. Letting them
separately, as P02 and P04 already have been, transfers the coordination cost
to the site team at the worst moment.

Recommended structure:

| Bundle | Packages | Why together | Approach |
|---|---|---|---|
| **A — Site establishment** | P01, P02, P03, P07 (drainage), P16, P17 | Bases, cabins, drainage and fuel share ground and sequence | Single contract, staged award |
| **B — Site services (operate)** | P08, P09, P10, P11, P15 | All are ongoing operate-phase services on one performance regime | One provider, output-specified |
| **C — Power and water** | P04, P05, P06 | Load and demand must be sized once, by one party | Design-and-supply, after the demand model is validated |
| **D — Workforce** | P12, P13 | Beds and transport are one problem | Single accountability |
| **E — Reinstatement** | P18 | Priced now, executed 2029, held as an option | Price at award of Bundle A |

Immediate procurement actions:
1. **Stop the P02 and P04 enquiries.** Re-issue against a validated demand
   schedule once §5 is engineer-checked. Continuing risks a generator sized
   to a superseded cabin schedule (IF-01).
2. Issue the DNO enquiry this month regardless of the accommodation decision;
   apply for the higher load and reduce later.
3. Price Bundle E now, while Bundle A is in competition and the incumbent has
   an incentive to be reasonable.

---

## 9 · Preliminary risk register

| Ref | Risk | P | I | Score | Mitigation | Owner |
|---|---|---|---|---|---|---|
| R01 | S278 not secured for 1 Mar 2027 access | 5 | 5 | **25** | Apply within 4 weeks; negotiate temporary access licence as fallback | Client |
| R02 | Two-shift working refused under condition 14 | 4 | 5 | **20** | Pre-application discussion now; model single-shift programme impact | EPC |
| R03 | DNO connection later than first power need | 4 | 4 | **16** | Enquire this month; size generation as bridge, not substitute | ETABLIX |
| R04 | Accommodation unavailable at peak | 4 | 4 | **16** | Price all three options by Q1 2027; block-book early | ETABLIX |
| R05 | Badger licence delays Parcel B | 3 | 4 | 12 | Apply Nov 2026; plan Parcel A-only compound as fallback | Ecologist |
| R06 | Made ground drives hardstanding cost | 4 | 3 | 12 | GI in temporary works areas before Bundle A award | Client |
| R07 | Parking overspill onto the B-road | 4 | 3 | 12 | Shuttle strategy within Bundle D; travel plan with the authority | ETABLIX |
| R08 | Reinstatement priced late and sole-source | 4 | 3 | 12 | Price within Bundle A; hold as priced option | ETABLIX |
| R09 | Tanker movements exceed traffic plan | 3 | 3 | 9 | Update TMP with the water and foul movements in §5 | EPC |
| R10 | Competing project draws local labour and beds | 3 | 3 | 9 | Labour market assessment; early accommodation commitment | ETABLIX |

Four risks score 16 or above. Three are consents, and all three are still
inside the window where action is cheap.

---

## 10 · Indicative cost structure

Order-of-magnitude only, to inform the delivery-model decision. **Not a
price, not a budget, and not a substitute for tendered rates.**

| Bundle | Basis | Indicative range |
|---|---|---|
| A — Site establishment | Compound formation, bases, cabins, drainage, fuel, dust | £850k – £1.4m |
| B — Site services (operate) | 26 months × security, cleaning, waste, catering, heating | £1.9m – £3.1m |
| C — Power and water | Connection, generation bridge, fuel, water, foul | £1.1m – £2.2m |
| D — Workforce | 112 beds at peak, tapering, plus shuttle | £2.4m – £4.6m |
| E — Reinstatement | Removal, remediation, restoration | £320k – £600k |
| **Total temporary site environment** | | **£6.6m – £11.9m** |

The spread is the story. It is driven by three unresolved decisions —
accommodation on or off site, grid connection versus generation for 26
months, and whether two-shift working survives condition 14. **Resolving
those three moves roughly £5.3m of range.** No procurement should be
committed against the top of these ranges until they are settled.

---

## 11 · Recommended delivery model

**Model 02 — Management Integrator.**

Model 01 (Advisory) is insufficient: the problems here are not analytical but
coordinative, and eleven of the eighteen packages have no owner. A report
alone leaves the same site team to hold the same interfaces.

Model 03 (Prime) is not appropriate at this stage on either side. It would
require the client to transfer £6.6m–£11.9m of supply chain before the three
decisions in §10 are settled, and prices risk that has not yet been sized.

Model 02 fits because the client keeps supplier contracts and the balance
sheet while ETABLIX takes coordination, the interface register and supplier
performance. It can start immediately against the consent chain in §7, which
is the only thing on the critical path this quarter. If the operate phase
proves the model, Model 03 for the workforce village alone is the natural
second-stage conversation — bounded, and after the unknowns are resolved.

---

## 12 · 30/60/90-day mobilisation actions

### First 30 days
1. **Submit the Section 278 application.** Nothing else on this list matters if this slips. *Client, with ETABLIX support.*
2. Issue the DNO enquiry at 550 kVA. Reduce later; you cannot accelerate later. *ETABLIX.*
3. Open the condition 14 conversation with the planning authority on two-shift working. *EPC.*
4. Suspend the P02 and P04 enquiries pending a validated demand schedule. *ETABLIX.*
5. Commission the ground investigation across both temporary works parcels. *Client.*

### Days 31–60
6. Engineer-validate the demand model in §5; issue as the basis for Bundle C. *ETABLIX + electrical engineer.*
7. Complete the labour market assessment and fix the travelling-workforce percentage. *ETABLIX.*
8. Price all three accommodation options; recommend one. *ETABLIX.*
9. Apply for the badger exclusion licence. *Client's ecologist.*
10. Submit the water connection enquiry and foul discharge consent. *ETABLIX.*

### Days 61–90
11. Issue Bundle A to tender against a designed compound and real ground data. *ETABLIX.*
12. Issue Bundle D with the accommodation decision made. *ETABLIX.*
13. Draft the CEMP for condition 22 approval. *EPC.*
14. Publish the full 22-row interface register with a named owner against every row. *ETABLIX.*
15. Establish the mobilisation gate schedule and the first monthly report. *ETABLIX.*

---

*Prepared as a capability test. Every figure requires validation by a
competent person before use. Where information was not provided it is
identified as missing rather than assumed.*
