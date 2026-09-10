/**
 * The Site Systems Diagnostic pipeline.
 *
 * Agent 8 used to be one call: eight documents in, twelve deliverables
 * out, sixteen thousand tokens for the lot. A model given that budget
 * does the sensible thing and writes one competent paragraph per
 * deliverable — which is exactly the generic report a client can get
 * anywhere, and the reason a diagnostic either justifies its fee in the
 * first two pages or never does.
 *
 * So the work is split the way a person would split it. First a
 * reconciliation pass that does nothing but read the eight documents
 * against each other and write down what it finds — contradictions with
 * both sources named, every date worked backwards, every package nobody
 * owns, every number that appears twice with two different values. That
 * working paper is the spine. Then four passes that write the twelve
 * deliverables three at a time, each one holding the ledger and every
 * section written before it, so section 8 bundles the packages section 1
 * found and section 12 acts on what section 7 dated. Then the findings
 * paragraph, written last, because the most consequential thing you
 * found is not knowable until you have finished looking.
 *
 * Every pass carries the same standard, and the standard is what keeps
 * the output specific: cite the document behind every claim, quantify
 * every consequence, show the arithmetic behind every number, name what
 * would change the answer, and delete anything a competent stranger
 * could have written without reading these particular documents.
 *
 * The passes are visible while they run and each one is WRITTEN TO THE RUN
 * ROW as it lands, so a run that fails at pass four is still four passes of
 * work that can be resumed rather than repeated
 * rather than nothing.
 */

/**
 * The standard, stated to every pass.
 *
 * These are tests a sentence either passes or fails, not
 * encouragement. Vague instruction produces vague output; the point of
 * each rule is that a generic sentence visibly breaks it.
 */
const STANDARD = `THE STANDARD THIS REPORT IS HELD TO

This report is the only evidence of what ETABLIX is worth. A client who
paid for it and received something a competent stranger could have
written without reading their documents will not come back, and should
not. Depth here means findings the client's own team missed, not length.

Apply these tests to every sentence and every table row before it leaves
you:

1. SOURCE. Every factual statement names where it came from — which
   input, and where in it. A statement you cannot source is one you
   invented: delete it. Where a finding comes from two documents
   disagreeing, cite both.
2. SPECIFICITY. A statement that would still be true on a different
   project is not a finding, it is a textbook line. "Welfare must be
   sized to peak headcount" is worthless. "90 parking spaces against 280
   people at shift overlap from 14 March" is the product.
3. CONSEQUENCE. Every gap, risk and interface states its consequence in
   days, pounds, cubic metres, kVA, beds, people, or a named consent.
   Adjectives are not consequences. "Significant risk to the programme"
   says nothing. "Nine months of erection at risk" says everything.
4. WORKING SHOWN. Every number the client might act on shows how it was
   built — load by load, person by person, week by week — so their
   engineer can check it rather than take it on trust. A number without
   its derivation is not decision support.
5. WHAT WOULD CHANGE IT. On every material finding, name the one
   decision or piece of information that would change the answer, and
   say what it would change it to.
6. HONESTY. Where the inputs do not support a conclusion, say what is
   missing, what it prevents, and what can still be said without it.
   Never fill a gap with a plausible assumption. A shorter honest
   section beats a longer invented one every time.

Then delete anything that survives none of these tests. If a section
loses most of its content, that is the correct outcome: say what the
inputs did not let you determine and why it matters.

Forbidden, because each is a way of writing at length while saying
nothing: restating an input back to the client as though it were a
finding; "it is recommended that a review be undertaken"; "careful
consideration should be given to"; "industry best practice suggests";
any risk whose mitigation is "monitor"; any action without a named
owner and a date; any range whose width is not explained by a named
unresolved decision.

Write in plain professional English. Markdown tables for anything with
more than two columns. No preamble, no summary of what you are about to
do, no closing pleasantries — start at the first heading and stop at
the last.`;

/**
 * Pass 1. No client prose — a working paper.
 *
 * Most of what a diagnostic is worth lives between two documents that
 * nobody has read side by side. Finding that is a different activity
 * from writing a report about it, and doing both at once produces
 * neither, so this pass does only the first.
 */
const RECONCILE_TASK = `Do not write any part of the report yet.

Your task in this pass is to read the client's documents AGAINST EACH
OTHER and write the working paper the report will be built from. Most of
what this engagement is worth lives in the gaps between two documents
written by different people at different times who have not compared
them. Find those gaps systematically, not impressionistically: take each
document and test it against every other one.

The pairs that hide the most, from experience:
  - programme dates against consent and utility lead times
  - shift patterns and working hours against planning conditions
  - headcount curves against welfare, parking, beds and transport
  - equipment enquiries against the schedules they were sized from
  - the scope-of-works list against the procurement package list
  - stated assumptions against facts stated elsewhere as settled
  - anything quoted in two documents with two different values

Produce exactly these tables, and nothing else.

## FACTS
Every material fact the report will rest on.
| ID | Fact | Value | Source (document and where in it) |
Use F01, F02… Quote the document's own wording where the wording matters.

## CONTRADICTIONS
The most valuable table in this engagement. Anything that cannot be true twice.
| ID | Statement A + source | Statement B + source | Why both cannot hold | Consequence if unresolved (days, £, consent) | What resolves it, and who must decide |
Use C01, C02… If two documents were written weeks apart by different
people, say so — the gap between them is usually where the money is.

## DATES WORKED BACKWARDS
Every consent, connection, licence, approval, order and lead-time item that
must precede a fixed date.
| ID | What must happen | Fixed date it must precede | Lead time + source | Latest responsible start | Already late? | Applied for? + source |
Use D01, D02… Compute the latest responsible start; do not estimate it in
words. Where a lead time is not in the inputs, say so and say what that
prevents rather than inventing one.

## PACKAGES AND OWNERSHIP
Every package this site needs, whether or not the client has named it.
| ID | Package | Named in the client's own list? + source | Who owns it today | Evidence of ownership |
Use P01, P02… Mark unowned packages plainly. An unowned package is a cost
and a lead time nobody is currently holding.

## NUMBERS THAT DISAGREE
Any quantity appearing in more than one document.
| Quantity | Value + source | Other value + source | Reconcilable? | Consequence of using the wrong one |

## WHAT THE INPUTS DO NOT SAY
| Missing information | Which deliverable needs it | What can still be said without it | What cannot be said |

## THE THREE THINGS THAT MATTER MOST
Three findings, ranked. For each: one sentence of what it is, one of what
it costs if unresolved, one of what resolves it. These become the spine of
the report.`;

