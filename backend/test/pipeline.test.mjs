/**
 * The pipeline's arithmetic, tested without spending anything.
 *
 *   node backend/test/pipeline.test.mjs
 *
 * Three faults, all of them silent in production, which is what made
 * them expensive: documents past the first were dropped without a word;
 * every document was folded into ONE input field while the other seven
 * said "supplied — see the attached documents"; and a prompt that
 * outgrew the model's context failed the whole run at the last pass with
 * an error about tokens.
 */
import assert from "node:assert/strict";
import { shareOut } from "../lib/extract.js";
import { fitContext, estimateTokens, classifyError, buildInputsBlock, CONTEXT_TOKENS } from "../lib/diagnostic.js";
import { AGENT_BRIEFS } from "../lib/ai.js";

let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log("  ✓ " + name); } catch (e) { fail++; console.log("  ✗ " + name + "\n      " + String(e.message).split("\n").slice(0, 4).join("\n      ")); } };

console.log("\npipeline — how the character budget is shared\n");

t("one giant document no longer eats the whole budget", () => {
  const shares = shareOut([300000, 5000, 5000, 5000], 180000);
  assert.equal(shares.length, 4);
  assert.ok(shares.every((n) => n > 0), "every document gets a share");
  assert.deepEqual(shares.slice(1), [5000, 5000, 5000], "the short ones arrive whole");
  assert.equal(shares.reduce((a, b) => a + b, 0), 180000, "and the budget is spent, not exceeded");
});

t("documents that all fit are all sent whole", () => {
  assert.deepEqual(shareOut([1000, 2000, 3000], 180000), [1000, 2000, 3000]);
});

t("documents that are all too long divide the budget equally", () => {
  assert.deepEqual(shareOut([100000, 100000, 100000], 180000), [60000, 60000, 60000]);
});

t("nothing is dropped when the budget is tiny — everything is cut instead", () => {
  const shares = shareOut([50000, 50000], 100);
  assert.deepEqual(shares, [50, 50]);
});

console.log("\npipeline — the context guard\n");

t("a prompt that fits is not touched", () => {
  const r = fitContext({ system: "s", inputsBlock: "i", ledgerBlock: "l", priorBlock: "p", task: "t", maxOutput: 32000 });
  assert.equal(r.notes.length, 0);
  assert.equal(r.priorBlock, "p");
});

t("the sections already written are sacrificed first, and said so", () => {
  const big = "x".repeat(3400 * 90);
  const r = fitContext({ system: "s", inputsBlock: "i", ledgerBlock: "l", priorBlock: big, task: "t", maxOutput: 32000, budget: 100000 });
  assert.ok(r.notes.length >= 1);
  assert.ok(/earlier sections/i.test(r.notes[0]));
  assert.ok(estimateTokens(r.priorBlock) < estimateTokens(big));
  assert.equal(r.inputsBlock, "i", "the client's documents are not touched while anything else can go");
});

t("cutting the client's own documents is the last resort and is stated loudly", () => {
  const huge = "x".repeat(3400 * 200);
  const r = fitContext({ system: "s", inputsBlock: huge, ledgerBlock: "l", priorBlock: "p", task: "t", maxOutput: 32000, budget: 100000 });
  assert.ok(r.notes.some((n) => /CLIENT'S DOCUMENTS.*WERE CUT/.test(n)));
  assert.ok(r.inputsBlock.includes("WAS CUT HERE"));
});

t("the guard leaves room for the output as well as the input", () => {
  const r = fitContext({ system: "s", inputsBlock: "x".repeat(3400 * 50), ledgerBlock: "x".repeat(3400 * 50), priorBlock: "x".repeat(3400 * 50), task: "t", maxOutput: 32000, budget: 100000 });
  const total = estimateTokens(r.inputsBlock) + estimateTokens(r.ledgerBlock || "") + estimateTokens(r.priorBlock || "") + 32000;
  assert.ok(total <= 100000 + 1000, `total ${total} is inside the window`);
});

console.log("\npipeline — what to do about an error\n");

t("a rate limit is waited out", () => assert.equal(classifyError({ message: "429 rate_limit_error", status: 429 }), "wait"));
t("an overloaded model is waited out", () => assert.equal(classifyError({ message: "Overloaded", status: 529 }), "wait"));
t("a refused output length degrades a rung", () => assert.equal(classifyError({ message: "max_tokens: 128000 > 64000, which is the maximum allowed", status: 400 }), "degrade"));
t("a model that will not think degrades a rung", () => assert.equal(classifyError({ message: "thinking.budget_tokens is not supported", status: 400 }), "degrade"));
t("an empty credit balance stops at once", () => assert.equal(classifyError({ message: "Your credit balance is too low to access the API", status: 400 }), "stop"));
t("a rejected key stops at once", () => assert.equal(classifyError({ message: "authentication_error: invalid x-api-key", status: 401 }), "stop"));
t("a prompt over the window stops rather than degrading four times", () => assert.equal(classifyError({ message: "prompt is too long: 210000 tokens > 200000", status: 400 }), "stop"));
t("an unrecognised 400 stops rather than being mistaken for a capability limit", () =>
  assert.equal(classifyError({ message: "invalid_request_error: unexpected field 'wibble'", status: 400 }), "stop"));

console.log("\npipeline — each document under the requirement it answers\n");

const brief = AGENT_BRIEFS.diagnostic;
const documents = [
  { name: "layout-rev-C.pdf", field: "layout", label: "Proposed site layout", text: "PARCEL A: 4,200 m2." },
  { name: "programme.pdf", field: "programme", label: "Project programme", text: "Access 1 March 2027." },
  { name: "misc.pdf", field: null, label: null, text: "Something else entirely." },
];
const block = buildInputsBlock(brief, { client: "A Client", project: "P", handover: "2027-01-04" }, documents);

t("a field answered by a document names that document rather than saying nothing", () => {
  assert.ok(/### INPUT — Proposed site layout[\s\S]*layout-rev-C\.pdf/.test(block));
});

t("the layout drawing is not buried inside the programme field", () => {
  const layoutAt = block.indexOf("PARCEL A");
  const programmeField = block.indexOf("### INPUT — Project programme");
  assert.ok(layoutAt > 0, "the layout text is present");
  assert.ok(block.slice(programmeField, block.indexOf("### INPUT — Workforce")).includes("PARCEL A") === false,
    "and it is not inside the programme field");
});

t("every document reaches the model, including one tied to no requirement", () => {
  for (const d of documents) assert.ok(block.includes(d.name), `${d.name} is in the prompt`);
  assert.ok(block.includes("Something else entirely."));
});

t("a field with neither an answer nor a document still says so", () => {
  assert.ok(/### INPUT — Existing logistics plan[^\n]*\n\(not provided\)/.test(block));
});

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
