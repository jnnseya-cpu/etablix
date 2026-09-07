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
 * The passes are visible while they run and each one is saved as it
 * lands, so a run that fails at pass four is still four passes of work
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
export const DIAGNOSTIC_STAGES = [
  { key: "reconcile", label: "Reading the documents against each other" },
  ...SECTION_PASSES.map((p) => ({ key: p.key, label: p.label })),
  { key: "final", label: "Findings and reconciliation ledger" },
];

/**
 * Token budgets per pass.
 *
 * The reconciliation pass is the one that has to hold eight documents in
 * mind at once, so it gets the most room to think and the least to
 * write. Section passes are the reverse.
 */
const BUDGET = {
  reconcile: { thinking: 12000, max: 26000 },
  section: { thinking: 8000, max: 24000 },
  final: { thinking: 6000, max: 14000 },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Errors worth waiting out rather than giving up on. Six sequential
 * calls against a busy model will meet one of these often enough that
 * not retrying would make the pipeline unreliable by arithmetic alone.
 */
const TRANSIENT = /overloaded|rate.?limit|429|500|502|503|504|529|timeout|ETIMEDOUT|ECONNRESET|socket hang up|fetch failed/i;

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
async function call(anthropic, { model, system, inputsBlock, ledgerBlock, priorBlock, task, budget, caps }) {
  const content = [
    // The standard and the eight documents are identical across all six
    // passes, and the working paper is identical across the last five,
    // so both are cached rather than re-billed every time. Order matters:
    // a cache breakpoint only helps if everything before it is unchanged,
    // which is why the accumulating sections come after both.
    { type: "text", text: inputsBlock, cache_control: { type: "ephemeral" } },
  ];
  if (ledgerBlock) content.push({ type: "text", text: ledgerBlock, cache_control: { type: "ephemeral" } });
  if (priorBlock) content.push({ type: "text", text: priorBlock });
  content.push({ type: "text", text: task });

  const base = {
    model,
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content }],
  };

  const all = [
    { ...base, max_tokens: budget.max, thinking: { type: "enabled", budget_tokens: budget.thinking } },
    { ...base, max_tokens: 8192, thinking: { type: "enabled", budget_tokens: 4000 } },
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
          if (attempt >= 4 || !TRANSIENT.test(String(err?.message || err))) throw err;
          await sleep(2000 * 2 ** attempt);
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
      const retryable = /max_tokens|thinking|budget_tokens|not support|invalid_request/i.test(err.message || "");
      if (!retryable || i === all.length - 1) throw err;
    }
  }
  throw lastErr;
}

/** The eight inputs, laid out once and reused by every pass. */
function buildInputsBlock(brief, inputs) {
  const parts = brief.fields
    .filter((f) => f.type === "textarea")
    .map((f) => {
      const v = String(inputs?.[f.name] || "").trim();
      return v ? `### INPUT — ${f.label}\n${v}` : `### INPUT — ${f.label}\n(not provided)`;
    });
  const who = [inputs?.client && `Client: ${inputs.client}`, inputs?.project && `Project: ${inputs.project}`]
    .filter(Boolean)
    .join("\n");
  return `THE CLIENT'S INFORMATION\n\n${who}\n\nToday's date is ${new Date().toISOString().slice(0, 10)}; every "latest responsible start" and "days remaining" is computed from it.\n\n${parts.join("\n\n")}`;
}

/**
 * Run the whole pipeline.
 *
 * `onStage` is called before and after every pass so progress is saved
 * as it happens: a run that dies at pass four leaves four passes of work
 * on the record rather than nothing.
 */
export async function runDiagnostic({ anthropic, model, system, brief, inputs, onStage }) {
  const inputsBlock = buildInputsBlock(brief, inputs);
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
    if (r.truncated) notes.push(`The "${key}" pass hit the length limit and may be cut off.`);
  };

  await onStage?.({ key: "reconcile", state: "running", index: 0 });
  const ledgerRun = await call(anthropic, {
    model, system, inputsBlock, task: RECONCILE_TASK, budget: BUDGET.reconcile, caps,
  });
  record(ledgerRun, "reconcile");
  const ledger = ledgerRun.text;
  await onStage?.({ key: "reconcile", state: "done", index: 0, chars: ledger.length });

  const sections = [];
  for (const [i, pass] of SECTION_PASSES.entries()) {
    await onStage?.({ key: pass.key, state: "running", index: i + 1 });
    const r = await call(anthropic, {
      model, system, inputsBlock,
      ledgerBlock: `THE WORKING PAPER FROM PASS ONE — every finding below is sourced; build on it, cite its references, and do not contradict it without saying why.\n\n${ledger}`,
      priorBlock: sections.length
        ? `THE SECTIONS ALREADY WRITTEN — stay consistent with them, refer to them by number, and do not repeat their content.\n\n${sections.map((s) => s.text).join("\n\n")}`
        : null,
      task: pass.task, budget: BUDGET.section, caps,
    });
    record(r, pass.key);
    sections.push({ key: pass.key, text: r.text });
    await onStage?.({ key: pass.key, state: "done", index: i + 1, chars: r.text.length });
  }

  await onStage?.({ key: "final", state: "running", index: SECTION_PASSES.length + 1 });
  const finalRun = await call(anthropic, {
    model, system, inputsBlock,
    ledgerBlock: `THE WORKING PAPER FROM PASS ONE — every finding below is sourced; build on it, cite its references, and do not contradict it without saying why.\n\n${ledger}`,
    priorBlock: `THE TWELVE DELIVERABLES AS WRITTEN\n\n${sections.map((s) => s.text).join("\n\n")}`,
    task: FINAL_TASK,
    budget: BUDGET.final,
    caps,
  });
  record(finalRun, "final");
  await onStage?.({ key: "final", state: "done", index: SECTION_PASSES.length + 1, chars: finalRun.text.length });

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
    truncated: notes.some((n) => /length limit/.test(n)),
    notes,
    passes: DIAGNOSTIC_STAGES.length,
  };
}

export { STANDARD };