/**
 * Passes 2–5. Three deliverables each, in the promised order, each pass
 * holding the ledger and everything written before it.
 */
const SECTION_PASSES = [
  {
    key: "s1_3",
    label: "Packages, gaps and interfaces",
    range: [1, 3],
    task: `Write deliverables 1, 2 and 3. Depth required:

## 1 · Site-service package map
Every package the temporary site environment needs — typically 15 to 25 on
a project of this kind — whether or not the client has named it. Table:
reference, package, scope boundary in one line, status in the client's own
procurement list, source. Follow the table with a sentence naming the
packages nobody owns and what that means: each is a cost and a lead time
currently held by no one. Give the count.

## 2 · Scope-gap assessment
Every gap, RANKED BY PROGRAMME IMPACT. Table: reference, the gap, its
consequence stated in days, money or a named consent, severity, and which
document pair reveals it. A gap whose consequence you can only describe in
adjectives is not yet understood — work it out or say what you would need.

## 3 · Supplier-interface matrix
Numbered IF-xx rows. Table: reference, the two packages either side, what
the interface physically is, what fails if nobody owns it — concretely, as
an event on a date, not as a category of risk — and the proposed owner.
This is the core of the ETABLIX thesis: projects fail at the unowned
interfaces between packages, not inside them. Cover every interface you
can evidence; twenty specific rows beat eight general ones.`,
  },
  {
    key: "s4_6",
    label: "The demand model",
    range: [4, 6],
    task: `Write deliverables 4, 5 and 6. This is the quantitative pass —
every figure shows its derivation so the client's engineer can check it.

## 4 · Workforce-demand profile
By period across the programme: average headcount, peak, beds required,
parking demand, transport movements. Show the curve as a table by month or
quarter, not as a sentence. State the assumption behind the beds figure —
travelling percentage, local labour availability — and flag it explicitly
if the client has not evidenced it. Identify the peak overlap moment and
date it.

## 5 · Temporary-utility demand assessment
Power built up LOAD BY LOAD with diversity factors shown, arriving at a
figure the client can put in a DNO application: a table of each load, its
connected kVA, its diversity factor and its diversified demand, then the
total. Then water and foul in m³/day, derived from headcount and usage
rates with the rates stated. Where a client decision changes the answer
materially — on-site versus off-site accommodation, generation versus grid
— give BOTH cases as separate figures and name the decision that picks
between them. Every table carries the note that these are first-pass
planning figures for validation by a competent person.

## 6 · Welfare and accommodation requirements
Sized to peak against Schedule 2 of the Construction (Design and
Management) Regulations 2015, with the ratios stated and then applied:
WCs, washbasins, drying capacity, canteen seating, lockers, rest space.
Show ratio, peak number, resulting requirement. Then accommodation
options priced comparatively where the local market is a constraint,
with the basis of each price named.`,
  },
  {
    key: "s7_9",
    label: "Constraints, procurement and risk",
    range: [7, 9],
    task: `Write deliverables 7, 8 and 9.

## 7 · Mobilisation constraints
THIS IS WHERE THE REPORT EARNS ITS FEE. The consent chain worked
BACKWARDS from the access or possession date. Table: consent or approval,
lead time with its source, latest responsible start date, whether it has
been applied for, and whether it is already late. Compute every date; do
not describe it in words. Follow the table with the single sentence that
states how much time remains before the fixed date becomes undeliverable,
and what would have to happen this month to save it. Then the physical
constraints — access, ground, easements, abnormal loads, neighbours —
each with the operation it constrains.

## 8 · Procurement strategy
Bundle the packages so that the interfaces from deliverable 3 are BOUGHT
rather than left between two contracts. For each bundle: what is in it,
which interfaces it internalises, why it holds together commercially, and
what it would cost to get wrong. Then the immediate procurement actions,
including anything already in the market that should be STOPPED — an
enquiry sized against a superseded document is worse than no enquiry, and
saying so is part of the value here.

## 9 · Preliminary risk register
Probability × impact = score, with mitigation and a named owner. Score
consistently with the ETABLIX register: 16 and above is immediate
management attention. Every risk traces to something in the inputs — a
risk you cannot source is a generic risk and does not belong here. No
mitigation may be "monitor": say what is done, by whom, by when.`,
  },
  {
    key: "s10_12",
    label: "Cost, model and the first ninety days",
    range: [10, 12],
    task: `Write deliverables 10, 11 and 12.

## 10 · Indicative cost structure
Order-of-magnitude ranges per bundle, in a table with the basis of each
range stated. Say plainly and prominently that these are not a price, not
a budget and not a quotation. Then identify WHICH UNRESOLVED DECISIONS
DRIVE THE SPREAD and quantify how much range each one moves — that
attribution is the point of the section: it tells the client which
decisions are worth making first and what they are worth.

## 11 · Recommended delivery model
One of: Model 01 Advisory, Model 02 Management Integrator, Model 03 Prime
Service Contractor. Argue why the other two are wrong for this client at
this moment, specifically, on the evidence in these documents. Include any
reason Model 03 would be wrong for ETABLIX to accept — a recommendation
that never declines work is a sales document, not advice. Say what would
have to be true for the recommendation to change, and name the natural
second-stage conversation.

## 12 · 30/60/90-day mobilisation actions
Numbered actions in three blocks, each with a NAMED OWNER (the client,
ETABLIX, a named third party) and ordered so the first action is the one
on the critical path THIS WEEK. Every action traces back to a finding in
an earlier section. An action without an owner and a date is not an
action.`,
  },
];

