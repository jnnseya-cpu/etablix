/**
 * Client engagement lifecycle — the derivations, with no server.
 *
 *   node backend/test/clientflow.test.mjs
 *
 * The money tests are here because a rounding error in depositTerms is
 * an invoice sent to a customer for the wrong amount, and nothing
 * downstream would catch it.
 *
 * The checklist tests are here because "no repetition, no questions" is
 * a claim the business makes, and a claim a business makes should be
 * enforceable. Every requirement line must carry a reason and a format:
 * without the reason the client rings to ask why, and without the
 * format the item comes back in a form nobody can read and has to be
 * asked for a second time.
 */

import assert from "node:assert/strict";
import {
  STAGES, STAGE_IDS, stage, stageIndex, MODELS, MODEL_IDS, model,
  DELIVERABLES, deliverable, REQUIREMENT_PACKS, PACK_IDS, buildChecklist, packFor,
  checklistState, nextAction, DECISIONS, DECISION_IDS, nextPeriodLabel,
  depositTerms, balanceTerms,
} from "../lib/clientflow.js";

let pass = 0;
const t = (name, fn) => { try { fn(); pass++; console.log("  ✓ " + name); } catch (e) { console.log("  ✗ " + name + "\n      " + e.message); process.exitCode = 1; } };

console.log("\nclientflow — stages\n");

t("the stages are unique and ordered", () => {
  assert.equal(new Set(STAGE_IDS).size, STAGES.length);
  // "enquiry" is first: an engagement opened automatically from a website
  // enquiry starts there, with no terms and nothing issuable.
  assert.equal(STAGE_IDS[0], "enquiry");
  assert.equal(STAGE_IDS[1], "agreed");
  assert.equal(STAGE_IDS.at(-1), "closed");
});

t("every stage says who it is waiting on", () => {
  for (const s of STAGES) assert.ok(["client", "etablix", "none"].includes(s.actor), s.id);
});

t("an unknown stage falls back rather than throwing", () => {
  // The fallback is the LEAST privileged stage, deliberately. A corrupted
  // stage value must not land somewhere a portal can be issued from.
  assert.equal(stage("nonsense").id, "enquiry");
  assert.equal(stageIndex("nonsense"), 0);
});

console.log("\nclientflow — money\n");

t("Model A: 30% deposit, 70% balance, and the two add back to the fee", () => {
  const e = { model: "A", fee: 7500 };
  assert.equal(depositTerms(e).amount, 2250);
  assert.equal(balanceTerms(e).amount, 5250);
  assert.equal(depositTerms(e).amount + balanceTerms(e).amount, e.fee);
});

t("Model A: an awkward fee still splits to the penny and still adds back", () => {
  // 30% of 9,999.99 is 2,999.997 — the case that produces a penny of
  // drift if the balance is computed as a percentage rather than as a
  // subtraction.
  const e = { model: "A", fee: 9999.99 };
  const d = depositTerms(e).amount, b = balanceTerms(e).amount;
  assert.equal(d, 3000);
  assert.equal(Math.round((d + b) * 100) / 100, 9999.99);
});

t("Model B: the advance is mobilisation + month one + platform", () => {
  const e = { model: "B", monthlyFee: 12000, mobilisationFee: 25000, platformFee: 2500 };
  assert.equal(depositTerms(e).amount, 39500);
  assert.equal(balanceTerms(e).amount, 14500);
});

t("Model C: the advance includes month-one supplier spend", () => {
  const e = { model: "C", monthlyFee: 30000, mobilisationFee: 50000, platformFee: 5000, advance: 400000 };
  assert.equal(depositTerms(e).amount, 485000);
  assert.equal(balanceTerms(e).amount, 35000);
});

t("a recurring model never quotes a percentage deposit", () => {
  for (const id of ["B", "C"]) assert.equal(depositTerms({ model: id, monthlyFee: 1000 }).pct, null);
});

t("an unknown model is treated as A rather than crashing an invoice", () => {
  assert.equal(model("Z").id, "A");
  assert.equal(depositTerms({ model: "Z", fee: 1000 }).amount, 300);
});

t("every model states its deposit and balance in words as well as numbers", () => {
  for (const id of MODEL_IDS) {
    const m = MODELS[id];
    // Narratives explain; labels name. Holding a label to a narrative's
    // length would push padding into a field that belongs on a button.
    for (const k of ["summary", "depositNarrative", "balanceNarrative"]) {
      assert.ok(String(m[k]).length > 40, `${id}.${k} is too thin to explain anything`);
    }
    for (const k of ["depositLabel", "balanceLabel"]) {
      assert.ok(String(m[k]).length >= 8, `${id}.${k}`);
    }
  }
});

console.log("\nclientflow — the requirement packs\n");

t("every deliverable resolves to a pack that exists", () => {
  for (const d of DELIVERABLES) assert.ok(REQUIREMENT_PACKS[d.pack], d.id);
  assert.equal(deliverable("nonsense").id, DELIVERABLES[0].id);
});

