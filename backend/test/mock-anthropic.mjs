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

function answer(task) {
  if (/Reply with exactly/.test(task)) return "ETABLIX AI online";
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

http.createServer((req, res) => {
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
}).listen(PORT, () => console.log(`mock anthropic (SSE) on ${PORT}` + (FAIL ? ` — failing every call: ${FAIL}` : "")));