/**
 * Pass 6. The findings paragraph is written last on purpose: the most
 * consequential thing you found is not knowable until you have finished
 * looking, and a paragraph written first becomes a thesis the rest of
 * the report is bent to support.
 */
const FINAL_TASK = `Everything is written. Two things remain.

## 0 · FINDINGS IN ONE PARAGRAPH
One paragraph. The single most consequential thing you found, stated in
the first sentence — if a fixed date is undeliverable, or a consent is
missing, or a condition prohibits the programme, that is the first
sentence and nothing else competes with it. Then the next most
consequential findings, in order, with their numbers. No throat-clearing,
no scene-setting, no "this report examines". A reader who reads only this
paragraph should know what they have to do and roughly what it costs them
not to. Write it from what the report actually found, not from what you
expected to find.

## A · Document reconciliation ledger
An appendix the client keeps: which of their own documents disagree with
which. A table of every contradiction found, with statement A and its
source, statement B and its source, what it means, and what resolves it.
Then a short table of the information that was not provided and what it
prevented. This is the part the client's team cannot produce for
themselves, because nobody inside a project reads all eight documents
side by side. Do not soften it and do not editorialise: set out what the
documents say.`;

/** The passes in order, for progress reporting and resumability. */
/**
 * A deliverable is a SPEC, not code.
 *
 * Everything above — the working-paper task, the section passes, the final
 * pass — describes one product: the Site Systems Diagnostic. The engine below
 * it describes none: reading a client's documents against each other,
 * continuing a pass that runs out of room, resuming an interrupted run,
 * caching the pack across six calls, keeping the money and the notes straight.
 *
 * That engine took months of defects to get right, and ETABLIX sells five
 * Model A deliverables. Four of them had no production at all — an intake
 * checklist, a price, and somebody writing forty pages by hand. So the engine
 * takes a spec now, and a new deliverable is a description of what it must
 * contain rather than a second copy of the machinery.
 *
 * A spec is: the working-paper task, the passes that write the report, the
 * final reconciliation pass, and which of those reach the client's document.
 */
export function pipelineSpec({ id, reconcileTask, sectionPasses, finalTask, finalLabel = "Findings and reconciliation ledger" }) {
  return {
    id,
    reconcileTask,
    sectionPasses,
    finalTask,
    stages: [
      { key: "reconcile", label: "Reading the documents against each other" },
      ...sectionPasses.map((p) => ({ key: p.key, label: p.label })),
      { key: "final", label: finalLabel },
    ],
    // Which passes end up in the document the client reads. The working paper
    // does not: it is the spine the sections are written from, and a truncated
    // spine costs depth rather than making the report stop mid-sentence.
    inReport: new Set([...sectionPasses.map((p) => p.key), "final"]),
  };
}

export const DIAGNOSTIC_SPEC = pipelineSpec({
  id: "diagnostic",
  reconcileTask: RECONCILE_TASK,
  sectionPasses: SECTION_PASSES,
  finalTask: FINAL_TASK,
});

export const DIAGNOSTIC_STAGES = [
  { key: "reconcile", label: "Reading the documents against each other" },
  ...SECTION_PASSES.map((p) => ({ key: p.key, label: p.label })),
  { key: "final", label: "Findings and reconciliation ledger" },
];

/**
 * How hard each pass thinks, and how much room it has to write.
 *
 * Current models take `thinking: {type: "adaptive"}` and are steered by
 * `effort` rather than a fixed token budget — the model decides how much
 * reasoning a given input deserves, which is the right shape here because
 * a thin information pack should not be thought about as hard as a thick
 * contradictory one.
 *
 * Reconciliation runs at max: it is the pass where correctness matters
 * more than cost, because everything downstream is built on what it
 * finds and a contradiction missed here is missed everywhere. The
 * section passes run one step below — they are writing up findings that
 * already exist rather than discovering them. The final pass only has to
 * summarise what is already written.
 */
const BUDGET = {
  // The working paper gets the model's whole output ceiling. On the first
  // real client pack it hit 32,000 four times running — roughly 128,000
  // tokens of reconciliation table and still unfinished — because a
  // contradictions ledger over eighteen documents is simply long. Four
  // continuations of 32,000 cost the same as two of 64,000 and produce a
  // less coherent table, since each continuation re-reads its own tail
  // rather than holding the whole thing in one pass.
  reconcile: { effort: "max", max: 64000 },
  section: { effort: "xhigh", max: 32000 },
  // Was 16,000, on the reasoning that the final pass only summarises. It also
  // writes the traceability table — a row per requirement across the whole
  // deliverable set — which on a real pack is the longest table in the
  // document. Halving its room against the section passes for no reason meant
  // it was continued more often than any of them.
  final: { effort: "high", max: 32000 },
};

/**
 * Which passes end up in the document the client reads.
 *
 * The reconcile pass does not. It is the working paper the twelve
 * deliverables are written from, and the report never contains it. That
 * distinction matters at the top of the run record: a truncated working
 * paper means the sections were built on a partial ledger, which is a
 * depth problem; a truncated section means the report itself stops
 * mid-sentence, which is a "do not send this" problem. Reporting both as
 * "output hit the length limit" told the desk its finished report was
 * cut off when it was whole.
 */
/** Kept for the one call site that predates the spec; see pipelineSpec(). */
const IN_REPORT = DIAGNOSTIC_SPEC.inReport;

/**
 * The context guard.
 *
 * The prompt grows on every pass: the standard, the client's documents
 * and the drawings are constant, but the working paper is added after
 * pass one and every section written is added to the passes after it. By
 * the last section pass that is the whole report so far. Nothing was
 * measuring it, so a thick pack simply hit the model's context window
 * and the API returned a 400 — five completed passes thrown away at the
 * sixth, with an error message about tokens that told the user nothing
 * they could act on.
 *
 * So it is measured before the call and trimmed to fit, in the order a
 * person would sacrifice it: the sections already written first (the
 * pass is told which are missing and that it must not contradict them),
 * then the tail of the working paper, and only then the client's own
 * documents — and if it ever comes to that, the run says so in the
 * report rather than quietly writing a thinner one.
 *
 * The estimate is deliberately crude and deliberately pessimistic: 3.4
 * characters per token against an English average nearer 4, so the guard
 * trims a little early rather than a little late.
 */
