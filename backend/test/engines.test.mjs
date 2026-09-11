/**
 * The sixteen deterministic engines.
 *
 *   node backend/test/engines.test.mjs
 *
 * WHY THIS EXISTS. Sixteen agent slots across the seven engines were marked
 * planned, which meant the register described sixteen capabilities that did
 * not exist. That is the honest failure mode and it was working as intended.
 *
 * The dishonest one is what this suite is against: sixteen agents marked
 * BUILT whose briefs describe checks nothing performs. Every one of these is
 * an engine plus a generated brief, and the brief is generated FROM the
 * engine precisely so the two cannot drift — so what has to be tested is
 * that each engine actually refuses the thing its brief says it refuses.
 *
 * Each engine below is tested the same way: the good case is accepted, and
 * the specific contradiction the engine exists to catch is refused with a
 * reason that names it. A test that only proved the good case would pass
 * against an engine that accepts everything.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "etablix-eng-"));
process.env.ETABLIX_DATA_DIR = scratch;

const store = await import("../lib/store.js");
const watch = await import("../lib/l7/watch.js");
const reg = await import("../lib/engines/index.js");
const ob = await import("../lib/engines/obligation.js");
const notice = await import("../lib/engines/notice.js");
const change = await import("../lib/engines/change.js");
const est = await import("../lib/engines/estimating.js");
const sub = await import("../lib/engines/submission.js");
const prog = await import("../lib/engines/programme.js");
const rec = await import("../lib/engines/recovery.js");
const prod = await import("../lib/engines/productivity.js");
const safety = await import("../lib/engines/safety.js");
const audit = await import("../lib/engines/audit.js");
const model = await import("../lib/engines/model.js");
const qty = await import("../lib/engines/quantity.js");
const asset = await import("../lib/engines/asset.js");
const comm = await import("../lib/engines/commissioning.js");
const hand = await import("../lib/engines/handover.js");
const life = await import("../lib/engines/lifecycle.js");
const { AGENT_BRIEFS } = await import("../lib/ai.js");
const { AI_AGENTS, ENGINES: DOMAIN } = await import("../lib/organisation.js");
const { moment } = await import("../lib/engines/moment.js");

let pass = 0, fail = 0;
const ok = (c, m, x) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m + (x !== undefined ? "  → " + String(x).slice(0, 300) : ""))); };
const refuses = (r, needle, m) => ok(!r.ok && (r.faults || []).some((f) => f.includes(needle)), m, (r.faults || []).join(" | "));

const DAY = 86400000;
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const P = store.collection("projects")[0].id;

console.log("\n=== the sixteen engines ===\n");

console.log("--- the register and the briefs cannot drift\n");
{
  const cat = reg.catalogue();
  ok(cat.length === 16, `sixteen engines are registered (${cat.length})`);
  for (const e of cat) {
    ok(Boolean(AGENT_BRIEFS[e.id]), `${e.id} has a brief`);
    ok(typeof AGENT_BRIEFS[e.id]?.machine === "function", `${e.id}'s brief carries a machine hook, so the engine runs before the model`);
    ok(AI_AGENTS.some((a) => a.id === e.id), `${e.id} is in the agent register`);
    const slot = DOMAIN.flatMap((d) => d.agents.map((a) => ({ ...a, domain: d.id }))).find((a) => a.id === e.id);
    ok(slot?.state === "built", `${e.id} is placed in an engine and marked built`, slot?.state);
    ok(slot?.domain === e.engine, `${e.id} sits in the ${e.engine} engine in both places`, `${slot?.domain} vs ${e.engine}`);
    ok(slot?.depth === e.depth, `${e.id} claims the same depth in both`, `${slot?.depth} vs ${e.depth}`);
  }
  ok(cat.every((e) => e.depth <= 4), "and none of them claims level 5 or 6 — what was built is analysis and controlled workflow");
  ok(cat.every((e) => Object.keys(e.shape || {}).length > 0), "each publishes the record shape it reads, so an export can be written against it");
}

console.log("\n--- a run is refused before it starts when the records cannot be read\n");
{
  const r = reg.run("quantity", { records: "{not json" });
  ok(!r.ok && r.refused && /not readable as JSON/.test(r.reason), "unreadable records refuse the run", r.reason);
  const empty = reg.run("quantity", { records: "" });
  ok(!empty.ok && /nothing to compute/.test(empty.reason), "and so do no records at all — a report written anyway would rest on nothing", empty.reason);
  ok(!reg.run("nonesuch", {}).ok, "an unknown engine is refused");
  const hook = AGENT_BRIEFS.quantity.machine({ records: "{not json" });
  ok(hook?.stop === true, "the brief's machine hook stops the run rather than letting the model write anyway");
}

console.log("\n--- 15. the obligation monitor: what nothing is watching\n");
{
  watch.setContract({ project: P, form: "NEC4-A", by: "tester" });
  const r = ob.register(P);
  ok(r.ok && r.rows.length >= 4, `${r.rows.length} controlled obligations built from the contract, not from events`, r.reason);
  ok(r.rows.some((x) => x.timebar), "including at least one time bar");
  ok(r.rows.every((x) => x.method), "every row carries a communication method — a notice served the wrong way is not served");
  ok(r.unconfirmed === r.rows.length, "and every row is marked unconfirmed against the executed contract, because the skeleton is not the contract");

  const d = ob.dormant(P);
  ok(d.rows.length === r.rows.length, "with no events recorded, every obligation is dormant — nothing is watching any of them", d.say);
  ok(/TIME BARS/.test(d.say), "and the summary says the time bars are among them", d.say);

  watch.recordEvent({ project: P, event: "unforeseen_ground", awareAt: iso(Date.now() - 20 * DAY), by: "tester" });
  ok(ob.dormant(P).rows.length < r.rows.length, "recording an event takes its obligation off the dormant list");

  // The refusals.
  const base = { clause: "X 1.1", name: "A thing", party: "contractor", trigger: "t", action: "do the thing properly", method: "contract_system" };
  ok(ob.obligation(base).ok, "a complete obligation is admitted");
  refuses(ob.obligation({ ...base, timebar: true, consequence: "the right is lost" }), "TIME BAR with no period", "a time bar with no period is refused");
  refuses(ob.obligation({ ...base, period: 5, basis: "fortnights" }), "fortnights", "a period counted in a basis nothing recognises is refused");
  refuses(ob.obligation({ ...base, party: "the team" }), "no single responsible party", "\"the team\" is not an owner");
  refuses(ob.obligation({ ...base, method: null }), "no communication method", "a notice obligation with no route is refused");
  refuses(ob.obligation({ ...base, timebar: true, period: 8, basis: "week" }), "no stated consequence", "a time bar with no consequence is refused");
  // The correction: "both" is sometimes the contract.
  ok(ob.obligation({ ...base, party: "both", mutual: true, kind: "procedure" }).ok,
     "a MUTUAL duty is allowed — NEC4 early warning genuinely binds both parties, and refusing it would drop a real obligation");
  refuses(ob.obligation({ ...base, party: "both", mutual: true, timebar: true, period: 8, basis: "week", consequence: "lost" }), "mutual duty on a notice",
     "but never on a time bar: a right is lost by one party");
}

console.log("\n--- 16. the notice agent: it drafts, and there is no path that sends\n");
{
  const ev = watch.recordEvent({ project: P, event: "employer_instruction", awareAt: iso(Date.now() - 10 * DAY), by: "tester", detail: "PMI-0041" }).event;
  const d = notice.draft({ project: P, eventId: ev.id, kind: "claim", effect: "Piling suspended 9 days", relief: "time and cost", from: "J Nseya, Commercial Manager", to: "The Project Manager" });
  ok(d.ok && d.draft.complete, "a notice with every fact supplied is assembled complete", d.faults);
  ok(/^\d{4}-\d{2}-\d{2}$/.test(d.draft.deadline), "the deadline is a DAY, not a timestamp — a contract period has no time of day", d.draft.deadline);
  ok(d.draft.text.includes("DRAFT — NOT GIVEN"), "and the text says on its face that it has not been given");
  ok(!/Not yet barred/.test(d.draft.text), "the consequence in the draft is the clause, not the live dashboard status");
  ok(d.warnings.some((w) => /not been checked against the executed contract/.test(w)), "with the skeleton caveat on it");
  ok(d.draft.text.includes(store.collection("projects")[0].code), "and the project named by its code rather than by an internal id");

  const thin = notice.draft({ project: P, eventId: ev.id, kind: "claim" });
  ok(thin.ok && !thin.draft.complete && thin.gaps.length >= 4, "missing facts become marked gaps rather than plausible sentences", thin.gaps);
  ok(thin.draft.text.includes("[TO BE COMPLETED"), "printed in the draft, so an incomplete notice cannot be mistaken for a finished one");

  const late = watch.recordEvent({ project: P, event: "late_access", awareAt: iso(Date.now() - 200 * DAY), by: "tester" }).event;
  const l = notice.draft({ project: P, eventId: late.id, effect: "x", from: "y", to: "z" });
  ok(l.ok, "a notice whose period has expired is still drafted — a late notice is sometimes worth giving");
  ok(l.warnings.some((w) => /EXPIRED/.test(w)), "headed with the expiry, so nobody gives it without being told", l.warnings);

  ok(!notice.draft({ project: P, eventId: "nope", effect: "x" }).ok, "a notice about an event nobody recorded is refused");
  ok(!notice.draft({ project: "no-such-project", eventId: ev.id }).ok, "and so is one on a project with no contract");

  const byAgent = notice.recordGiven({ project: P, eventId: ev.id, clause: "NEC4-A 61.3", by: "Notice Agent", role: "agent", method: "contract_system", reference: "x" });
  refuses(byAgent, "is not a person", "recording an AGENT as having given a notice is refused — that record would be the evidence relied on");
  refuses(notice.recordGiven({ project: P, eventId: ev.id, clause: "c", by: "J Nseya" }), "no authority stated", "and a person with no stated authority is refused");
  refuses(notice.recordGiven({ project: P, eventId: ev.id, clause: "c", by: "J Nseya", role: "CM", method: "email_agreed" }), "no reference", "and with no transmission reference there is nothing to prove it arrived");
  ok(notice.recordGiven({ project: P, eventId: ev.id, clause: "NEC4-A 61.3", by: "J Nseya", role: "Commercial Manager, delegated", method: "contract_system", reference: "NEC-2291" }).ok,
     "a person, an authority, a method and a reference is recorded");
  const src = fs.readFileSync(new URL("../lib/engines/notice.js", import.meta.url), "utf8");
  ok(!/fetch\(|sendMail|transport|smtp/i.test(src), "and there is no code path in the module that transmits anything");
}

console.log("\n--- 17. change and entitlement: the claim nobody notified\n");
{
  const ev = watch.recordEvent({ project: P, event: "employer_instruction", awareAt: iso(Date.now() - 10 * DAY), by: "tester" }).event;
  const old = watch.recordEvent({ project: P, event: "employer_instruction", awareAt: iso(Date.now() - 200 * DAY), by: "tester" }).event;
  const base = {
    ref: "CE-014", title: "Additional welfare units, grid C", state: "claimed", relief: "both",
    instruction: "PMI-0041", instructedAt: iso(Date.now() - 60 * DAY), eventId: ev.id,
    notice: "NOT-0012", noticeAt: iso(Date.now() - 8 * DAY),
    value: 48000, days: 14, programmeImpact: "Welfare fit-out and the road sequence move 14 days", controlAccount: "CA-03",
    elements: [{ what: "Six units", value: 38000, basis: "measured against the activity schedule" }, { what: "Standing plant", value: 10000, basis: "the quoted day rate, 14 days" }],
  };
  ok(change.validateChange(base, { project: P }).ok, "a properly notified claim is accepted");
  refuses(change.validateChange({ ...base, notice: "", noticeAt: null }, { project: P }), "no notice referenced",
     "a claimed change on a barring contract with no notice is refused — the claim is defeated on one sentence");
  refuses(change.validateChange({ ...base, eventId: old.id, noticeAt: iso(Date.now() - 5 * DAY) }, { project: P }), "is not proof the notice was in time",
     "and a notice DATED AFTER THE BAR is refused — the reference is not taken as proof");
  refuses(change.validateChange({ ...base, value: 60000 }, { project: P }), "elements summing to", "a total that is not the sum of its elements is refused");
  refuses(change.validateChange({ ...base, elements: [{ what: "Six units", value: 48000, basis: "" }] }, { project: P }), "value with no basis", "a value with no basis is refused");
  refuses(change.validateChange({ ...base, programmeImpact: "" }, { project: P }), "no programme impact", "a claim for time with no programme impact is refused");
  refuses(change.validateChange({ ...base, state: "rejected" }, { project: P }), "no reason recorded", "a rejection with no reason is refused");
  const noProject = change.validateChange(base, {});
  ok(noProject.warnings.some((w) => /could not be checked against a contract/.test(w)), "and with no project the bar check says it could not be made rather than passing", noProject.warnings);

  const r = change.reconcile([base, { ...base, ref: "CE-015", state: "instructed", relief: "money", value: null, days: null, elements: [], programmeImpact: "", instructedAt: iso(Date.now() - 120 * DAY) }], { project: P });
  ok(r.stale.length === 1, "instructed change left unvalued past the working period is named", r.say);
}

console.log("\n--- 18. estimating: lineage on every number\n");
{
  const base = { id: "E-01", what: "Hardstanding sub-base", quantity: 2000, unit: "m2", rate: 38, total: 76000,
    source: "firm_quote", sourceDate: "2026-08-01", currency: "GBP", quantityBasis: "drawing C-102 rev D",
    productivity: "40 m2 per gang per day", validUntil: "2026-12-01", exclusions: ["remediation"],
    escalation: "fixed to 2027-03-31", confidence: "firm_quote", approvedBy: "J Nseya" };
  ok(est.priced(base, { asAt: "2026-09-11" }).ok, "a line with all ten lineage fields is accepted");
  ok(est.LINEAGE.length === 10, "ten lineage fields, from the register's own sentence");
  refuses(est.priced({ ...base, escalation: "" }, { asAt: "2026-09-11" }), "lineage missing", "a line missing one of the ten is refused, not priced low");
  refuses(est.priced({ ...base, source: "allowance", confidence: "firm_quote" }, { asAt: "2026-09-11" }), "supports at most",
     "confidence claimed above its own source is refused — that is how an estimate hardens without anybody deciding to");
  refuses(est.priced({ ...base, validUntil: "2026-01-01" }, { asAt: "2026-09-11" }), "expired", "a line resting on an expired quotation is refused");
  refuses(est.priced({ ...base, total: 80000 }, { asAt: "2026-09-11" }), "stated as 80000", "a stored total that is not its own calculation is refused");
  refuses(est.priced({ ...base, productivityCheck: { outputPerCrewPerDay: 40, crews: 2, days: 10 } }, { asAt: "2026-09-11" }), "does not produce the quantity in the time",
     "a productivity assumption that cannot reach the quantity is refused — the rate is wrong rather than optimistic");
  ok(est.priced({ ...base, productivityCheck: { outputPerCrewPerDay: 40, crews: 5, days: 10 } }, { asAt: "2026-09-11" }).ok, "and one that can is accepted");

  const s = est.price({ lines: [base, { ...base, id: "E-02", escalation: "" }], asAt: "2026-09-11" });
  ok(s.refused.length === 1 && s.refused[0].id === "E-02", "a refused line is reported against ITS OWN reference", JSON.stringify(s.refused));
  ok(/understated/.test(s.say), "and the total says it is understated rather than quietly excluding the line", s.say);
}

console.log("\n--- 19. the submission controller: the administrative rejections\n");
{
  const good = {
    deadline: "2026-10-15", convention: "ETX-{ref}-{doc}-{rev}.pdf",
    slots: [{ id: "S1" }, { id: "S2" }],
    artefacts: [
      { name: "ETX-2401-FOT-A.pdf", slot: "S1", needsSignature: true, signedBy: "J Nseya" },
      { name: "ETX-2401-MS-A.pdf", slot: "S2", pages: 8, pageLimit: 10 },
    ],
    fields: [{ name: "companyNumber", required: true, value: "14892331" }],
    facts: [{ fact: "EL limit", value: "10000000", where: "the form of tender" }, { fact: "EL limit", value: "10000000", where: "the insurances" }],
    tenderedPrice: 1284500, pricingSchedulePrice: 1284500,
  };
  const clean = sub.check(good);
  ok(clean.ok && /READY TO UPLOAD/.test(clean.verdict), "a clean submission reads READY TO UPLOAD", clean.findings);

  const id = (r, k) => r.findings.find((f) => f.id === k);
  ok(id(sub.check({ ...good, fields: [{ name: "sic", required: true, value: "" }] }), "mandatory_fields"), "a blank mandatory field is caught");
  const named = sub.check({ ...good, artefacts: [good.artefacts[0], { name: "method statement final.docx", slot: "S2", pages: 14, pageLimit: 10 }] });
  const art = id(named, "artefacts");
  ok(art.rows[0].name === "method statement final.docx",
     "a filename finding is reported against THE FILE IT IS ABOUT — mapping after filtering attached it to the wrong file", JSON.stringify(art.rows[0].name));
  ok(art.rows[0].faults.some((f) => /does not match the required form/.test(f)), "the naming convention is checked");
  ok(art.rows[0].faults.some((f) => /are not read/.test(f)), "and so is the page limit — the last pages are not marked down, they are not read");
  ok(id(sub.check({ ...good, tenderedPrice: 1284500, pricingSchedulePrice: 1280000 }), "price_agreement"), "the price in two places is compared");
  ok(id(sub.check({ ...good, facts: [{ fact: "EL limit", value: "10000000", where: "a" }, { fact: "EL limit", value: "5000000", where: "b" }] }), "contradictions"), "a fact stated two ways is caught");
  ok(id(sub.check({ ...good, slots: [{ id: "S1" }, { id: "S2" }, { id: "S3", name: "Insurances" }] }), "portal_completeness"), "an empty upload slot is caught");
  const cert = sub.check({ ...good, artefacts: [{ ...good.artefacts[0], expires: "2026-10-13" }, good.artefacts[1]] });
  ok(id(cert, "artefacts").rows[0].faults.some((f) => /before the submission deadline/.test(f)),
     "and a certificate is tested against the DEADLINE, not against today");
}

console.log("\n--- 20. the programme: interrogated, not drawn\n");
{
  const r = prog.interrogate({
    dataDate: "2026-09-11", completion: "2026-10-25",
    activities: [
      { id: "A1", name: "Set-up", kind: "construction", start: "2026-09-01", end: "2026-09-20", duration: 20, successors: ["A2"], critical: true, quantity: 1, outputPerCrewPerDay: 1, crews: 1 },
      { id: "A2", name: "Sub-base", kind: "construction", start: "2026-09-21", end: "2026-10-10", duration: 20, predecessors: ["A1"], successors: ["A4"], critical: true, quantity: 2000, unit: "m2", outputPerCrewPerDay: 40, crews: 1 },
      { id: "P1", name: "Order modules", kind: "procurement", start: "2026-09-05", end: "2026-12-05", duration: 90, float: -5 },
      { id: "A4", name: "Install", kind: "installation", start: "2026-10-11", end: "2026-11-01", duration: 20, predecessors: ["A2"], critical: true, quantity: 12, unit: "nr", outputPerCrewPerDay: 1, crews: 1 },
      { id: "Z9", name: "Orphan", kind: "construction", start: "2026-11-05", end: "2026-11-06", duration: 1, constraint: "Must start on 2026-11-05" },
    ],
  });
  const has = (k) => r.findings.some((f) => f.id === k);
  ok(has("procurement_disconnected"), "procurement with no path to installation — a late order moves the date on site and not on the programme");
  ok(has("negative_float"), "hidden negative float");
  ok(has("date_typed_not_driven"), "an activity after the data date with nothing driving it");
  ok(has("unsupported_duration"), "a duration whose arithmetic does not reach the quantity");
  ok(has("unsourced_lead_time"), "a procurement lead time with nothing recording who quoted it");
  ok(has("constraint_masking"), "a hard constraint holding a date steady");
  ok(has("completion_unsupported"), "and a declared completion earlier than the programme's own last activity");
  ok(!has("logic_loop"), "no loop is reported where there is none");

  const loop = prog.interrogate({ activities: [
    { id: "A", name: "A", duration: 1, successors: ["B"] }, { id: "B", name: "B", duration: 1, successors: ["A"] },
  ] });
  ok(loop.findings.some((f) => f.id === "logic_loop"), "a loop IS reported where there is one");
  const dangling = prog.interrogate({ activities: [{ id: "A", name: "A", duration: 1, predecessors: ["GHOST"] }] });
  ok(dangling.findings.some((f) => f.id === "dangling_links"), "a link to an activity that is not in the programme is reported — it looks like logic");
  ok(prog.state().generates === false, "and the engine says plainly that it does not generate a programme");
}

console.log("\n--- 21. recovery: the baseline that moved\n");
{
  const moved = rec.analyse({ baselineAtAward: "REV-A/412", baselineAnalysed: "REV-C/431", options: [] });
  ok(moved.refused && /not the same programme/.test(moved.reason), "a moved baseline REFUSES the analysis outright", moved.reason);
  ok(/no claim to measure/.test(moved.reason), "and says why it matters", moved.reason);
  ok(!rec.analyse({ baselineAtAward: null, baselineAnalysed: "REV-A", options: [] }).ok, "so does no baseline recorded at award");

  const r = rec.analyse({
    baselineAtAward: "REV-A/412", baselineAnalysed: "REV-A/412",
    plannedCompletion: "2026-11-01", forecastCompletion: "2026-11-29", delayDays: 20, remainingDays: 60,
    options: [
      { id: "R1", lever: "overtime", recovers: 12, cost: 84000, resourceChange: "Saturdays, 2 crews", risk: "Output falls after week three" },
      { id: "R2", lever: "additional_resource", recovers: 28, cost: 150000, resourceChange: "2 extra crews", risk: "No room on the face" },
      { id: "R3", lever: "resequence", recovers: 9, cost: 0, risk: "Needs the client to agree" },
      { id: "R4", lever: "descope", recovers: 14, cost: 0, risk: "x" },
      { id: "R5", lever: "shift_working", recovers: 10, cost: null, risk: "x" },
    ],
  });
  ok(r.notes.some((n) => /disagrees with its own dates/.test(n)), "a stated delay that disagrees with its own dates is reported and the dates used", r.notes);
  ok(r.delayDays === 28, "the delay is computed from the dates", r.delayDays);
  ok(r.options[0].id === "R3", "the options are ranked by cost per day recovered", r.options.map((o) => o.id));
  ok(r.rejected.some((x) => x.id === "R5" && x.faults.some((f) => /no cost/.test(f))), "an option with no cost is refused — it is a suggestion, not an option");
  ok(r.rejected.some((x) => x.id === "R4" && x.faults.some((f) => /not marked as descoping/.test(f))), "and time bought by removing work must say so");
  ok(/cheapest single option that covers it/.test(r.verdict), "and where one option covers the delay, that one is named", r.verdict);

  // The no-summing rule only has something to say when no single option
  // covers the delay, so it is tested where it applies.
  const short = rec.analyse({
    baselineAtAward: "REV-A/412", baselineAnalysed: "REV-A/412",
    plannedCompletion: "2026-11-01", forecastCompletion: "2026-11-16", remainingDays: 90,
    options: [
      { id: "S1", lever: "overtime", recovers: 8, cost: 40000, resourceChange: "Saturdays", risk: "fatigue" },
      { id: "S2", lever: "resequence", recovers: 9, cost: 0, risk: "client agreement" },
    ],
  });
  ok(/do not sum/.test(short.verdict),
     "where no single option covers it, the options are NOT added together — overtime and extra crews on one working face do not sum", short.verdict);
  const hopeless = rec.analyse({
    baselineAtAward: "A", baselineAnalysed: "A", plannedCompletion: "2026-11-01", forecastCompletion: "2027-02-01", remainingDays: 200,
    options: [{ id: "H1", lever: "resequence", recovers: 5, cost: 0, risk: "x" }],
  });
  ok(/whose time it is/.test(hopeless.verdict), "and where nothing reaches it, the verdict says the date moves and asks whose time it is", hopeless.verdict);
}

console.log("\n--- 22. productivity: units with no hours, and hours with no units\n");
{
  const accounts = [{ id: "CA-01", unit: "m2", quantity: 2000, hours: 400, rate: 32 }, { id: "CA-03", unit: "m", quantity: 800, hours: 200, rate: 30 }];
  const r = prod.analyse({ accounts, asAt: "2026-09-11", records: [
    { controlAccount: "CA-01", from: "2026-08-03", to: "2026-08-28", units: 900, hours: 260, unit: "m2", cumulativeUnits: 900 },
    { controlAccount: "CA-09", from: "2026-08-03", to: "2026-08-28", units: 10, hours: 10, unit: "m" },
    { controlAccount: "CA-01", from: "2026-09-01", to: "2026-09-05", units: 40, hours: 0, unit: "m2" },
    { controlAccount: "CA-03", from: "2026-08-03", to: "2026-08-28", units: 100, hours: 30, unit: "m2" },
  ] });
  const row = r.rows.find((x) => x.controlAccount === "CA-01");
  ok(row.factor === 0.692, "the factor is achieved output over priced output", row.factor);
  ok(row.varianceCost > 0 && row.forecastHours > row.budgetHours, "and it forecasts the overrun in hours and money", `${row.forecastHours} vs ${row.budgetHours}`);
  ok(r.rejected.some((x) => x.controlAccount === "CA-09"), "a control account that is not in the budget is refused");
  ok(r.rejected.some((x) => x.faults.some((f) => /Free work has not happened/.test(f))), "units complete with no hours booked is refused");
  ok(r.rejected.some((x) => x.faults.some((f) => /priced in m/.test(f))), "and a unit that changed between the budget and the measure is refused");
  ok(r.unmeasured.includes("CA-03"), "an account with budgeted hours and no valid measurement is NAMED rather than omitted", r.unmeasured);
  ok(/assumption, stated as one/.test(r.say), "and the forecast is labelled an assumption", r.say);
}

console.log("\n--- 23. safety: it administers, and says so\n");
{
  const r = safety.assure({
    asAt: "2026-09-11",
    planned: [{ activity: "EXC-02", date: "2026-09-14" }, { activity: "HOT-01", date: "2026-09-15" }],
    rams: [{ id: "RAMS-11", covers: ["EXC-02"], reviewedTo: "2026-09-30", approvedBy: "R Aliu" }],
    permits: [
      { id: "PTW-204", kind: "hot_works", from: "2026-09-11", to: "2026-09-12", workTo: "2026-09-14", issuedBy: "M Feld" },
      { id: "PTW-198", kind: "excavation", from: "2026-08-01", to: "2026-09-01", issuedBy: "M Feld" },
    ],
    assignments: [{ person: "A Smith", activity: "EXC-02", date: "2026-09-14", requires: ["CPCS-A58", "EUSR-CAT"] }],
    held: [{ person: "A Smith", ticket: "CPCS-A58", expires: "2026-09-01" }, { person: "A Smith", ticket: "SSSTS", expires: "" }],
    observations: [
      { id: "OB-1", kind: "housekeeping", location: "gate 2", raisedAt: "2026-08-01", status: "closed", action: "cleared" },
      { id: "OB-2", kind: "housekeeping", location: "gate 2", raisedAt: "2026-08-20", status: "closed", action: "cleared" },
      { id: "OB-3", kind: "housekeeping", location: "gate 2", raisedAt: "2026-09-05", status: "closed" },
    ],
  });
  ok(r.coverage.findings.some((f) => f.activity === "HOT-01"), "planned work with no RAMS covering it is found");
  ok(r.permits.findings.some((f) => /work planned to/.test(f.why)), "a permit expiring during the work it covers is found — issued Friday, work running to Saturday");
  ok(r.permits.findings.some((f) => /expired/.test(f.why)), "and an expired permit still open");
  ok(r.training.findings.some((f) => /expired/.test(f.why)), "a ticket out of date on the day of the work");
  ok(r.training.undated.some((f) => f.ticket === "SSSTS"), "and one recorded with no expiry at all, which is recorded as permanent");
  ok(r.observations.recurring.length === 1, "three of the same condition in ninety days is ONE uncontrolled condition");
  ok(r.observations.closedEmpty.some((f) => f.id === "OB-3"), "and an observation closed with no action");
  const clean = safety.assure({ asAt: "2026-09-11" });
  ok(clean.ok && /not a statement about whether the site is safe/.test(clean.say),
     "a clean result explicitly refuses to say the site is safe", clean.say);
  ok(safety.state().supervises === false && safety.state().assessesCompetence === false, "and the engine declares that it neither supervises nor assesses competence");
}

console.log("\n--- 24. the audit programme: marking its own homework\n");
{
  const r = audit.programme({
    asAt: "2026-09-11", cycleFrom: "2026-01-01", cycleTo: "2026-12-31",
    standardClauses: ["4.1", "8.1", "9.2"],
    audits: [
      { id: "A-01", area: "Commercial", state: "reported", auditor: "R Aliu", auditorArea: "Quality", plannedFor: "2026-03-01", carriedOut: "2026-03-04", clauses: ["8.1"] },
      { id: "A-02", area: "Quality", state: "reported", auditor: "R Aliu", auditorArea: "Quality", plannedFor: "2026-05-01", carriedOut: "2026-05-06", clauses: ["9.2"] },
      { id: "A-03", area: "Delivery", state: "planned", auditor: "M Feld", auditorArea: "Commercial", plannedFor: "2026-07-01" },
    ],
    findings: [
      { id: "F-01", audit: "A-01", grade: "major", owner: "M Feld", raisedAt: "2026-03-06", status: "closed", evidence: "Procedure rev C", closedBy: "M Feld", closedAt: "2026-04-01" },
      { id: "F-02", audit: "A-01", grade: "minor", owner: "M Feld", raisedAt: "2026-03-06", status: "open" },
    ],
  });
  ok(r.rejectedAudits.some((a) => a.id === "A-02" && a.faults.some((f) => /belongs to the area being audited/.test(f))), "an auditor auditing their own area is refused");
  ok(r.rejectedFindings.some((f) => f.id === "F-01" && f.faults.some((x) => /closed by its own owner/.test(x))), "a finding closed by its own owner with no verifier is refused");
  ok(r.rejectedFindings.some((f) => f.id === "F-01" && f.faults.some((x) => /MAJOR closed with no root cause/.test(x))), "and a major closed with no root cause");
  ok(r.notCarriedOut.some((a) => a.id === "A-03"), "an audit past its planned date and still \"planned\" is named");
  ok(r.overdue.some((f) => f.id === "F-02"),
     "a minor open 189 days against a 60-day period is overdue — and it only reports so because the machine instant is read as a number", JSON.stringify(r.overdue));
  ok(r.uncovered.includes("4.1"), "a clause of the standard not audited in the cycle is named");
}

console.log("\n--- 25. model validation: units and coordinates first\n");
{
  const r = model.validate({
    requiredUnit: "mm", projectBasePoint: "OSGB36/1000,2000,0", stage: "3", naming: "ETX-{originator}-{volume}-{level}-{type}-{number}",
    models: [{ id: "ARC", unit: "mm", basePoint: "OSGB36/1000,2000,0" }, { id: "MEP", unit: "m", basePoint: "0,0,0" }],
    elements: [
      { id: "E1", name: "ETX-AAA-ZZ-01-M3-0001", classification: "Ss_25_10", level: 3, hostLevel: "L01", type: "door", x: 1, y: 2, z: 0 },
      { id: "E2", name: "wall thing", classification: "", level: 5, x: 1, y: 2, z: 0, type: "door" },
    ],
  });
  const has = (k) => r.findings.some((f) => f.id === k);
  ok(has("units"), "a model in the wrong unit is found — it looks identical on screen");
  ok(has("coordinates"), "a model off the shared coordinates is found — its clash report comes back clean");
  ok(has("naming") && has("classification") && has("over_developed") && has("duplicates") && has("orphans"), "and the other five checks fire");
  ok(/nothing should be taken off this model/.test(r.verdict), "with the verdict saying nothing should be taken off it until units and coordinates are fixed", r.verdict);
  const clean = model.validate({ requiredUnit: "mm", models: [{ id: "ARC", unit: "mm" }], elements: [{ id: "E1", classification: "Ss", hostLevel: "L01", type: "d", x: 1, y: 1, z: 1 }] });
  ok(clean.ok && /says nothing about whether the design is any good/.test(clean.verdict), "and a clean result refuses to comment on the design");
}

console.log("\n--- 26. quantities: the disagreement IS the output\n");
{
  const r = qty.compare({ rows: [
    { item: "B-101", source: "model", unit: "m2", quantity: 2100, rate: 38 },
    { item: "B-101", source: "bill", unit: "m2", quantity: 2000, rate: 38 },
    { item: "B-101", source: "drawing", unit: "m2", quantity: 2050, rate: 38 },
    { item: "B-102", source: "model", unit: "m", quantity: 400, rate: 120 },
    { item: "B-102", source: "bill", unit: "m2", quantity: 400, rate: 120 },
    { item: "B-103", source: "model", unit: "nr", quantity: 12, rate: 900 },
  ] });
  ok(r.disagreements.length === 1 && r.disagreements[0].item === "B-101", "the disagreeing item is reported");
  ok(r.disagreements[0].governedBy === "bill", "governed by the bill, because on a measured contract it is a contract document");
  ok(r.disagreements[0].worth === 3800, "ranked by what the disagreement is worth rather than by percentage", r.disagreements[0].worth);
  ok(r.unitClashes.length === 1, "an item measured in two different units is NOT compared");
  ok(r.missing.some((m) => m.item === "B-103" && /not paid for/.test(m.why)), "and an item in the model and not the bill is named as work being built and not paid for");
  ok(r.governingTotal === null && /would hide exactly the thing/.test(r.governingTotalWithheld),
     "no single blended figure is produced while the sources disagree", r.governingTotalWithheld);
  const agree = qty.compare({ rows: [
    { item: "B-1", source: "model", unit: "m2", quantity: 100, rate: 10 },
    { item: "B-1", source: "bill", unit: "m2", quantity: 100, rate: 10 },
    { item: "B-1", source: "drawing", unit: "m2", quantity: 100, rate: 10 },
  ] });
  ok(agree.governingTotal === 100, "and where they agree there is a total, because there is nothing to hide", agree.governingTotal);
}

console.log("\n--- 27. the asset register\n");
{
  const r = asset.register({
    asAt: "2026-09-11", convention: "{system}-{type}-{number}", requiredByType: { pump: ["duty"], damper: ["fireRating"] },
    assets: [
      { tag: "CHW-PMP-001", type: "pump", system: "CHW", location: "Plantroom 1", manufacturer: "X", model: "Y", serial: "S1", installedAt: "2025-06-01", warrantyTo: "2027-06-01", expectedLifeYears: 20, duty: "12 l/s" },
      { tag: "CHW-PMP-001", type: "pump", system: "CHW", location: "Plantroom 1", duty: "12 l/s" },
      { tag: "plant 3", type: "damper", system: "", location: "", parent: "AHU-001" },
    ],
  });
  ok(r.duplicates.some((d) => d.tag === "CHW-PMP-001"), "a duplicated tag is found — one maintenance history for two machines");
  ok(r.rejected.some((a) => a.faults.some((f) => /does not match the tagging convention/.test(f))), "a tag that does not match the convention is refused");
  ok(r.rejected.some((a) => a.faults.some((f) => /no system and no location/.test(f))), "an asset that cannot be found is refused");
  ok(r.rejected.some((a) => a.faults.some((f) => /requires fireRating/.test(f))), "and a type-specific attribute is required per type");
  ok(r.orphans.some((o) => o.parent === "AHU-001"), "a child whose parent is not in the register is named — a machine nobody isolates");
  ok(typeof r.completeness === "number", "and completeness is measured across the ten core attributes", r.completeness);
}

console.log("\n--- 28. commissioning: the order is the safety\n");
{
  const r = comm.programme({ asAt: "2026-09-11", handoverDate: "2026-10-15", systems: [
    { system: "CHW", installer: "Acme M&E", stages: {
        installed: { complete: true, at: "2026-06-01" }, static: { complete: true, at: "2026-06-20" },
        set_to_work: { complete: true, at: "2026-07-01" }, regulated: { complete: true, at: "2026-07-10" },
        performance: { complete: true, at: "2026-07-20", witness: "Acme M&E" } },
      tests: [{ name: "Flow at index terminal", criterion: "12 l/s ± 0.5", result: 13.4, target: 12, tolerance: 0.5, passed: true }] },
    { system: "VEN", installer: "Acme M&E", stages: { installed: { complete: true, at: "2026-06-01" }, regulated: { complete: true, at: "2026-06-15" } } },
  ] });
  ok(r.rejected.some((s) => s.system === "VEN" && s.faults.some((f) => /balanced on air/.test(f))), "a stage complete while a stage before it is not is refused");
  ok(r.rejected.some((s) => s.system === "CHW" && s.faults.some((f) => /who installed it/.test(f))), "a witness who did the work is not a witness");
  ok(r.rejected.some((s) => s.system === "CHW" && s.faults.some((f) => /outside its own criterion and is recorded as a PASS/.test(f))), "and a result outside its own criterion recorded as a pass is refused");
  ok(/not forecast at all/.test(r.say), "a system whose record is inadmissible is not forecast, and the summary says so rather than reassuring", r.say);

  const dated = comm.systemRecord({ system: "X", installer: "A", stages: {
    installed: { complete: true, at: "2026-06-10" }, static: { complete: true, at: "2026-06-01" } } });
  ok(!dated.ok && dated.faults.some((f) => /before/.test(f)), "out-of-order DATES are caught too, which is the harder version to see");
}

console.log("\n--- 29. handover: two numbers, and the slowest missing thing\n");
{
  const full = {};
  for (const e of hand.EVIDENCE) full[e.key] = { complete: true, ref: `DOC-${e.key}` };
  const r = hand.forecast({ asAt: "2026-09-11", handoverDate: "2026-10-15", defectsByAsset: { "A2": 3 }, assets: [
    { tag: "A1", evidence: full },
    { tag: "A2", evidence: { ...full, spares: undefined, defects: { complete: true, ref: "D1" } } },
    { tag: "A3", evidence: { submittal: { complete: true, ref: "S1" }, approval: { complete: true } } },
    { tag: "A4", evidence: { ...full, certification: { complete: true, ref: "C1", expires: "2026-10-01" } } },
  ] });
  ok(hand.EVIDENCE.length === 12, "twelve evidence types, from the register's own list");
  ok(r.documentShare > r.assetShare, "the share of documents held is higher than the share of ASSETS complete — which is the whole point", `${r.documentShare} vs ${r.assetShare}`);
  ok(r.faulty.some((f) => f.tag === "A3" && f.faults.some((x) => /no document reference/.test(x))), "a tick with nothing behind it is caught");
  ok(r.faulty.some((f) => f.tag === "A2" && f.faults.some((x) => /defect\(s\) still open/.test(x))), "a defect closure ticked with defects open is caught");
  ok(r.faulty.some((f) => f.tag === "A4" && f.faults.some((x) => /before handover/.test(x))), "and a certificate expiring before handover");
  ok(r.willMiss.every((a) => a.slowestMissing), "the forecast names the SLOWEST missing item rather than counting them", JSON.stringify(r.willMiss));
  ok(/Chasing these harder does not make them arrive sooner/.test(r.say), "and what is waiting on somebody else is separated out", r.say);
}

console.log("\n--- 30. lifecycle: a model with no inflation in it\n");
{
  const r = life.plan({ asAt: "2026-09-11", lines: [
    { tag: "A", expectedLifeYears: 15, replacementCycleYears: 15, firstReplacementYear: 15, replacementCost: 18000, basis: "like for like", priceBaseDate: "2026-01-01", currency: "GBP", source: "Manufacturer quote" },
    { tag: "B", expectedLifeYears: 20, replacementCycleYears: 7, firstReplacementYear: 7, replacementCost: 42000, basis: "supply and install", priceBaseDate: "2026-01-01", currency: "GBP", source: "Price book" },
    { tag: "C", expectedLifeYears: 15, replacementCycleYears: 20, firstReplacementYear: 20, replacementCost: 9000, basis: "x", priceBaseDate: "2026-01-01", currency: "GBP", source: "y" },
    { tag: "D", expectedLifeYears: 10, replacementCycleYears: 10, firstReplacementYear: 10, replacementCost: 5000 },
  ] });
  ok(r.rejected.some((l) => l.tag === "D" && l.faults.some((f) => /world with no inflation/.test(f))), "a cost that cannot be escalated is refused");
  ok(r.rejected.some((l) => l.tag === "C" && l.faults.some((f) => /past its life/.test(f))), "an expected life that does not reach its own first replacement is refused");
  const b = r.lines.find((l) => l.tag === "B");
  ok(b.occurrences.join(",") === "7,14,21", "replacements are counted over the period rather than divided", b.occurrences);
  ok(r.profile.length === 4 && r.peakYear.year === 7, "the profile is year by year, with the peak named", JSON.stringify(r.peakYear));
  const mixed = life.plan({ lines: [
    { tag: "A", expectedLifeYears: 10, replacementCycleYears: 10, firstReplacementYear: 10, replacementCost: 1, basis: "x", priceBaseDate: "2026-01-01", currency: "GBP", source: "y" },
    { tag: "B", expectedLifeYears: 10, replacementCycleYears: 10, firstReplacementYear: 10, replacementCost: 1, basis: "x", priceBaseDate: "2026-01-01", currency: "EUR", source: "y" },
  ] });
  ok(!mixed.comparable && /no meaning/.test(mixed.say), "and lines in two currencies are not totalled — that total is the number that goes into a sinking fund", mixed.say);
}

console.log("\n--- the machine instant, named once\n");
{
  ok(moment(1757580000000) === 1757580000000, "epoch milliseconds are read as a moment");
  ok(moment("2026-09-11") !== null, "and so is an ISO day");
  ok(moment("annual") === null, "a description of a date is still refused");
  ok(moment(null, 42) === 42, "and a fallback is honoured");
  // The bug this was extracted for: a number passed to the strict reader
  // returned null, and the audit programme silently reported nothing overdue.
  const r = audit.programme({ asAt: Date.now(), standardClauses: [], audits: [], findings: [
    { id: "F", audit: "A", grade: "minor", owner: "x", raisedAt: iso(Date.now() - 200 * DAY), status: "open" },
  ] });
  ok(r.overdue.length === 1, "an asAt given as a NUMBER still computes overdue — the fourth occurrence of this bug is what the helper is for");
}

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
fs.rmSync(scratch, { recursive: true, force: true });
process.exit(fail ? 1 : 0);
