/**
 * A stand-in for the Anthropic API, so the pipeline tests can run.
 *
 *   node backend/test/mock-anthropic.mjs &
 *   ANTHROPIC_BASE_URL=http://127.0.0.1:4199 node backend/server.js
 *
 * It answers each pass of the diagnostic with a plausible section set,
 * streams like the real API does, and records what it was sent — the
 * request log is how the context guard and the cache breakpoints are
 * checked without spending anything. It lived outside the repository for
 * a while, which meant the AI tests could only be run by whoever had it;
 * a test nobody else can run is a test nobody else runs.
 *
 * MOCK_DELAY   milliseconds per call (default 2500)
 * MOCK_LOG     where to write the request log (default alongside this file)
 * MOCK_PORT    port to listen on (default 4199)
 * MOCK_FAIL    "overload" | "400" | "timeout" — fail every call this way
 * MOCK_TRUNCATE "1" truncate every fresh pass once | "always" never finish
 *               | "ledger" truncate only the working paper, for ever
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const DELAY = Number(process.env.MOCK_DELAY || 2500);
const PORT = Number(process.env.MOCK_PORT || 4199);
const LOG_FILE = process.env.MOCK_LOG || path.join(path.dirname(fileURLToPath(import.meta.url)), "mock-log.json");
const FAIL = process.env.MOCK_FAIL || "";
const TRUNCATE = process.env.MOCK_TRUNCATE || "";
const log = [];
const sec = (n, t, body) => `## ${n} · ${t}\n${body}`;

export function answer(task) {
  if (/Reply with exactly/.test(task)) return "ETABLIX AI online";

  // AGENT 2 FIRST OF ALL, and the reason is the same one the note below
  // gives: its passes say "Write parts 1 and 2 of the bid file" while Agent
  // 13's say "of the tender pack". Those are one word apart, and getting the
  // match wrong does not fail loudly — the splitter takes sections by number,
  // so the tender pack's Part 1 would land in the bid file's Part 1 and the
  // document would look perfectly correct.
  //
  // The checklist and the responses below deliberately reconcile: three
  // required deliverables, three drafted responses, matching SUB references,
  // and every deadline an actual date. The completeness check is what decides
  // whether a bid may be submitted, so a mock that did not reconcile would
  // make every test run report a failure that was the mock's fault.
  // AGENT 3 — the interface register. First, like the others, and for the
  // same reason: a wrong match puts another product's content in the right
  // numbered field, where it looks correct.
  //
  // The register and the movement log below deliberately reconcile: three
  // interfaces, each logged, each with ONE named owner, each with a boundary
  // a person could stand at, each dated — and one closure logged for an
  // interface that is correctly absent from the register.
  // AGENT 14 — the adversarial challenger. Matched FIRST, and on "of the
  // challenge report", because agents 2, 3 and 13 all say "Write parts 1 and
  // 2 of the ..." and the four are one word apart. A wrong match here would
  // put a bid file's Part 1 into a challenge report's Part 1, and the
  // splitter takes sections by number, so the document would look correct.
  //
  // The report below deliberately PASSES the challenge check: all nine lenses
  // carry a heading and a body, every finding names one lens from the nine,
  // one severity from the four, a location, a remedy — and the critical
  // finding's disposition is empty, because a critical finding is a hard
  // block and recording one as accepted quietly downgrades it.
  if (/CHALLENGE WORKING PAPER/.test(task))
    return "## A · WHAT THE DOCUMENT COMMITS TO\n| Commitment | Where | Qualified elsewhere |\n|---|---|---|\n| Two shifts, 340 operatives at peak | Method statement, para 4 | No |\n| Welfare available from week 3 | Programme narrative, para 2 | Yes — qualification 7 makes it subject to access |\n| £10m public liability | Section 6, sentence 1 | No |\n\n## B · WHAT IT IS BEING JUDGED AGAINST\n| Ref | Requirement | Weighting |\n|---|---|---|\n| SUB-1 | Method statement | 30% |\n| SUB-2 | Programme | 25% |\n| SUB-3 | Insurance evidence | Pass/fail |\n| SUB-4 | Social value plan | 15% |\n\n## C · THE MAP BETWEEN THEM\n| Requirement | Answered at | Complete |\n|---|---|---|\n| SUB-1 | Section 4 | Yes |\n| SUB-2 | Section 5 | Yes |\n| SUB-3 | Section 6 | Yes |\n| SUB-4 | Nothing | NO |\n\n## D · THE NUMBERS IN THE DOCUMENT\n| Quantity | First occurrence | Second occurrence | Agree |\n|---|---|---|---|\n| Peak operatives | 340, method para 4 | 340, programme para 6 | Yes |\n| Welfare units | 18, section 4 | 16, the resource schedule | NO |\n\n## E · THE EVIDENCE THE DOCUMENT RELIES ON\n| Claim | Evidence supplied | Expires |\n|---|---|---|\n| ISO 9001 | Certificate GB-2024-118 | 2026-10-01 |\n| £10m public liability | Schedule of insurance | 2027-03-31 |\n| Comparable scheme at Hinkley | Nothing | UNSUPPORTED |\n\n## F · INDEPENDENCE\nThe document under review was produced by run bid-0091 on the frontier route. This challenge is run bid-0104 on a separate prompt lineage and a different route. The two do not share a run or a lineage.";
  if (/Write parts 1 and 2 of the challenge report/.test(task))
    return [sec(1, "Compliance lens", "Examined every requirement in the invitation against the response map in section C of the working paper, and against nothing else.\n\nCH-1. SUB-4, the social value plan, is not answered anywhere in the document. The invitation weights it at fifteen per cent and lists it as a required deliverable, so this is not a lost mark, it is a non-compliant tender.\n\nCH-2. SUB-3 is answered inside section 6 rather than as the separate attachment the invitation asks for."), sec(2, "Evaluator lens", "Read as a scorer with forty submissions, the published matrix and ninety minutes, using the weightings supplied.\n\nCH-3. The commitment to two shifts is in paragraph four of the method statement and the resource evidence for it is in the programme narrative two sections later. A scorer reading to the matrix will not join them, and the mark for resourcing is lost on an answer that is present.")].join("\n\n");
  if (/Write parts 3 and 4 of the challenge report/.test(task))
    return [sec(3, "Commercial lens", "Examined every commitment in section A of the working paper against the price, the qualifications and the exclusions supplied.\n\nCH-4. Section 4 commits to eighteen welfare units and the resource schedule prices sixteen. Two units is unpriced scope, and the number a client will hold us to is the one in the narrative."), sec(4, "Technical lens", "Examined the sequence in the method statement against the design maturity stated in the invitation.\n\nCH-5. The method energises the welfare units in week three and the distribution board they connect to is shown as a week five delivery in the same programme.")].join("\n\n");
  if (/Write parts 5 and 6 of the challenge report/.test(task))
    return [sec(5, "Programme lens", "Examined the resources the document commits to against the durations it claims, and against the access restriction in the invitation.\n\nCH-6. The three-week establishment assumes continuous access and the invitation restricts possession to weekends for the first month."), sec(6, "Contract lens", "Examined the wording sentence by sentence for conceded departures, created warranties and waived rights.\n\nCH-7. Section 4, sentence 3 reads \"we will ensure the welfare facilities are fit for their intended purpose\". The contract requires reasonable skill and care. That sentence is a fitness-for-purpose obligation, it is uninsured under our professional indemnity, and it was not asked for.")].join("\n\n");
  if (/Write parts 7 and 8 of the challenge report/.test(task))
    return [sec(7, "Evidence lens", "Examined every claim about the business in section E of the working paper against the evidence supplied and its expiry date.\n\nCH-8. The ISO 9001 certificate expires on 2026-10-01 and the submission deadline is 2026-10-15. It is valid today and worthless to this bid.\n\nCH-9. The comparable scheme at Hinkley is claimed in section 2 and no evidence for it was supplied at all."), sec(8, "Adversarial lens", "Read three times: as a competitor looking for a non-compliance, as the client's reviewer looking for what we quietly did not answer, and as a claims specialist two years from now.\n\nCH-10. The claims specialist reading section 5 finds \"in accordance with the client's programme\", which accepts a date we do not control as a contractual obligation.")].join("\n\n");
  if (/Write part 9 of the challenge report/.test(task))
    return sec(9, "Executive lens", "Examined the price and the exposure the lenses above found against the authority position supplied.\n\nCH-11. No signing limit was supplied for the named signatory. Authority for a tender of this value cannot be shown, and an unrecorded limit is not an unlimited one.\n\nOn the return: the fitness-for-purpose sentence and the missing social value plan together mean this submission is not currently capable of being submitted.");
  if (/Every lens is written\. Three things remain/.test(task))
    return "## 0 · The challenge in one paragraph\nThis submission cannot go: SUB-4 is not answered at all and the invitation lists it as a required deliverable, which makes the tender non-compliant rather than badly scored; behind that, section 4 concedes a fitness-for-purpose obligation the contract does not ask for and our professional indemnity does not cover, and the ISO 9001 certificate on which a pass/fail requirement rests expires fourteen days before the deadline.\n\n## 10 · The findings register\n| Ref | Lens | Severity | Where | The finding | What must happen | Disposition |\n|---|---|---|---|---|---|---|\n| CH-1 | compliance | CRITICAL | SUB-4, absent from the whole document | The social value plan is not answered anywhere | Write the SUB-4 response before submission | |\n| CH-2 | compliance | MEDIUM | Section 6, first paragraph | Insurance evidence is inside section 6 rather than a separate attachment | Move it to a separate attachment named as the invitation requires | |\n| CH-3 | evaluator | MEDIUM | Method statement paragraph 4 and programme narrative paragraph 6 | The shift commitment and its resource evidence are two sections apart | Repeat the resource figures in the method statement | |\n| CH-4 | commercial | HIGH | Section 4 against the resource schedule | Eighteen welfare units committed, sixteen priced | Price two further units or amend the commitment to sixteen | |\n| CH-5 | technical | HIGH | Method statement week 3 against programme week 5 | The units are energised two weeks before the board arrives | Move energisation to week 5 or bring the board forward | |\n| CH-6 | programme | MEDIUM | Programme narrative paragraph 2 | Three-week establishment assumes access the invitation restricts | Reprice against weekend possession or qualify the duration | |\n| CH-7 | contract | CRITICAL | Section 4, sentence 3 | Concedes a fitness-for-purpose obligation the contract does not require | Replace with reasonable skill and care | |\n| CH-8 | evidence | HIGH | Section 2, the ISO 9001 claim | The certificate expires 2026-10-01, fourteen days before the deadline | Obtain the renewed certificate before submission | |\n| CH-9 | evidence | HIGH | Section 2, the Hinkley claim | Claimed with no evidence supplied | Remove the claim or attach the reference | |\n| CH-10 | adversarial | MEDIUM | Section 5, \"in accordance with the client's programme\" | Accepts a date we do not control as a contractual obligation | Qualify it as subject to the access dates in the invitation | |\n| CH-11 | executive | HIGH | The authority position supplied | No signing limit is recorded for the named signatory | Record the signing limit before the submission is approved | |\n\nCritical 2, high 5, medium 4, low 0. The two critical findings hard-block this submission; the five high findings each block it unless an authorised disposition is recorded.\n\n## 11 · The challenge certificate\n**Independence.** The document under review was produced by run bid-0091; this challenge is run bid-0104 on a separate prompt lineage and a different model route. They share neither.\n\n**What was examined.** The full submission against the invitation, the evaluation weightings, the price, the qualifications and the evidence schedule. The signing authority was not supplied and is a finding rather than a gap.\n\n**The most consequential finding.** CH-1: SUB-4 is unanswered. On a public procurement that is a rejected tender, whatever the rest of it scores.\n\n**Whether this submission can go.** BLOCKED.\n\n**What must happen before it goes.** Write the SUB-4 response; replace the fitness-for-purpose sentence; obtain the renewed ISO 9001 certificate; price or remove the two welfare units; correct the energisation sequence; record the signatory's limit.\n\n**What this challenge could not test.** The technical lens had no design information beyond the programme, so buildability was tested against sequence alone. The executive lens had no authority schedule.\n\n## A · Every finding traced to where it was found\n| Ref | Found in |\n|---|---|\n| CH-1 | The invitation's deliverables list against the document |\n| CH-4 | Section 4 against the resource schedule |\n| CH-7 | Section 4, sentence 3 |\n| CH-8 | The evidence schedule |";
  if (/INTERFACE WORKING PAPER/.test(task))
    return "## A · PACKAGE REGISTER\n| Code | Package | Delivers | Supplier |\n|---|---|---|---|\n| P01 | Compound civils | Formation, hardstanding, drainage | Supplier A |\n| P02 | Welfare and accommodation | Units, setting-out, service connections | Supplier B |\n| P03 | Temporary power | Generation, distribution, metering | Supplier C |\n\n## B · THE PREVIOUS REGISTER, AS IT STOOD\n| Ref | Between | Owner | State | Date |\n|---|---|---|---|---|\n| IF-1 | P01 → P02 | Temporary Works Coordinator | Open | 2026-11-02 |\n| IF-2 | P02 → P03 | Delivery Lead | Open | 2026-11-09 |\n| IF-3 | P01 → P03 | Delivery Lead | Ready | 2026-10-12 |\n\n## C · EVERY BOUNDARY IN THE SYSTEM\n| Between | What passes | Direction |\n|---|---|---|\n| P01 / P02 | Formation handed over for cabin setting-out | P01 → P02 |\n| P02 / P03 | Distribution board position and load schedule | P02 → P03 |\n| P01 / P03 | Duct route and draw pits | P01 → P03 |\n\n## D · WHAT THE RECORD SAYS ABOUT OWNERSHIP\n| Boundary | Owner per the record | Source | Class |\n|---|---|---|---|\n| IF-1 | Temporary Works Coordinator | Subcontract P01 cl. 4.2 | CONTRACT |\n| IF-2 | Delivery Lead | Instruction 14 | INSTRUCTION |\n| IF-3 | Delivery Lead | Progress meeting 12 | MEETING NOTE |\n\n## E · WHAT CANNOT BE ESTABLISHED\n| Boundary | Missing | Prevents | Who settles |\n|---|---|---|---|\n| IF-2 | Whether the load schedule is P02's or P03's to issue | Closing IF-2 | Client PM |";
  if (/Write parts 1 and 2 of the interface register report/.test(task))
    return [sec(1, "Package boundary matrix", "| Code | Package | Delivers | Supplier | Boundary of scope |\n|---|---|---|---|---|\n| P01 | Compound civils | Formation and drainage | Supplier A | Top of formation at level 42.150 |\n| P02 | Welfare and accommodation | Units and connections | Supplier B | Slab edge, unit side |\n| P03 | Temporary power | Generation and distribution | Supplier C | Outgoing terminals of DB-01 |\n\nPackages that touch: P01 / P02, P02 / P03, P01 / P03."), sec(2, "The interface register", "| Ref | Between | The physical point | Owner | State | Date required | Accepted by |\n|---|---|---|---|---|---|---|\n| IF-1 | P01 → P02 | Top of formation at level 42.150, drawing C-1042 rev C | Temporary Works Coordinator | Open | 2026-11-02 | Client engineer |\n| IF-2 | P02 → P03 | Outgoing terminals of board DB-01, drawing E-3301 rev B | Delivery Lead | At risk | 2026-11-09 | Client engineer |\n| IF-4 | P01 → P03 | Draw pit DP-04 at the compound entrance, drawing C-1044 rev A | Temporary Works Coordinator | Open | 2026-11-20 | Client engineer |\n\nOpen: 2. At risk: 1. Falling due inside thirty days: 1.")].join("\n\n");
  if (/THE MOVEMENT LOG/.test(task))
    return sec(3, "Movement log", "| Ref | Movement | What changed | Why | Authorised by |\n|---|---|---|---|---|\n| IF-1 | CARRIED FORWARD | Nothing | — | MD |\n| IF-2 | DATE CHANGED | Date required: 2026-11-02 → 2026-11-09 | Grid connection date moved | Client PM, instruction 14 |\n| IF-3 | CLOSED | State: Ready → Closed | Duct route accepted on site | Client engineer, 2026-10-12 |\n| IF-4 | OPENED | New interface | Found this month: the duct route to P03 was never recorded | MD |\n\n**Closed this period.** IF-3, duct route and draw pits accepted by the client engineer on 2026-10-12 against a joint survey.\n\n**Opened this period.** IF-4 existed all along and was found this month rather than created — it is recorded as such rather than filed as new.");
  if (/Write parts 4 and 5 of the interface register report/.test(task))
    return [sec(4, "Interfaces at risk", "| Ref | If unresolved | Package stopped | Float | This week |\n|---|---|---|---|---|\n| IF-2 | Cabins cannot be energised | P02 | 4 days | Settle who issues the load schedule |\n\nIF-2 has four days of float and its ownership is disputed: P02 says the load schedule is P03's, P03 says it is P02's. Both believe it is resolved, which is worse than nobody owning it."), sec(5, "Demand and capacity behind the interfaces", "Peak 340 operatives on two shifts with a 60% overlap. Welfare sized on the overlap, not the headcount.\n\n| Demand | Basis | Value |\n|---|---|---|\n| Power | 203 kW connected, diversity 0.7 | 142 kW |\n| Water | 130 l/person/day | 27.4 m³/day |\n\nDiversity 0.7 from the cabin supplier's schedule. If peak headcount rises 20%, IF-2 must be renegotiated: DB-01 has no spare way.")].join("\n\n");
  if (/Write parts 6 and 7 of the interface register report/.test(task))
    return [sec(6, "Mobilisation and handover sequence", "| Ref | Date | Hands over | Receives | Evidence | Blocks |\n|---|---|---|---|---|---|\n| IF-1 | 2026-11-02 | P01 | P02 | Level survey | Cabin setting-out |\n| IF-2 | 2026-11-09 | P02 | P03 | Load schedule and test certificate | Energisation |\n\nIF-2 depends on the distribution network operator, where our own diligence changes nothing and the only useful action is starting earlier."), sec(7, "Design and programme change", "| Change | Source | Interfaces affected | What happened |\n|---|---|---|---|\n| Grid connection moved | Instruction 14 | IF-2 | Date moved 2026-11-02 → 2026-11-09 |\n| Duct route added | Drawing C-1044 rev A | IF-4 | Interface opened\n\nInstruction 14 was notified to P02 and P03. Drawing C-1044 rev A was not notified to P03, so P03 is working to a boundary it has not seen — and it is right to.")].join("\n\n");
  if (/Register certificate, decisions required and the audit trail/.test(task))
    return sec(8, "Register certificate, decisions required and the audit trail", "**Decisions required this month.**\n\n| Decision | By | Unblocks |\n|---|---|---|\n| Who issues the DB-01 load schedule | 2026-11-05 | IF-2 |\n| Notify P03 of drawing C-1044 rev A | 2026-10-30 | IF-4 |\n\n**What is being carried at risk.** Nothing is carried without an owner this issue.\n\n**The audit trail.** Previous issue 03, dated 2026-09-28. Ownership rests on: contract 1, instruction 1, meeting note 1, assumption 0.\n\n**Register certificate.** Issue 04, 2026-10-26. Two open, one at risk, one closed. Every interface carried forward from issue 03 is in this register or logged as closed. Every open interface names one accountable party and a boundary a person could witness. This register records ownership as the project has agreed it; it does not assign it.");
  if (/THE REGISTER IN ONE PARAGRAPH/.test(task))
    return "## 0 · THE REGISTER IN ONE PARAGRAPH\nTwo interfaces are open and one at risk, four movements were logged and nothing carried forward has been lost; every open interface has one named owner, but IF-2's ownership is disputed between P02 and P03 with four days of float, and it is the interface most likely to stop work in the next thirty days because the cabins cannot be energised without the load schedule; the decision that must be made before the next issue is who issues it, by 2026-11-05.\n\n## A · Traceability and open items\n| Ref | Between | Boundary from | Ownership from | Class |\n|---|---|---|---|---|\n| IF-1 | P01 → P02 | Drawing C-1042 rev C | Subcontract P01 cl. 4.2 | CONTRACT |\n| IF-2 | P02 → P03 | Drawing E-3301 rev B | Instruction 14 | INSTRUCTION |\n| IF-4 | P01 → P03 | Drawing C-1044 rev A | Progress meeting 14 | MEETING NOTE |";

  // AGENT 5 — the monthly control report. Matched before everything else for
  // the same reason as Agent 2: its passes say "of the monthly control
  // report", and a wrong match puts another product's content in the right
  // numbered field, where it looks correct.
  //
  // The earned value and the payment recommendations below deliberately
  // reconcile: three control accounts, three payments, each measured against
  // an account that exists, none exceeding what that account earned, and
  // every statutory date computed and in the right order. The reconciler
  // decides whether the report may be issued, so a mock that did not
  // reconcile would make every test run report a failure of its own making.
  if (/CONTROL LEDGER/.test(task))
    return "## A · CONTROL ACCOUNT REGISTER\n| Ref | Account | Package / supplier | Budget at award | Cost code |\n|---|---|---|---|---|\n| CA-1 | Compound civils | P01 / Supplier A | £900,000 | 4100 |\n| CA-2 | Welfare hire and service | P02 / Supplier B | £600,000 | 4200 |\n| CA-3 | Temporary power | P03 / Supplier C | £300,000 | 4300 |\n\n## B · WHAT THE EVIDENCE ACTUALLY SUPPORTS\n| CA | Claimed | Evidence | Class | Defensible position |\n|---|---|---|---|---|\n| CA-1 | 55% | Level survey 2026-09-28 | MEASURED | 53% |\n| CA-2 | 30% | Supplier's own email | ASSERTED | 28% |\n| CA-3 | 30% | Commissioning certificate | EVIDENCED | 30% |\n\n## C · APPLICATIONS AND THE PAYMENT TIMETABLE\n| Supplier | Applied for | Received | Due | Notice by | Final date | Pay-less by |\n|---|---|---|---|---|---|---|\n| Supplier A | £128,000 | 2026-09-15 | 2026-10-15 | 2026-10-20 | 2026-10-29 | 2026-10-22 |\n| Supplier B | £52,000 | 2026-09-15 | 2026-10-15 | 2026-10-20 | 2026-10-29 | 2026-10-22 |\n\n## D · CHANGE, AND WHAT IT HAS DONE TO THE NUMBERS\n| Ref | Change | Status | Value | CA | In budget? |\n|---|---|---|---|---|---|\n| CH-01 | Additional hardstanding | INSTRUCTED | £18,000 | CA-1 | In forecast, not budget |\n\n## E · WHERE THE RECORD CONTRADICTS ITSELF\n| CA | Position A | Position B | Affects | To settle |\n|---|---|---|---|---|\n| CA-2 | Supplier claims 30% | Inspection supports 28% | The valuation | Joint measure on site |";
  if (/Write parts 1 and 2 of the monthly control report/.test(task))
    return [sec(1, "Position at the end of this period", "Period 09/2026, data date 2026-09-30. The compound is 53% complete against a baseline 56%. The completion date still holds on a two-week float.\n\n| Package | Baseline | Actual | Variance |\n|---|---|---|---|\n| P01 Compound civils | 56% | 53% | -3% |"), sec(2, "Earned value by control account", "| Ref | Control account | Budget | Value earned this period | Value earned to date | SPI | CPI |\n|---|---|---|---|---|---|---|\n| CA-1 | Compound civils | £900,000 | £120,000 | £477,000 | 0.95 | 1.02 |\n| CA-2 | Welfare hire and service | £600,000 | £45,000 | £168,000 | 0.93 | 0.98 |\n| CA-3 | Temporary power | £300,000 | £30,000 | £90,000 | 1.00 | 1.00 |\n\nBasis: measured quantities at award rates. CA-2 is below 0.95 on SPI and triggers commercial review — the welfare service is behind the occupancy curve. CA-2's figure is valued at the inspected 28% rather than the 30% claimed, which is ASSERTED.")].join("\n\n");
  if (/Write parts 3 and 4 of the monthly control report/.test(task))
    return [sec(3, "Change control register", "| Ref | Change | Instructed by | Date | Status | Value | CA | Effect on completion |\n|---|---|---|---|---|---|---|---|\n| CH-01 | Additional hardstanding | Client PM | 2026-09-08 | INSTRUCTED | £18,000 | CA-1 | None |\n\nInstructed and valued £18,000; notified and not yet valued £0; claimed and disputed £0."), sec(4, "Valuation this period", "| CA | Earned this period | Instructed change | Not supported | Assessed |\n|---|---|---|---|---|\n| CA-1 | £120,000 | £18,000 | £0 | £138,000 |\n| CA-2 | £45,000 | £0 | £0 | £45,000 |\n| CA-3 | £30,000 | £0 | £0 | £30,000 |\n\nGross assessed this period £213,000. Cumulative £753,000. Less previously certified £540,000. Less retention at 3% £6,390. Net for this period £206,610.\n\nSupplier B applied for £52,000 against an assessed £45,000. The £7,000 difference is the 2% of progress the inspection did not support, and those are the words for the payment notice. Retention is held by the client, not by ETABLIX.")].join("\n\n");
  if (/THE PAYMENT RECOMMENDATIONS/.test(task))
    return sec(5, "Payment recommendations", "| Ref | Supplier | Control account | Amount recommended | Due date | Final date for payment | Pay-less by |\n|---|---|---|---|---|---|---|\n| 1 | Supplier A | CA-1 | £120,000 | 2026-10-15 | 2026-10-29 | 2026-10-22 |\n| 2 | Supplier B | CA-2 | £45,000 | 2026-10-15 | 2026-10-29 | 2026-10-22 |\n| 3 | Supplier C | CA-3 | £30,000 | 2026-10-15 | 2026-10-29 | 2026-10-22 |\n\n**Notices due before the next report.** Supplier B's payment notice by 2026-10-20, stating £45,000 and its basis — served by the client's commercial lead. Missing it makes the £52,000 applied for payable in full.\n\n**Anything earned and not recommended.** None this period.\n\n**Set-off and withholding.** Nothing withheld.\n\nETABLIX recommends; the client pays, by a named person with delegated authority. This is not a certificate under the appointment.");
  if (/Write parts 6 and 7 of the monthly control report/.test(task))
    return [sec(6, "Cost forecast and outturn", "| CA | Budget | Committed | Spent | Forecast to complete | Outturn | Variance |\n|---|---|---|---|---|---|---|\n| CA-1 | £900,000 | £918,000 | £477,000 | £441,000 | £918,000 | -£18,000 |\n\nBasis: remaining measured work at award rates. The three most likely to move are CA-1 on ground conditions, CA-2 on occupancy, CA-3 on the grid connection date."), sec(7, "Cash flow, exposure and reserve", "| Month | Committed payments | Confirmed receivables | Reserve |\n|---|---|---|---|\n| 2026-10 | £206,610 | £240,000 | £150,000 |\n\nThe exposure test passes: committed exposure £206,610 against receivables plus reserve of £390,000, and the reserve covers next month's forecast of £198,000.")].join("\n\n");
  if (/Certificate, decisions required and the audit trail/.test(task))
    return sec(8, "Certificate, decisions required and the audit trail", "**Decisions required this month.**\n\n| Decision | By | If not |\n|---|---|---|\n| Serve Supplier B's payment notice at £45,000 | 2026-10-20 | The £52,000 applied for becomes payable in full |\n| Joint measure of CA-2 on site | 2026-10-10 | Next month's valuation rests on assertion again |\n\n**Notices and deadlines.** Payment notices by 2026-10-20; pay-less by 2026-10-22; final date for payment 2026-10-29.\n\n**The audit trail.** Data date 2026-09-30. CA-2 valued at the inspected position rather than the claimed one; the contradiction is open.\n\n**Valuation certificate.** Gross £213,000, net £206,610. Every payment recommended is measured against a control account and does not exceed the value earned on it. ETABLIX recommends and the client pays. This report is decision support and not a certificate under the appointment.");
  if (/THE MONTH IN ONE PARAGRAPH/.test(task))
    return "## 0 · THE MONTH IN ONE PARAGRAPH\nThe completion date still holds on two weeks of float; £195,000 of value was earned and £195,000 is recommended for payment across three suppliers, net £206,610 after change and retention; the largest movement is £18,000 of instructed hardstanding on CA-1, which is in the forecast and not the budget; the exposure test passes; and Supplier B's payment notice must be served by 2026-10-20 or the £52,000 they applied for becomes payable in full against an assessed £45,000.\n\n## A · Traceability and open items\n| Rec | Supplier | CA | Earned this period | Recommended | Evidence class |\n|---|---|---|---|---|---|\n| 1 | Supplier A | CA-1 | £120,000 | £120,000 | MEASURED |\n| 2 | Supplier B | CA-2 | £45,000 | £45,000 | ASSERTED, valued down |\n| 3 | Supplier C | CA-3 | £30,000 | £30,000 | EVIDENCED |";

  if (/BID WORKING PAPER/.test(task))
    return "## A · THE INVITATION, IDENTIFIED\n| Document | Ref | Rev | Date | For |\n|---|---|---|---|---|\n| Invitation to tender | ITT-2026-114 | C | 2026-08-28 | Pricing |\n| Conditions of contract | CC-114 | A | 2026-08-28 | Information |\n\n## B · REQUIREMENTS REGISTER\n| Ref | Requirement | Verbatim | Source | Type | Clear? |\n|---|---|---|---|---|---|\n| RQ-1 | Method statement | \"The Tenderer shall submit a method statement of no more than six pages.\" | ITT 4.2 | Mandatory | Clear |\n| RQ-2 | Priced schedule | \"Prices shall be submitted on the Employer's pricing template.\" | ITT 5.1 | Mandatory | Clear |\n| RQ-3 | Insurance | \"Evidence of public liability insurance of not less than £10m.\" | ITT 6.4 | Mandatory | AMBIGUOUS |\n\n## C · WHAT MUST BE RETURNED, AND BY WHEN\n| Deliverable | RQ | Format | Limit | Deadline as written | Where |\n|---|---|---|---|---|---|\n| Method statement | RQ-1 | PDF | 6 pages | \"by 12:00 on 15 September 2026\" | Portal |\n\n## E · WHAT THE DOCUMENTS DO NOT SAY\n| Ref | Missing | Prevents | Clarification or risk |\n|---|---|---|---|\n| OI-01 | Whether insurance is per claim or in aggregate | RQ-3 compliance | Clarification |";
  if (/Write parts 1 and 2 of the bid file/.test(task))
    return [sec(1, "Requirements register", "| Ref | Requirement | Verbatim quote | Source | Type |\n|---|---|---|---|---|\n| RQ-1 | Method statement | \"The Tenderer shall submit a method statement of no more than six pages.\" | ITT 4.2 | Mandatory |\n| RQ-2 | Priced schedule | \"Prices shall be submitted on the Employer's pricing template.\" | ITT 5.1 | Mandatory |\n| RQ-3 | Insurance | \"Evidence of public liability insurance of not less than £10m.\" | ITT 6.4 | Mandatory |"), sec(2, "Compliance matrix", "| RQ | Requirement | Position | Evidence | Where |\n|---|---|---|---|---|\n| RQ-1 | Method statement | COMPLY | Drafted at Part 4 | SUB-1 |\n| RQ-2 | Priced schedule | COMPLY WITH COMMENT | Employer's template not yet issued | SUB-2 |\n| RQ-3 | Insurance | GAP | £5m held, £10m quoted and not yet bound | SUB-3 |")].join("\n\n");
  if (/THE SUBMISSION CHECKLIST AND TIMETABLE/.test(task))
    return sec(3, "Submission checklist and timetable", "| Ref | Deliverable | Where required | Format | Limit | Deadline |\n|---|---|---|---|---|---|\n| SUB-1 | Method statement | RQ-1, ITT 4.2 | PDF | 6 pages | 12:00 on 15 September 2026 |\n| SUB-2 | Priced schedule | RQ-2, ITT 5.1 | Employer's template | none stated | 12:00 on 15 September 2026 |\n| SUB-3 | Insurance certificates | RQ-3, ITT 6.4 | PDF | none stated | 12:00 on 15 September 2026 |\n\n**The timetable, worked backwards.** Clarifications close 2026-09-05; drafting complete 2026-09-10; internal review 2026-09-11; signed 2026-09-12; uploaded 2026-09-14, a day before the deadline because the portal is not instant.\n\n**What is NOT required.** The ITT states that unsolicited alternative proposals will not be evaluated.");
  if (/THE DRAFTED RESPONSES/.test(task))
    return sec(4, "Drafted responses", "### SUB-1 · Method statement\n\n**What is being asked, and what it is worth.** Quality, 30%, six pages.\n\n**The draft answer.** We will deliver the compound in two sequenced phases...\n\n**Evidence attached.** Programme extract. **Word count.** 1,900 words against six pages.\n\n### SUB-2 · Priced schedule\n\n**What is being asked, and what it is worth.** Price, 40%.\n\n**The draft answer.** [TO BE COMPLETED IN THE CLIENT'S TEMPLATE] — the Employer's template has not been issued; raised as a clarification.\n\n### SUB-3 · Insurance certificates\n\n**What is being asked, and what it is worth.** Pass/fail gate.\n\n**The draft answer.** [EVIDENCE REQUIRED: a bound public liability certificate at £10m — currently £5m held, broker quotation received. Held by the Managing Director.]");
  if (/Write parts 5 and 6 of the bid file/.test(task))
    return [sec(5, "Clarification schedule", "| No | Question | Ties to | Tells competitors? |\n|---|---|---|---|\n| C-01 | Is the £10m public liability limit per claim or in aggregate? | RQ-3 / SUB-3 | No |\n| C-02 | Please issue the Employer's pricing template. | RQ-2 / SUB-2 | No |\n\nClarifications close on 2026-09-05 — four working days from today."), sec(6, "Bid position and risk", "**What this is.** Site establishment and welfare for a 60-week civils scheme. It is site services and contains no permanent-works design or commissioning.\n\n**Which delivery model fits.** Management Integrator.\n\n**The risks.** The £10m insurance limit is above what is currently bound. Payment terms are 60 days, which funds the supply chain from our own balance sheet for a month.\n\n**CDM 2015.** The invitation does not appoint ETABLIX as Principal Contractor and this bid does not accept that role.\n\n**Bid, no-bid, or bid with conditions.** BID WITH CONDITIONS: conditional on binding the insurance limit before submission.")].join("\n\n");
  if (/Write parts 7 and 8 of the bid file/.test(task))
    return [sec(7, "Responsibility matrix and bid programme", "| SUB | Deliverable | Drafts | Reviews | Signs | Finished by |\n|---|---|---|---|---|---|\n| SUB-1 | Method statement | Delivery Lead | MD | MD | 2026-09-10 |\n| SUB-2 | Priced schedule | Commercial Lead | MD | MD | 2026-09-10 |\n| SUB-3 | Insurance | MD | MD | MD | 2026-09-09 |\n\nThree dates cannot move: clarifications 2026-09-05, sign-off 2026-09-12, upload 2026-09-14."), sec(8, "Submission register and completeness certificate", "| SUB | Deliverable | Format | Status | Owner | File name |\n|---|---|---|---|---|---|\n| SUB-1 | Method statement | PDF | DRAFTED | Delivery Lead | ETABLIX-SUB-1-Method.pdf |\n| SUB-2 | Priced schedule | Template | DRAFT WITH EVIDENCE REQUIRED | Commercial Lead | ETABLIX-SUB-2-Prices.xlsx |\n| SUB-3 | Insurance | PDF | DRAFT WITH EVIDENCE REQUIRED | MD | ETABLIX-SUB-3-Insurance.pdf |\n\n**Open items that must close before submission.**\n\n| Item | Blocks | Who | By |\n|---|---|---|---|\n| Bind £10m public liability | SUB-3 | MD | 2026-09-09 |\n| Employer's pricing template | SUB-2 | Client, via C-02 | 2026-09-08 |\n\n**Completeness certificate.** This bid file is drafted from the invitation and adds no requirement to it. No accreditation or reference is claimed that is not evidenced. The bid owner approves and submits, not this agent.")].join("\n\n");
  if (/BID SUMMARY IN ONE PARAGRAPH/.test(task))
    return "## 0 · BID SUMMARY IN ONE PARAGRAPH\nA 60-week site establishment invited by ITT-2026-114 rev C, three mandatory requirements of which one is a gap — public liability at £10m against £5m bound — every required deliverable drafted, the timetable achievable with four working days to the clarification deadline, and the recommendation is to bid on condition that the insurance limit is bound before submission.\n\n## A · Traceability and open items\n| RQ | Source | Type | Answered by | Position |\n|---|---|---|---|---|\n| RQ-1 | ITT 4.2 | Mandatory | SUB-1 | COMPLY |\n| RQ-2 | ITT 5.1 | Mandatory | SUB-2 | COMPLY WITH COMMENT |\n| RQ-3 | ITT 6.4 | Mandatory | SUB-3 | GAP |";
  // AGENTS 10, 11 AND 12 BEFORE AGENT 9 AND THE DIAGNOSTIC, for the same
  // reason: every agent's passes say "Write deliverables 1, 2 and 3", so the
  // match has to be on wording unique to one product. Getting this wrong does
  // not fail loudly — the splitter takes sections by number, so another
  // agent's content lands in the right fields and the document looks correct.

  // Agent 13 — Tender pack assembler. Eight PARTS, five passes. Its passes
  // say "Write parts 1 and 2", not "Write deliverables 1, 2 and 3", so they
  // cannot collide with the four agents below — but it is matched first
  // anyway, because that collision is the one that does not fail loudly.
  //
  // The scope sheet and the pricing schedule below deliberately reconcile:
  // four scope items, four priced lines, matching references, real units.
  // The reconciler is what decides whether this pack may be issued, so a
  // mock that did not reconcile would make every test run report a failure.
  if (/PACK REGISTER/.test(task))
    return "## A · PACKAGE REGISTER\n| Code | Package | Boundary | Source |\n|---|---|---|---|\n| P01 | Compound civils | Top of formation, witnessed | SMR §1 |\n| P02 | Welfare and accommodation | Slab edge and level | SMR §1 |\n\n## B · SCOPE ITEM REGISTER\n| Ref | Item | Source | Unit | Quantity |\n|---|---|---|---|---|\n| SS-P01.1 | Strip and level the compound | SMR §4 | m2 | 4,200 |\n| SS-P01.2 | Lay Type 1 sub-base | SMR §4 | m3 | 630 |\n| SS-P02.1 | Provide welfare units | SMR §5 | nr | 14 |\n| SS-P02.2 | Maintain welfare units | SMR §6 | week | 96 |\n\n## E · WHAT THE PACK CANNOT CLOSE\n| Ref | Missing | Affects | Before issue |\n|---|---|---|---|\n| OI-01 | Return deadline time of day | Part 1 | Client to set |";
  if (/Instructions to tenderers/.test(task))
    return [sec(1, "Instructions to tenderers", "You are invited to tender for the site-services packages described in the scope sheets at Part 3.\n\n| Document | Part | Issued |\n|---|---|---|\n| Instructions to tenderers | 1 | For information |\n| Pricing schedule | 4 | For pricing |\n\nReturns are due by [DATE TO BE INSERTED BY THE CLIENT BEFORE ISSUE]. The evaluation criteria are fixed and will not change after returns are opened."), sec(2, "Conditions of tendering", "This invitation is not an offer and the client is not bound to accept any tender.\n\nETABLIX prepares and administers this pack for the client. ETABLIX does not award, does not place orders and does not commit the client to any tenderer; the award is made by a named person with delegated authority. Where the resulting contract contains construction operations the payment provisions comply with Part II of the Housing Grants, Construction and Regeneration Act 1996.")].join("\n\n");
  if (/SCOPE SHEETS BY PACKAGE/.test(task))
    return sec(3, "Scope sheets by package", "### Scope sheet — P01 · Compound civils\n\n**Boundary.** Starts at the existing verge line on drawing C-1042 rev C; stops at top of formation, witnessed jointly.\n\n| Ref | Item | Requirement source | Quantity | Basis of quantity |\n|---|---|---|---|---|\n| SS-P01.1 | Strip and level the compound | SMR §4 | 4,200 | Measured from C-1042 rev C |\n| SS-P01.2 | Lay Type 1 sub-base | SMR §4 | 630 | Derived at 150mm |\n\n**Attendances and interfaces.** P02 provides the cabin setting-out. **Acceptance.** Level survey signed by the client's engineer. **Exclusions.** Foul drainage, which sits in P03.\n\n### Scope sheet — P02 · Welfare and accommodation\n\n**Boundary.** Slab edge and level, witnessed.\n\n| Ref | Item | Requirement source | Quantity | Basis of quantity |\n|---|---|---|---|---|\n| SS-P02.1 | Provide welfare units | SMR §5 | 14 | Sized on peak headcount |\n| SS-P02.2 | Maintain welfare units | SMR §6 | 96 | Programme duration |");
  if (/PRICING SCHEDULE, BLANK AND PRICEABLE/.test(task))
    return sec(4, "Pricing schedule", "### P01 · Compound civils\n\n| Ref | Scope ref | Description | Unit | Quantity | Rate | Amount |\n|---|---|---|---|---|---|---|\n| 1 | SS-P01.1 | Strip and level the compound | m2 | 4,200 | | |\n| 2 | SS-P01.2 | Lay Type 1 sub-base | m3 | 630 | | |\n\n### P02 · Welfare and accommodation\n\n| Ref | Scope ref | Description | Unit | Quantity | Rate | Amount |\n|---|---|---|---|---|---|---|\n| 1 | SS-P02.1 | Provide welfare units | nr | 14 | | |\n| 2 | SS-P02.2 | Maintain welfare units | week | 96 | | |\n\n**Pricing rules.** Every line is priced or marked INCLUDED IN LINE <ref>. A blank line will be treated as included at no cost. Currency is pounds sterling.");
  if (/Technical submission requirements/.test(task))
    return [sec(5, "Technical submission requirements and return form", "**Q1 — Method (criterion: Quality, 30%).** How will you deliver SS-P01.1 and SS-P01.2? Four pages maximum. Provide a method statement.\n\n*Descriptor — a good answer names the plant, the sequence and the level tolerance.*"), sec(6, "Commercial submission requirements and return form", "Return the completed pricing schedule at Part 4. An exclusion not declared here and not declared on the form of tender at Part 7 will be treated as not made.")].join("\n\n");
  if (/Form of tender, certificates and declarations/.test(task))
    return [sec(7, "Form of tender, certificates and declarations", "Tenderer's legal name: ____________________\n\nTender sum in figures: £__________ In words: ____________________\n\nWe certify that this tender has not been arrived at by collusion. We acknowledge that the client is not bound to accept the lowest or any tender.\n\nSigned: __________ Position: __________ Date: __________"), sec(8, "Issue register and issue certificate", "| Document | Part | Rev | Author | Status | Issued |\n|---|---|---|---|---|---|\n| Instructions to tenderers | 1 | A | ETABLIX | Issue | For information |\n| Pricing schedule | 4 | A | ETABLIX | Issue | For pricing |\n\n**Open items that must close before issue.**\n\n| Item | Part | Why | Who | By |\n|---|---|---|---|---|\n| OI-01 return time of day | 1 | A deadline without a time is not a deadline | Client | Before issue |\n\n**Issue certificate.** This pack is assembled from the approved Site Management Requirements Package and adds no requirement to it. The client issues this pack; ETABLIX does not.")].join("\n\n");
  if (/ISSUE SUMMARY IN ONE PARAGRAPH/.test(task))
    return "## 0 · ISSUE SUMMARY IN ONE PARAGRAPH\nTwo packages and four scope items go to market, every one of them priced; the return deadline still carries no time of day and must be set before issue.\n\n## A · Traceability and open items\n| SS ref | Source | Priced at | Mandate or proposal |\n|---|---|---|---|\n| SS-P01.1 | SMR §4 | P01 line 1 | Client mandate |";

  // Agent 10 — Mobilisation-readiness review. Eight sections, three passes.
  if (/READINESS EVIDENCE REGISTER/.test(task))
    return "## A · READINESS EVIDENCE REGISTER\n| Ref | Item | Position | Evidence class |\n|---|---|---|---|\n| RE-01 | S278 bellmouth | Not applied for | EVIDENCED — 07 §2 |\n| RE-02 | Welfare cabins | \"On order\" | ASSERTED — site manager |";
  if (/Readiness by service, at today's date/.test(task))
    return [sec(1, "Readiness by service, at today's date", "READY / AT RISK / NOT READY.\n| Ref | Service | Evidence | Rating |\n|---|---|---|---|\n| RE-01 | Access | EVIDENCED | NOT READY |"), sec(2, "What will stop mobilisation", "| Blocker | Date it bites | Recoverable? |\n|---|---|---|\n| S278 | 2027-04-06 | No |"), sec(3, "Consents, conditions and connections", "Pre-commencement conditions are a prohibition on starting, not a risk to the programme.")].join("\n\n");
  if (/Site and layout readiness/.test(task))
    return [sec(4, "Site and layout readiness", "Standing water observed in the north-east corner."), sec(5, "Supplier and appointment readiness", "| Package | Appointed? | Latest responsible instruction |\n|---|---|---|\n| TW01 | No | PASSED |"), sec(6, "Welfare and workforce readiness at day one", "Schedule 2 sets no numeric ratios; sized on day-one headcount, not peak.")].join("\n\n");
  if (/Recovery actions in the time remaining/.test(task))
    return [sec(7, "Recovery actions in the time remaining", "| Action | Owner | Must START |\n|---|---|---|\n| Commission highway design | Design Management | This week |"), sec(8, "The date verdict", "**NOT DELIVERABLE.** The earliest achievable date is 2027-05-20, set by the S278 chain.")].join("\n\n");
  if (/VERDICT IN ONE PARAGRAPH/.test(task))
    return "## 0 · VERDICT IN ONE PARAGRAPH\nThe date does not hold; the S278 chain sets an earliest date of 2027-05-20 and two readiness items rest on assertion.\n\n## A · Evidence and assertion ledger\n| Statement | Class | Source |\n|---|---|---|\n| Cabins on order | ASSERTED | Site manager |";

  // Agent 11 — Workforce Village Requirements. Twelve sections, four passes.
  if (/DEMAND MODEL/.test(task) && /bed demand/i.test(task))
    return "## A · DEMAND MODEL\n| Period | Headcount | Travelling % | Beds | Bed-nights |\n|---|---|---|---|---|\n| 2028 Q3 | 340 | 62% | 211 | 13,715 |\n\n## E · STANDARDS THE CLIENT HAS NOT STATED\n| Ref | Needs a standard | Proposed |\n|---|---|---|\n| VG-01 | Acoustic separation between rooms | BS 8233 |";
  if (/Bed demand and occupancy model/.test(task))
    return [sec(1, "Bed demand and occupancy model", "211 beds at peak; 87,800 bed-nights on a five-night basis, 122,900 on seven."), sec(2, "Village site appraisal and capacity", "| Constraint | Value | Limits |\n|---|---|---|\n| Developable area | 2.1 ha | 240 beds |"), sec(3, "Accommodation standard and unit schedule", "Room 11 m², single occupancy, en-suite. **[PROPOSED — client approval required]**")].join("\n\n");
  if (/Village layout and zoning requirements/.test(task))
    return [sec(4, "Village layout and zoning requirements", "Sleeping zoned away from plant and parking."), sec(5, "Utilities, foul and waste requirements", "Water at 130 l/bed/day = 27.4 m³/day."), sec(6, "Fire strategy and life-safety requirements", "A fire strategy must exist. **[SAFETY-CRITICAL — for determination by a competent person and the fire authority]** No travel distance, compartment size, alarm category or escape width is proposed here.")].join("\n\n");
  if (/Catering, welfare and amenity requirements/.test(task))
    return [sec(7, "Catering, welfare and amenity requirements", "Covers sized on sittings within the shift pattern, not on bed count."), sec(8, "Village operation and management requirements", "| Service | Standard | Measured | Consequence |\n|---|---|---|---|\n| Cleaning | Daily | Inspection | Deduction |"), sec(9, "Transport and access requirements", "Fatigue management is **[SAFETY-CRITICAL — for determination by a competent person]**.")].join("\n\n");
  if (/Consents, licensing and statutory requirements/.test(task))
    return [sec(10, "Consents, licensing and statutory requirements", "| Consent | Determination | Latest responsible application |\n|---|---|---|\n| Planning | Not stated | Cannot be computed |"), sec(11, "Deployment, duration and exit requirements", "The exit is separately priced; assumed inside a hire contract it is an unquantified liability."), sec(12, "Procurement and contracting strategy for the village", "Hire versus capital, and the test between them.")].join("\n\n");

  // Agent 12 — Tender evaluation. Eight sections, three passes.
  if (/NORMALISATION REGISTER/.test(task))
    return "## B · NORMALISATION REGISTER\n| Item | Tenderer A | Tenderer B | Adjustment |\n|---|---|---|---|\n| Fuel | Included | Excluded | +£410,000 to B, from their own rate |";
  if (/Package and process record/.test(task))
    return [sec(1, "Package and process record", "The evaluation model was fixed before returns were opened."), sec(2, "Returns received and admissibility", "Figures AS RETURNED — **not comparable**, see section 4."), sec(3, "Requirement-by-requirement compliance", "| Requirement | A | B | Treatment |\n|---|---|---|---|\n| Rev C load | COMPLIANT | NON-COMPLIANT | Clarify, both |")].join("\n\n");
  if (/Commercial comparison, normalised/.test(task))
    return [sec(4, "Commercial comparison, normalised", "| Step | A | B |\n|---|---|---|\n| As returned | £3.1m | £2.7m |\n| Fuel adjustment | — | +£0.41m |\n| Normalised | £3.1m | £3.11m |"), sec(5, "Qualifications, exclusions and assumptions", "Accepting B as written costs £410,000 beyond its price."), sec(6, "Risk in each return", "B has assumed a lead time nobody can achieve.")].join("\n\n");
  if (/Evaluation against the model/.test(task))
    return [sec(7, "Evaluation against the model", "| Criterion | Weight | A | B |\n|---|---|---|---|\n| Price | 40% | 38 | 38 |"), sec(8, "Recommendation and its conditions", "Recommend A, on conditions. ETABLIX does not award or place orders.")].join("\n\n");
  if (/RECOMMENDATION IN ONE PARAGRAPH/.test(task))
    return "## 0 · RECOMMENDATION IN ONE PARAGRAPH\nTenderer A on a normalised £3.1m, ahead of B by £10,000 once fuel is levelled — provisional until one open item closes.\n\n## A · Audit trail and open items\n| Decision | Basis | Applied to |\n|---|---|---|\n| Fuel adjustment | B's own rate | Both tenderers |";

  // AGENT 9 FIRST, and the order is the point. Both agents' passes say
  // "Write deliverables 1, 2 and 3", so matching the diagnostic's generic
  // phrase first returned the DIAGNOSTIC's sections for Agent 9's passes —
  // and because the output splitter takes sections by number rather than by
  // title, the wrong content landed in the right fields and looked fine.
  // Agent 9 — Site Management Requirements Package. Its passes ask for
  // deliverables 1-3, 4-6, 7-9 and 10-12 like the diagnostic's, so they are
  // matched on the words that are specific to it.
  if (/REQUIREMENT SOURCE REGISTER/.test(task))
    return "## A · REQUIREMENT SOURCE REGISTER\n| Ref | Requirement | Source | Mandatory? | Verifiable? |\n|---|---|---|---|---|\n| RS-01 | Welfare for 340 | Cabin schedule rev C | Mandatory | Yes |\n\n## C · STANDARDS THE CLIENT HAS NOT STATED\n| Ref | Needs a standard | Why | Proposed |\n|---|---|---|---|\n| RG-01 | Cleaning frequency | Cannot be priced | Twice per shift |";
  if (/Package structure and scope boundaries/.test(task))
    return [sec(1, "Package structure and scope boundaries", "| Ref | Package | Boundary |\n|---|---|---|\n| P01 | Compound civils | Top of formation, witnessed |"), sec(2, "Employer's Requirements by package", "The Contractor shall provide 22 WCs. **[PROPOSED — client approval required]**"), sec(3, "Interface and responsibility matrix", "| Ref | Between | Physical point | Who signs |\n|---|---|---|---|\n| IF-01 | Civils / cabins | Slab edge and level | TWC |")].join("\n\n");
  if (/Technical requirements/.test(task))
    return [sec(4, "Technical requirements", "### Power\n| Load | kW | Diversity | Demand |\n|---|---|---|---|\n| Cabins | 203 | 0.7 | 142 |"), sec(5, "Welfare, accommodation and workforce requirements", "Schedule 2 sets no numeric ratios; 1 WC per 15.5 applied."), sec(6, "Performance and service-level requirements", "| Service | Standard | Measured | Frequency | Consequence |\n|---|---|---|---|---|\n| Welfare cleaning | Twice per shift | Inspection | Weekly | Deduction |")].join("\n\n");
  if (/HSEQ, CDM and statutory requirements/.test(task))
    return [sec(7, "HSEQ, CDM and statutory requirements", "Nothing here appoints ETABLIX as Principal Contractor."), sec(8, "Programme, access and phasing requirements", "| Requirement | Date | Lead time | Latest responsible start |\n|---|---|---|---|\n| S278 | 2027-04-06 | 22 weeks | PASSED |"), sec(9, "Commercial requirements", "Payment provisions to comply with Part II of the 1996 Act.")].join("\n\n");
  if (/Evaluation model/.test(task))
    return [sec(10, "Evaluation model", "| Criterion | Weighting | Evidence |\n|---|---|---|\n| Price | 40% | Pricing schedule |"), sec(11, "Contract strategy and terms schedule", "| Risk | Carried by | Why |\n|---|---|---|\n| Ground | Client | No GI exists |"), sec(12, "Tender document register and issue plan", "| Document | Rev | Status | For |\n|---|---|---|---|\n| Requirements | A | Issue | Pricing |")].join("\n\n");
  // AGENT 11's FINAL, BEFORE AGENT 9's, and this is the collision the mock's
  // own notes warn about — found by backend/test/mock.test.mjs rather than by
  // anybody reading it.
  //
  // Both agents produce a requirements package, so both head their final
  // section "REQUIREMENTS SUMMARY IN ONE PARAGRAPH". Both headings are
  // correct for their product. The mock matched that phrase once, so since
  // Agent 11 was built its final pass has been served AGENT 9's content —
  // twelve packages and an S278 access date, in a workforce village report —
  // and the tests passed, because a final pass is checked for having section
  // 0 and an appendix rather than for what is in them.
  //
  // So the match is on the words that differ, not on the heading they share.
  if (/peak bed requirement and the total bed-nights/.test(task))
    return "## 0 · REQUIREMENTS SUMMARY IN ONE PARAGRAPH\n211 beds at peak and 87,800 bed-nights on a five-night basis; the site takes 240 beds, so capacity holds, but the fire strategy and the planning determination are both unresolved and the second sets the earliest occupation date.\n\n## A · Requirement traceability and open items\n| Requirement | Source ref | Client mandate or proposal |\n|---|---|---|\n| VG-01 | Acoustic separation, BS 8233 | ETABLIX proposal |\n| VG-02 | Fire strategy | SAFETY-CRITICAL — competent person and fire authority |";

  if (/REQUIREMENTS SUMMARY IN ONE PARAGRAPH/.test(task))
    return "## 0 · REQUIREMENTS SUMMARY IN ONE PARAGRAPH\nTwelve packages, and the S278 access date has already passed its latest responsible start.\n\n## A · Requirement traceability and open items\n| Requirement | Source ref | Client mandate or proposal |\n|---|---|---|\n| R-01 | RS-01 | Client mandate |";


  if (/working paper/.test(task))
    return "## FACTS\n| ID | Fact | Value | Source |\n|---|---|---|---|\n| F01 | Site access date | 1 March 2027 | Input 1, milestones |\n\n## CONTRADICTIONS\n| ID | A | B | Why both cannot hold |\n|---|---|---|---|\n| C01 | Two-shift from Jan 2028 (Input 1) | Condition 14 prohibits it (Input 7) | One of them is wrong |";
  if (/deliverables 1, 2 and 3/.test(task))
    return [sec(1, "Site-service package map", "| Ref | Package | Source |\n|---|---|---|\n| P01 | Enabling civils | Input 6 |"), sec(2, "Scope-gap assessment", "Ten gaps, ranked."), sec(3, "Supplier-interface matrix", "| Ref | Between | Fails how |\n|---|---|---|\n| IF-01 | P02 ↔ P04 | Generator sized to a superseded schedule |")].join("\n\n");
  if (/deliverables 4, 5 and 6/.test(task))
    return [sec(4, "Workforce-demand profile", "Peak 280 at shift overlap, 14 March."), sec(5, "Temporary-utility demand assessment", "### Power — indicative\n| Load | kVA | Diversity | Demand |\n|---|---|---|---|\n| Cabins | 180 | 0.8 | 144 |"), sec(6, "Welfare and accommodation requirements", "CDM 2015 Schedule 2 ratios applied to peak.")].join("\n\n");
  if (/deliverables 7, 8 and 9/.test(task))
    return [sec(7, "Mobilisation constraints", "| Consent | Lead time | Latest start | Applied? |\n|---|---|---|---|\n| Section 278 | 20 weeks | 12 Oct 2026 | No |"), sec(8, "Procurement strategy", "Five bundles."), sec(9, "Preliminary risk register", "| Risk | P | I | Score |\n|---|---|---|---|\n| Access lost | 4 | 5 | 20 |")].join("\n\n");
  if (/deliverables 10, 11 and 12/.test(task))
    return [sec(10, "Indicative cost structure", "£6.6m – £11.9m across five bundles."), sec(11, "Recommended delivery model", "**Model 02 — Management Integrator.**\n\n## Why Model 02\nNobody owns the space between packages."), sec(12, "30/60/90-day mobilisation actions", "### First 30 days\n1. Submit the Section 278 application. **Client, with ETABLIX support.**")].join("\n\n");
  return "## 0 · FINDINGS IN ONE PARAGRAPH\nThe access date is undeliverable because three consents that must precede it have not been applied for.\n\n## A · Document reconciliation ledger\n| Statement A | Source | Statement B | Source |\n|---|---|---|---|\n| Two-shift from Jan 2028 | Input 1 | Condition 14 prohibits it | Input 7 |";
}

const server = http.createServer((req, res) => {
  let b = "";
  req.on("data", (c) => (b += c));
  req.on("end", async () => {
    let j; try { j = JSON.parse(b || "{}"); } catch { j = {}; }
    if (!Array.isArray(j.messages)) { res.writeHead(400, {"Content-Type":"application/json"}); return res.end(JSON.stringify({type:"error",error:{type:"invalid_request_error",message:"no messages"}})); }
    const task = j.messages?.[0]?.content?.at(-1)?.text || j.messages?.[0]?.content || "";
    // The prompt itself is recorded, because "did the layout drawing
    // reach the model, and under which heading" is not answerable from a
    // character count.
    const promptText = (j.messages || [])
      .flatMap((m) => (Array.isArray(m.content) ? m.content : [{ type: "text", text: String(m.content || "") }]))
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    log.push({ max: j.max_tokens, thinking: j.thinking?.budget_tokens || 0, stream: !!j.stream,
      effort: j.output_config?.effort || null, adaptive: j.thinking?.type === "adaptive",
      cacheBreakpoints: JSON.stringify(j).split('"ephemeral"').length - 1, promptChars: JSON.stringify(j.messages || []).length,
      promptText });
    fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 1));
    await new Promise((r) => setTimeout(r, DELAY));

    // Injected failures, so the retry ceiling and the degradation ladder
    // are tested against what the API actually returns rather than
    // against what the client hopes it returns.
    if (FAIL === "overload") {
      res.writeHead(529, { "content-type": "application/json" });
      return res.end(JSON.stringify({ type: "error", error: { type: "overloaded_error", message: "Overloaded" } }));
    }
    if (FAIL === "400") {
      res.writeHead(400, { "content-type": "application/json" });
      return res.end(JSON.stringify({ type: "error", error: { type: "invalid_request_error", message: "max_tokens: 128000 > 64000, which is the maximum allowed" } }));
    }
    if (FAIL === "timeout") return;  // hold the socket open and say nothing

    // Truncation, on demand. A real pass that runs out of output room
    // comes back with stop_reason "max_tokens" and a body that stops
    // wherever it stopped — often mid-word. That is what has to be
    // continued, and it cannot be tested without being able to cause it.
    //
    //   MOCK_TRUNCATE=1        every fresh pass truncates once; a
    //                          continuation completes
    //   MOCK_TRUNCATE=always   every call truncates, so the ceiling and
    //                          the INCOMPLETE note are exercised
    //
    // The markers are deliberate: the head ends in SPLIT-HEAD with no
    // trailing space and the tail begins with SPLIT-TAIL, so a test can
    // assert the two were joined with nothing between them. Anything
    // that inserts a newline breaks a table row in the real report.
    const continuing = /YOU HAVE ALREADY WRITTEN PART OF THIS/.test(promptText);
    // MOCK_TRUNCATE=ledger truncates ONLY the working paper, for ever, and
    // lets every pass that reaches the client's report finish. That is what
    // a real client pack did: five passes complete, the reconciliation
    // ledger still going after four attempts.
    const ledgerOnly = TRUNCATE === "ledger";
    const isLedger = /working paper|WORKING PAPER/.test(String(task));
    let text = answer(String(task));
    let stopReason = "end_turn";
    if (ledgerOnly) {
      if (isLedger) { text = text.slice(0, Math.floor(text.length * 0.6)) + "SPLIT-HEAD"; stopReason = "max_tokens"; }
    } else if (TRUNCATE && (!continuing || TRUNCATE === "always")) {
      text = text.slice(0, Math.floor(text.length * 0.6)) + "SPLIT-HEAD";
      stopReason = "max_tokens";
    } else if (TRUNCATE && continuing) {
      text = "SPLIT-TAIL" + text.slice(Math.floor(text.length * 0.6));
    }
    const usage = { input_tokens: 12000, output_tokens: 3000, cache_read_input_tokens: 9000, cache_creation_input_tokens: 3000 };

    if (!j.stream) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ id: "msg_mock", type: "message", role: "assistant", model: "claude-opus-5-mock",
        content: [{ type: "text", text }], stop_reason: stopReason, stop_sequence: null, usage }));
      return;
    }

    res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
    const ev = (type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
    ev("message_start", { message: { id: "msg_mock", type: "message", role: "assistant", model: "claude-opus-5-mock",
      content: [], stop_reason: null, stop_sequence: null, usage: { ...usage, output_tokens: 0 } } });
    ev("content_block_start", { index: 0, content_block: { type: "text", text: "" } });
    for (let i = 0; i < text.length; i += 400) {
      ev("content_block_delta", { index: 0, delta: { type: "text_delta", text: text.slice(i, i + 400) } });
    }
    ev("content_block_stop", { index: 0 });
    ev("message_delta", { delta: { stop_reason: stopReason, stop_sequence: null }, usage: { output_tokens: usage.output_tokens } });
    ev("message_stop", {});
    res.end();
  });
});

/**
 * The listener starts only when this file IS the command being run.
 *
 * backend/test/mock.test.mjs imports answer() to drive the reply chain
 * directly — which is the only way to prove that each agent's pass reaches
 * the reply written for it, rather than reading the chain and hoping. An
 * import that also bound a port would make that test fight whatever else is
 * using 4199.
 */
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  server.listen(PORT, () => console.log(`mock anthropic (SSE) on ${PORT}` + (FAIL ? ` — failing every call: ${FAIL}` : "")));
}