export const CONTEXT_TOKENS = Number(process.env.ETABLIX_AI_CONTEXT_TOKENS || 170000);
const TOKENS_PER_IMAGE = 1700;
export const estimateTokens = (text) => Math.ceil(String(text || "").length / 3.4);

/** Trim the tail of a block to a token allowance, saying where it was cut. */
function clip(text, tokens, what) {
  const marker = `\n\n[${what} WAS CUT HERE to fit the model's context. Everything above is complete. Do not treat the absence of anything below as a finding.]`;
  const chars = Math.max(0, Math.floor(tokens * 3.4));
  if (text.length <= chars) return text;
  return text.slice(0, Math.max(0, chars - marker.length)) + marker;
}

/**
 * Fit the parts of one call inside the context window.
 * Returns the (possibly trimmed) blocks and a note when anything was cut.
 */
export function fitContext({ system, inputsBlock, ledgerBlock, priorBlock, task, images = 0, maxOutput = 0, budget = CONTEXT_TOKENS }) {
  const notes = [];
  let inputs = inputsBlock || "";
  let ledger = ledgerBlock || "";
  let prior = priorBlock || "";

  // What the three variable blocks have to fit inside, once the fixed
  // parts and the room the answer needs are taken out.
  const ceiling =
    budget - estimateTokens(system) - estimateTokens(task) - images * TOKENS_PER_IMAGE - maxOutput;
  const total = () => estimateTokens(inputs) + estimateTokens(ledger) + estimateTokens(prior);
  if (total() <= ceiling) return { inputsBlock: inputs, ledgerBlock: ledger || null, priorBlock: prior || null, notes };

  // First sacrifice: the sections already written, then the tail of the
  // working paper. The client's own documents are never touched while
  // anything else can go.
  const room = ceiling - estimateTokens(inputs);
  if (room > 0) {
    const ledgerAllowance = Math.min(estimateTokens(ledger), Math.floor(room * 0.66));
    const priorAllowance = Math.max(0, room - ledgerAllowance);
    if (estimateTokens(prior) > priorAllowance) {
      const marker =
        "\n\n[EARLIER SECTIONS OMITTED to fit the context — you are being shown the most recent ones. Do not repeat or contradict what you cannot see; where you need an earlier section, refer to it by number.]\n\n";
      // The head, the marker and the tail all count against the
      // allowance — trimming to the allowance and then adding a
      // paragraph puts it back over, which then cut the client's
      // documents by a token for no reason.
      const chars = Math.floor(priorAllowance * 3.4) - marker.length - 200;
      if (chars < 400) {
        prior = "";
        notes.push("The sections already written were too long to send with this pass, so it was written from the working paper alone. Cross-references between sections may be thinner than usual.");
      } else {
        // Keep the MOST RECENT sections: a pass is likeliest to repeat
        // or contradict the section immediately before it.
        prior = prior.slice(0, 200) + marker + prior.slice(prior.length - chars);
        notes.push("Some earlier sections were omitted from the later passes to fit the model's context.");
      }
    }
    if (estimateTokens(ledger) > ledgerAllowance) {
      ledger = clip(ledger, ledgerAllowance, "THE WORKING PAPER");
      notes.push("The working paper was too long to send whole and was cut; the report says where.");
    }
  } else {
    prior = "";
    ledger = "";
    notes.push("The client's documents alone filled this pass, so the working paper and the sections already written could not be sent with it.");
  }

  // Last resort. A report written on part of the pack must say so.
  const forInputs = ceiling - estimateTokens(ledger) - estimateTokens(prior);
  if (estimateTokens(inputs) > forInputs) {
    inputs = clip(inputs, Math.max(0, forInputs), "THE CLIENT'S INFORMATION");
    notes.push("THE CLIENT'S DOCUMENTS DID NOT FIT THE MODEL'S CONTEXT AND WERE CUT. The report is written on part of the pack — say so in the findings, and split the pack across two runs.");
  }
  return { inputsBlock: inputs, ledgerBlock: ledger || null, priorBlock: prior || null, notes };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Errors worth waiting out rather than giving up on. Six sequential
 * calls against a busy model will meet one of these often enough that
 * not retrying would make the pipeline unreliable by arithmetic alone.
 */
const TRANSIENT =
  /overloaded|rate.?limit|429|500|502|503|504|529|timeout|timed out|connection error|ETIMEDOUT|ECONNRESET|ECONNREFUSED|EPIPE|ENOTFOUND|EAI_AGAIN|socket hang up|network|fetch failed|aborted/i;

/**
 * The only errors that mean "this model will not accept the request as
 * shaped" — the ones a shallower rung can actually fix.
 *
 * The old test was `/invalid_request/`, which matches every 400 the API
 * returns. A run whose key had run out of credit, or whose prompt was
 * too long, or which named a model the account cannot use, was therefore
 * "degraded" down four rungs, failed on all of them, and reported the
 * last and least informative error — while the console told the user
 * their model did not support extended thinking, which was not true and
 * sent them looking in the wrong place.
 */
const CAPABILITY = /max_tokens|thinking|budget_tokens|adaptive|effort|output_config|temperature|top_p|does not support|not supported|unsupported/i;

/**
 * Errors no amount of retrying or degrading will fix, and which should
 * stop the run at once with the provider's own words. Spending four
 * rungs and twenty retries to arrive at "your credit balance is too low"
 * wastes ten minutes to say what the first response said.
 */
const FATAL = /credit balance|billing|payment required|authentication|invalid x-api-key|permission|not_found_error|model.*(not found|does not exist)|prompt is too long|context.*(too long|window)/i;

/**
 * What to do about one error, decided in one place so the pipeline and
 * the tests agree: "wait" (transient — retry it), "degrade" (this model
 * will not take the request as shaped — try a shallower rung), "stop"
 * (nothing here is going to change the answer).
 */
export function classifyError(err) {
  const message = String(err?.message || err || "");
  const status = err?.status ?? err?.statusCode ?? null;
  if (/declined this request/.test(message)) return "stop";
  if (FATAL.test(message)) return "stop";
  if (TRANSIENT.test(message)) return "wait";
  if ((status === null || status === 400 || status === 422) && CAPABILITY.test(message)) return "degrade";
  return "stop";
}

/** How long the provider asked us to wait, if it said. */
function retryAfterMs(err) {
  const h = err?.headers?.["retry-after"] ?? err?.headers?.get?.("retry-after");
  const n = Number(h);
  if (Number.isFinite(n) && n > 0) return Math.min(n * 1000, 120000);
  const when = h ? Date.parse(h) : NaN;
  if (Number.isFinite(when)) return Math.min(Math.max(0, when - Date.now()), 120000);
  return null;
}

/**
 * One call, with the fallbacks that stop a provider or model change from
 * taking the whole pipeline down: a model that will not accept the
 * requested output length, and a model that does not support extended
 * thinking at all. Each is retried once, degraded — a shallower pass
 * beats no pass — and what worked is remembered in `caps` so the
 * remaining passes do not re-probe the same limit five more times.
 *
 * Transient errors are a separate matter: those are waited out, because
 * losing five completed passes to one busy minute would be absurd.
 */
async function call(anthropic, { model, system, inputsBlock, visualBlocks, visualNote, ledgerBlock, priorBlock, task, budget, caps, deadline = null }) {
  const started = Date.now();
  // The standard, the written inputs and the drawings are identical
  // across all six passes, and the working paper across the last five,
  // so both spans are cached rather than re-billed every time. Order
  // matters: a breakpoint only helps if everything before it is
  // unchanged, which is why the accumulating sections come last and why
  // the marker sits on the final stable block rather than the first.
  const fitted = fitContext({
    system, inputsBlock, ledgerBlock, priorBlock, task,
    images: visualBlocks?.length || 0,
    maxOutput: budget.max,
  });

  const content = [];
  if (visualBlocks) {
    content.push({ type: "text", text: visualNote });
    content.push(...visualBlocks);
  }
  content.push({ type: "text", text: fitted.inputsBlock, cache_control: { type: "ephemeral" } });
  if (fitted.ledgerBlock) content.push({ type: "text", text: fitted.ledgerBlock, cache_control: { type: "ephemeral" } });
  if (fitted.priorBlock) content.push({ type: "text", text: fitted.priorBlock });
  content.push({ type: "text", text: task });

  const base = {
    model,
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content }],
  };

  // Degradation ladder, most capable first. The administrator chooses the
  // model in the portal, so this cannot assume one: rung 1 is the current
  // API, rung 3 the pre-adaptive one an older model still needs, rung 4
  // the plainest request any model will accept.
  const all = [
    { ...base, max_tokens: budget.max, thinking: { type: "adaptive" }, output_config: { effort: budget.effort } },
    { ...base, max_tokens: budget.max, thinking: { type: "adaptive" } },
    { ...base, max_tokens: Math.min(budget.max, 16000), thinking: { type: "enabled", budget_tokens: 8000 } },
    { ...base, max_tokens: 8192 },
  ];
  // Start where the last pass ended up, not back at the top.
  const attempts = all.slice(caps.from);

  let lastErr;
  for (const [n, req] of attempts.entries()) {
    const i = caps.from + n;
    try {
      let res;
      for (let attempt = 0; ; attempt += 1) {
        try {
          // Streamed, not because anything watches the tokens arrive, but
          // because the SDK refuses a plain request whose output budget
          // could take it past ten minutes — and a thinking pass over
          // eight documents is exactly that request.
          res = await anthropic.messages.stream(req).finalMessage();
          break;
        } catch (err) {
          const message = String(err?.message || err);
          if (FATAL.test(message)) throw err;
          // Two ceilings, not one. The attempt count stops a fast
          // failure looping; the deadline stops a slow one from holding
          // a pass open all afternoon while each retry waits its turn.
          const outOfTime = deadline && Date.now() > deadline;
          if (attempt >= 4 || outOfTime || classifyError(err) !== "wait") {
            if (outOfTime) throw new Error(`Gave up after ${Math.round((Date.now() - started) / 60000)} minutes of retries: ${message}`);
            throw err;
          }
          // Honour what the provider asked for, when it asked for
          // something — guessing at the backoff against a rate limit
          // that has told us the number is how a run gets throttled for
          // longer than it needed to be.
          await sleep(retryAfterMs(err) ?? 2000 * 2 ** attempt);
        }
      }
      const text = res.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
      if (res.stop_reason === "refusal") {
        throw new Error("The provider declined this request" + (res.stop_details?.explanation ? `: ${res.stop_details.explanation}` : "."));
      }
      caps.from = i;
      return {
        text,
        model: res.model,
        contextNotes: fitted.notes,
        truncated: res.stop_reason === "max_tokens",
        degraded: i > 0,
        usage: {
          input: res.usage.input_tokens,
          output: res.usage.output_tokens,
          cacheRead: res.usage.cache_read_input_tokens || 0,
          cacheWrite: res.usage.cache_creation_input_tokens || 0,
        },
      };
    } catch (err) {
      lastErr = err;
      // A refusal is a decision, not a capability problem — do not retry it.
      if (/declined this request/.test(err.message)) throw err;
      if (FATAL.test(String(err?.message || err))) throw err;
      // Only a 400 about a parameter this ladder actually changes is
      // worth another rung. Anything else is reported as itself.
      if (classifyError(err) !== "degrade" || i === all.length - 1) throw err;
      caps.reason = String(err.message || "").slice(0, 200);
    }
  }
  throw lastErr;
}

