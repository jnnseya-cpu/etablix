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