t("every requirement line carries a reason and a format", () => {
  // The invariant behind "no questions" and "no repetition".
  for (const p of PACK_IDS) {
    for (const i of REQUIREMENT_PACKS[p].items) {
      assert.ok(i.why && i.why.length > 40, `${p}/${i.id} has no real reason`);
      assert.ok(i.format && i.format.trim().length >= 3, `${p}/${i.id} has no format`);
      assert.ok(["file", "file_note", "confirm", "text"].includes(i.accepts), `${p}/${i.id} accepts=${i.accepts}`);
    }
  }
});

t("item ids are unique inside a built checklist", () => {
  for (const d of DELIVERABLES) {
    const list = buildChecklist(d.id);
    assert.equal(new Set(list.map((i) => i.id)).size, list.length, d.id);
  }
});

t("every checklist carries the five commercial questions", () => {
  for (const d of DELIVERABLES) {
    const ids = buildChecklist(d.id).map((i) => i.id);
    for (const c of ["c-contact", "c-po", "c-vat", "c-invoicing", "c-confidentiality"]) {
      assert.ok(ids.includes(c), `${d.id} is missing ${c}`);
    }
  }
});

t("a fresh checklist starts wholly outstanding", () => {
  const list = buildChecklist("feasibility");
  assert.equal(checklistState(list).settled, 0);
  assert.equal(checklistState(list).canStart, false);
});

t("every pack states when the clock starts", () => {
  for (const p of PACK_IDS) assert.ok(/clock starts/i.test(REQUIREMENT_PACKS[p].clockNote), p);
});

t("the feasibility pack names the two format rules that change the answer", () => {
  const text = REQUIREMENT_PACKS.feasibility.items.map((i) => i.format + " " + i.why).join(" ");
  assert.match(text, /CSV/);
  assert.match(text, /title block/);
  assert.match(text, /DWG/);
});

console.log("\nclientflow — checklist state\n");

t("'not held' settles an item exactly as 'supplied' does", () => {
  const list = buildChecklist("feasibility").map((i) => ({ ...i, state: "not_held", note: "does not exist" }));
  const s = checklistState(list);
  assert.equal(s.outstanding, 0);
  assert.equal(s.canStart, true);
  assert.equal(s.notHeldItems.length, list.length);
});

t("an optional item outstanding does not block the start", () => {
  const list = buildChecklist("feasibility").map((i) => (i.mandatory ? { ...i, state: "supplied" } : i));
  const s = checklistState(list);
  assert.equal(s.canStart, true);
  assert.ok(s.outstanding > 0, "the optional one is still shown as outstanding");
});

t("one mandatory item outstanding blocks the start and is named", () => {
  const list = buildChecklist("feasibility").map((i, n) => (n === 0 ? i : { ...i, state: "supplied" }));
  const s = checklistState(list);
  assert.equal(s.canStart, false);
  assert.equal(s.mandatoryOutstanding, 1);
  assert.equal(s.outstandingItems[0].title, list[0].title);
});

t("percent complete counts settled items, not supplied ones", () => {
  const list = buildChecklist("feasibility");
  list[0].state = "supplied"; list[1].state = "not_held";
  assert.equal(checklistState(list).settled, 2);
});

t("an empty checklist does not divide by zero", () => {
  assert.equal(checklistState([]).percent, 0);
});

console.log("\nclientflow — derived next action\n");

t("every stage produces a sentence for both audiences", () => {
  for (const s of STAGES) {
    const n = nextAction({ stage: s.id, checklist: [] });
    assert.ok(n.client.length > 5, s.id);
    assert.ok(n.internal.length > 5, s.id);
  }
});

t("the outstanding count reads correctly in the singular and the plural", () => {
  const one = buildChecklist("feasibility").map((i, n) => (n === 0 ? i : { ...i, state: "supplied" }));
  assert.match(nextAction({ stage: "information", checklist: one }).client, /One mandatory item outstanding\. Supply it,/);
  const many = buildChecklist("feasibility").map((i, n) => (n < 3 ? i : { ...i, state: "supplied" }));
  assert.match(nextAction({ stage: "information", checklist: many }).client, /3 mandatory items outstanding\. Supply them,/);
});

console.log("\nclientflow — decisions\n");

t("there are exactly three decisions and two of them demand a reason", () => {
  assert.deepEqual(DECISION_IDS.sort(), ["approved", "rejected", "review"]);
  assert.equal(DECISIONS.approved.requiresComment, false);
  assert.equal(DECISIONS.review.requiresComment, true);
  assert.equal(DECISIONS.rejected.requiresComment, true);
});

t("periods number themselves from what has already been issued", () => {
  assert.equal(nextPeriodLabel({ deliverables: [] }), "Month 1");
  assert.equal(nextPeriodLabel({ deliverables: [{ kind: "period" }, { kind: "period" }] }), "Month 3");
  assert.equal(nextPeriodLabel({ deliverables: [{ kind: "deliverable" }] }), "Month 1");
});

const total = pass + (process.exitCode ? 1 : 0);
console.log(`\n${pass} checks passed${process.exitCode ? " — with failures above" : ""}\n`);