/**
 * How many times one pass may be continued after it runs out of room.
 *
 * Three is generous and it is a ceiling, not a target: a pass that is
 * still cutting off after three continuations is not going to be rescued
 * by a fourth, and at that point the report has to SAY it is incomplete
 * rather than quietly hand the desk a document that stops mid-row.
 */
/**
 * HOW MANY TIMES A PASS MAY BE CONTINUED: until it is finished.
 *
 * This was three. Three is a number somebody chose, and on a long pass it
 * was the difference between a deliverable and a deliverable that stops
 * mid-table — the run said "INCOMPLETE, do not issue" and the client's
 * report was unusable, having cost four calls of model time to produce.
 *
 * A count is the wrong control anyway. The right question is not "how many
 * continuations have we had" but "is it still making progress", and that has
 * an exact answer: a continuation either adds text or it does not. So the
 * loop now runs until the model stops truncating, and stops early only when
 * a continuation adds effectively nothing — which is a stalled model, and
 * one more call will not fix it.
 *
 * The ceiling below is not a budget. It is the guard against a pathological
 * loop — a model that truncates for ever while producing a trickle of new
 * characters each time — and it is set far above any honest pass so that it
 * is never the thing that ends a run. If a pass ever reaches it, that is a
 * fault to investigate, not a limit to raise.
 */
export const CONTINUATION_GUARD = Number(process.env.ETABLIX_AI_MAX_CONTINUATIONS || 60);

/** Below this many new characters, a continuation has stalled rather than progressed. */
export const STALL_CHARS = 24;

/**
 * THE REAL CONTROL: how much one pass may write, in characters.
 *
 * A call count is the wrong ceiling and it took a test to show why. Sixty
 * continuations of a pass that reports itself truncated every time is sixty
 * paid calls producing no deliverable — the loop is the fault, and counting
 * to sixty before admitting it is expensive.
 *
 * Volume is the honest measure, because a deliverable has a size. This
 * ceiling is roughly 300,000 tokens of output IN ONE PASS: several times the
 * longest section any of these agents has ever produced on a real client
 * pack, so it never ends an honest pass. Past it, the model is not writing a
 * long document, it is looping — and the run says so and keeps what was
 * written, rather than spending more to reach the same conclusion.
 *
 * Lowered by the truncation suite so the loop can be driven to its end in a
 * test without a thousand calls.
 */
export const PASS_CHAR_CEILING = Number(process.env.ETABLIX_AI_MAX_PASS_CHARS || 1_200_000);

/**
 * What a model is told when its own output was cut off.
 *
 * ONE WORDING, SHARED. The pipeline passes and the single-pass agents both
 * continue now, and two versions of this instruction would drift — with the
 * failure showing up as a duplicated heading or a repeated table row in
 * whichever one was not updated.
 *
 * The explicit "even if that is the middle of a word" is the part that
 * matters. The two replies are joined with NOTHING between them, because a
 * blank line inserted at the join breaks whatever table row the cut fell
 * inside, and a broken row in a pricing schedule is a line nobody prices.
 */
export function continuationInstruction(tail) {
  return (
    `YOU HAVE ALREADY WRITTEN PART OF THIS. It stopped because it reached the length limit. ` +
    `Continue it. Do not restart it, do not repeat a heading, a row or a sentence that is already written, ` +
    `and do not summarise what came before.\n\n` +
    `Your reply will be appended directly to what you wrote, with nothing at all in between — ` +
    `no newline, no separator. So begin at the exact character where it stopped, even if that is ` +
    `the middle of a word, the middle of a table row or the middle of a sentence. ` +
    `Finish whatever was in progress, then write everything that had not been reached, ` +
    `using the same headings, the same table columns and the same ID series.\n\n` +
    `WHAT YOU WROTE ENDS LIKE THIS:\n\n${tail}`
  );
}

/**
 * One pass, written to the end.
 *
 * `call` returns whatever the model produced before it hit `max_tokens`.
 * For months only the reconcile pass did anything about that, and the
 * other five did not — so on a real client pack every one of the twelve
 * deliverables and the whole contradictions appendix came back cut off,
 * some of them mid-sentence, and the run said so in a note nobody could
 * act on. A report that stops in the middle of a word cannot be issued,
 * however good the analysis above it is.
 *
 * So a truncated pass is continued from exactly where it stopped, and
 * the continuation is appended with NOTHING between the two — which is
 * why the instruction is explicit that the model may have to resume
 * mid-word. Joining the parts with a blank line, which is what the old
 * reconcile continuation did, leaves a broken table row wherever the cut
 * fell inside one.
 */
async function complete(anthropic, args, key, record, notes, inReport = IN_REPORT) {
  let r = await call(anthropic, args);
  record(r, key);
  let text = r.text;

  let rounds = 0;
  let stalled = false;
  let overflowed = false;
  while (r.truncated) {
    if (text.length >= PASS_CHAR_CEILING) { overflowed = true; break; }
    if (rounds >= CONTINUATION_GUARD) break;
    rounds += 1;
    // The tail is what makes the join seamless. The whole partial is not
    // resent: the working paper and the earlier sections are already in
    // the request, and the model only needs to see where its own pen
    // stopped.
    const tail = text.slice(-4000);
    r = await call(anthropic, {
      ...args,
      task: `${args.task}\n\n---\n\n${continuationInstruction(tail)}`,
    });
    record(r, `${key}-continued-${rounds}`);
    // A continuation that adds nothing is a stalled model, not a long pass.
    // Calling it again produces the same nothing at the same price.
    if (r.text.trim().length < STALL_CHARS) {
      stalled = true;
      text += r.text;
      break;
    }
    text += r.text;
  }

  if (r.truncated && inReport.has(key)) {
    // Loud, and phrased so the desk cannot mistake it for a caveat. Reaching
    // here now means something is actually wrong: the pass either stalled —
    // the model stopped adding text while still reporting itself cut off — or
    // it passed a guard set far above any honest length.
    notes.push(
      `The "${key}" pass is INCOMPLETE. It was continued ${rounds} time${rounds === 1 ? "" : "s"}, wrote ` +
      `${text.length.toLocaleString("en-GB")} characters, and is still cut off` +
      (stalled
        ? " — and the last continuation added almost nothing, so the model stalled rather than ran out of room. "
        : overflowed
          ? `, passing the ${PASS_CHAR_CEILING.toLocaleString("en-GB")}-character ceiling for a single pass. ` +
            "A pass that long is looping rather than writing, so it was stopped. "
          : `, having reached the continuation backstop of ${CONTINUATION_GUARD} calls. `) +
      `This part of the report stops before its end. Do not issue it as it stands.`
    );
  } else if (r.truncated) {
    // The working paper, and only the working paper. Say what it actually
    // costs — depth, not completeness — and say plainly that the report is
    // unaffected, because the desk's next question is whether to send it.
    notes.push(
      `The working paper was continued ${rounds} time${rounds === 1 ? "" : "s"}, wrote ${text.length.toLocaleString("en-GB")} characters, ` +
      `and still stops before its end, so the twelve ` +
      `deliverables were written from a partial reconciliation ledger and may be less complete than they could be. ` +
      `THE REPORT ITSELF IS NOT CUT OFF — the working paper is internal and never forms part of it.`
    );
  } else if (rounds) {
    notes.push(
      `The "${key}" pass reached the length limit and was continued in ${rounds} further call${rounds > 1 ? "s" : ""} — it is complete.`
    );
  }
  return { text, rounds, truncated: r.truncated };
}

/**
 * The written inputs and the client's documents, laid out once and
 * reused by every pass.
 *
 * Every document used to be appended to ONE field — the programme —
 * while the other seven said "Supplied — see the attached documents". A
 * pass asked about the site layout was handed a field that said nothing
 * and a layout drawing buried in the middle of a programme, and the
 * report then reported no layout constraints. Each document now appears
 * under the requirement it was supplied against, in its own block, and a
 * field with a document behind it says which one.
 */
export function buildInputsBlock(brief, inputs, documents = []) {
  const byField = new Map();
  for (const d of documents) {
    const key = d.field || "__other";
    if (!byField.has(key)) byField.set(key, []);
    byField.get(key).push(d);
  }
  const parts = brief.fields
    .filter((f) => f.type === "textarea")
    .map((f) => {
      const v = String(inputs?.[f.name] || "").trim();
      const docs = byField.get(f.name) || [];
      const named = docs.length ? `\nDocuments supplied against this requirement: ${docs.map((d) => d.name).join(", ")} — their full text is below.` : "";
      return v
        ? `### INPUT — ${f.label}\n${v}${named}`
        : docs.length
          ? `### INPUT — ${f.label}\nAnswered by document.${named}`
          : `### INPUT — ${f.label}\n(not provided)`;
    });
  const who = [
    inputs?.client && `Client: ${inputs.client}`,
    inputs?.project && `Project: ${inputs.project}`,
    inputs?.handover && `Information handover: ${inputs.handover}`,
  ]
    .filter(Boolean)
    .join("\n");
  const docBlocks = documents.map((d) => {
    const against = d.label ? ` — supplied against: ${d.label}` : "";
    return `===== DOCUMENT: ${d.name}${d.pages ? ` (${d.pages} pages)` : ""}${against} =====\n${d.text}`;
  });

  // A pass that does not know a document was cut will read the absence
  // of a clause as the absence of a requirement, and report it as a
  // finding. So it is told, by name, before it reads any of them.
  const trimmed = documents.filter((d) => d.cut);
  if (trimmed.length) {
    docBlocks.unshift(
      `===== A NOTE ON WHAT YOU WERE GIVEN =====\n` +
      `${trimmed.length} of these ${documents.length} documents were too long to send whole and were cut at the point marked inside each one: ` +
      `${trimmed.map((d) => d.name).join(", ")}. Nothing was dropped and nothing was summarised for you. ` +
      `Where a finding would have needed the part that was cut, say so rather than inferring it, and never read the absence of something below a cut as evidence that it does not exist.`
    );
  }

  return (
    `THE CLIENT'S INFORMATION\n\n${who}\n\nToday's date is ${new Date().toISOString().slice(0, 10)}; every "latest responsible start" and "days remaining" is computed from it.\n\n` +
    parts.join("\n\n") +
    (docBlocks.length ? `\n\n## THE DOCUMENTS THEMSELVES\n\n${docBlocks.join("\n\n")}` : "")
  );
}

/**
 * Run the whole pipeline.
 *
 * `onStage` is called before and after every pass so progress is saved
 * as it happens: a run that dies at pass four leaves four passes of work
 * on the record rather than nothing.
 */
export async function runPipeline({ spec = DIAGNOSTIC_SPEC, anthropic, model, system, brief, inputs, documents = [], visuals, onStage, resume = {} }) {
  const inputsBlock = buildInputsBlock(brief, inputs, documents);
  // NO TIME LIMIT by default. The run takes as long as the work takes.
  //
  // This ceiling only ever governed RETRIES — it never cut a pass short
  // mid-write — but with continuations a long, honest run can now pass
  // ninety minutes legitimately, and losing five finished passes to a
  // clock because the sixth met one busy minute is the wrong trade on a
  // report somebody is waiting to send a client.
  //
  // NO WALL CLOCK BY DEFAULT, and that is deliberate. A run is six or seven
  // passes of reasoning over a whole document set, each continued until it is
  // finished, and a report somebody is waiting to send a client must not be
  // abandoned because it was honestly long.
  //
  // Nothing runs away as a result. Every individual call is bounded at five
  // attempts with exponential backoff; every pass stops continuing the moment
  // the model stops adding text; and the continuation guard sits far above any
  // real pass. Set ETABLIX_AI_RUN_MINUTES if a deployment genuinely needs a
  // wall — but understand that it kills finished passes to save an unfinished
  // one, so the default is 0 and should stay 0.
  const minutes = Number(process.env.ETABLIX_AI_RUN_MINUTES || 0);
  const deadline = minutes > 0 ? Date.now() + minutes * 60 * 1000 : null;
  // Drawings and printed programmes lead, because they are the only part
  // of the pack that has to be looked at, and because they are as stable
  // across the six passes as the written inputs — so they sit inside the
  // same cached prefix and are paid for once.
  const visualBlocks = visuals?.blocks?.length ? visuals.blocks : null;
  const visualNote = visuals?.preamble || "";
  const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  const notes = [];
  let modelUsed = model;
  // What this model turned out to accept, learned once and reused.
  const caps = { from: 0 };

  const record = (r, key) => {
    usage.input += r.usage.input;
    usage.output += r.usage.output;
    usage.cacheRead += r.usage.cacheRead;
    usage.cacheWrite += r.usage.cacheWrite;
    modelUsed = r.model || modelUsed;
    if (r.degraded && !notes.some((n) => n.startsWith("Depth reduced"))) {
      notes.push(
        "Depth reduced: this model would not accept the full thinking or output budget, so every pass ran shallower than designed. A model that supports extended thinking and long output produces a materially deeper report."
      );
    }
    for (const n of r.contextNotes || []) if (!notes.includes(n)) notes.push(n);
  };

  // A pass already held from an interrupted run is not paid for twice. The
  // comment above this function used to claim each pass was saved as it
  // landed; it was not — only the progress dots were — so a restart threw
  // away every completed pass along with the one in flight.
  let ledger;
  if (resume.reconcile) {
    ledger = resume.reconcile;
    notes.push("Pass 1 was carried over from the interrupted run rather than repeated.");
    await onStage?.({ key: "reconcile", state: "done", index: 0, chars: ledger.length, resumed: true });
  } else {
    await onStage?.({ key: "reconcile", state: "running", index: 0 });
    // The working paper is the spine: five passes are written from it, and
    // the contradictions table is the single most valuable thing in the
    // engagement. If it stops mid-table, everything downstream is built on
    // a truncated spine — so it is written to the end, not used as it is.
    const ledgerRun = await complete(anthropic, {
      model, system, inputsBlock, visualBlocks, visualNote, task: spec.reconcileTask, budget: BUDGET.reconcile, caps, deadline,
    }, "reconcile", record, notes, spec.inReport);
    ledger = ledgerRun.text;
    await onStage?.({ key: "reconcile", state: "done", index: 0, chars: ledger.length, text: ledger });
  }

  const sections = [];
  for (const [i, pass] of spec.sectionPasses.entries()) {
    if (resume[pass.key]) {
      sections.push({ key: pass.key, text: resume[pass.key] });
      await onStage?.({ key: pass.key, state: "done", index: i + 1, chars: resume[pass.key].length, resumed: true });
      continue;
    }
    await onStage?.({ key: pass.key, state: "running", index: i + 1 });
    const r = await complete(anthropic, {
      model, system, inputsBlock, visualBlocks, visualNote,
      ledgerBlock: `THE WORKING PAPER FROM PASS ONE — every finding below is sourced; build on it, cite its references, and do not contradict it without saying why.\n\n${ledger}`,
      priorBlock: sections.length
        ? `THE SECTIONS ALREADY WRITTEN — stay consistent with them, refer to them by number, and do not repeat their content.\n\n${sections.map((s) => s.text).join("\n\n")}`
        : null,
      task: pass.task, budget: BUDGET.section, caps, deadline,
    }, pass.key, record, notes, spec.inReport);
    sections.push({ key: pass.key, text: r.text });
    await onStage?.({ key: pass.key, state: "done", index: i + 1, chars: r.text.length, text: r.text });
  }

  await onStage?.({ key: "final", state: "running", index: spec.sectionPasses.length + 1 });
  // The final pass is never carried over: it reconciles the twelve sections
  // against each other, so it has to be written against the set that actually
  // exists rather than an earlier one.
  const finalRun = await complete(anthropic, {
    model, system, inputsBlock, visualBlocks, visualNote,
    ledgerBlock: `THE WORKING PAPER FROM PASS ONE — every finding below is sourced; build on it, cite its references, and do not contradict it without saying why.\n\n${ledger}`,
    priorBlock: `THE TWELVE DELIVERABLES AS WRITTEN\n\n${sections.map((s) => s.text).join("\n\n")}`,
    task: spec.finalTask,
    budget: BUDGET.final,
    caps,
    deadline,
  }, "final", record, notes, spec.inReport);
  await onStage?.({ key: "final", state: "done", index: spec.sectionPasses.length + 1, chars: finalRun.text.length, text: finalRun.text });

  // The findings paragraph is written last but read first, so the
  // assembled report puts it back where it belongs.
  const finalText = finalRun.text;
  const appendixAt = finalText.search(/^#{1,4}\s*A\s*[.)·:—-]/m);
  const findings = appendixAt > 0 ? finalText.slice(0, appendixAt).trim() : finalText;
  const appendix = appendixAt > 0 ? finalText.slice(appendixAt).trim() : "";

  const output = [findings, ...sections.map((s) => s.text), appendix].filter(Boolean).join("\n\n");
  if (!output.trim()) throw new Error("The agent returned no output — try again with more specific inputs.");

  return {
    output,
    model: modelUsed,
    usage: { input: usage.input, output: usage.output, cacheRead: usage.cacheRead, cacheWrite: usage.cacheWrite },
    // A pass that was continued to the end also mentions the length limit
    // in its note, so this matches the INCOMPLETE note specifically. The
    // old test matched the word and flagged a finished report as cut off.
    // True only when a pass that REACHES THE REPORT is cut off. A truncated
    // working paper is reported in the notes and does not raise this flag,
    // because this flag is what tells the desk the document stops early.
    truncated: notes.some((n) => /pass is INCOMPLETE/.test(n)),
    notes,
    passes: spec.stages.length,
  };
}

export { STANDARD };

/**
 * The Site Systems Diagnostic, by its original name.
 *
 * Kept so nothing that called it has to change while the other deliverables
 * are built on the same engine.
 */
export const runDiagnostic = (args) => runPipeline({ ...args, spec: DIAGNOSTIC_SPEC });
