/**
 * THE PROGRAMME FOR PRODUCING THE BID.
 *
 * Every bid has a delivery programme. Almost none has one for its own
 * production, and the failure is always the same shape: every individual
 * deadline met except the ones nobody wrote down.
 */
import { checkBidProgramme, programmeNotes, daysBetween, ACTIVITIES, ORDER } from "../lib/l7/bidprogramme.js";

let pass = 0, fail = 0;
const ok = (c, m, saw) => {
  if (c) { pass++; console.log(`  ✓ ${m}`); }
  else { fail++; console.log(`  ✗ ${m}${saw !== undefined ? `\n      saw: ${JSON.stringify(saw).slice(0, 300)}` : ""}`); }
};

const A = (date, owner = "J Nseya") => ({ date, owner });
const GOOD = {
  enquiries: A("2026-11-09"), returns: A("2026-11-20"), surveys: A("2026-11-18"),
  clarifications: A("2026-11-25"), design: A("2026-11-24"), estimate: A("2026-11-30"),
  review: A("2026-12-01"), settlement: A("2026-12-03"), signature: A("2026-12-04"),
  internal: A("2026-12-10"),
};

console.log("\n=== a plan that holds ===\n");
{
  const r = checkBidProgramme({ activities: GOOD, buyerDeadline: "2026-12-16" });
  ok(r.ok, "every activity dated, owned and in order", r);
  ok(r.contingency.ok && r.contingency.days === 6, "with six days between the internal deadline and the buyer's", r.contingency);
  ok(programmeNotes(r).length === 0, "and no notes");
  ok(r.planned === ACTIVITIES.length, "all ten activities planned", r.planned);
}

console.log("\n=== the contingency that is the bid's only real protection ===\n");
{
  const r = checkBidProgramme({ activities: { ...GOOD, internal: A("2026-12-16") }, buyerDeadline: "2026-12-16" });
  ok(!r.contingency.ok && r.contingency.days === 0,
     "PLANNED TO LAND AT THE BUYER'S MINUTE — the portal failure happens on the last day and never on the others", r.contingency);
}
{
  const r = checkBidProgramme({ activities: { ...GOOD, internal: A("2026-12-18") }, buyerDeadline: "2026-12-16" });
  ok(r.contingency.days === -2 && /AFTER the buyer/.test(r.contingency.say),
     "an internal deadline after the buyer's is a plan to submit late", r.contingency.say);
}
{
  const r = checkBidProgramme({ activities: GOOD, buyerDeadline: "as soon as possible" });
  ok(!r.contingency.ok && /not a date/.test(r.contingency.say),
     "and a buyer deadline that is not a date leaves nothing to work back from", r.contingency.say);
}
{
  const { internal, ...noInternal } = GOOD;
  const r = checkBidProgramme({ activities: noInternal, buyerDeadline: "2026-12-16" });
  ok(/no internal submission deadline/.test(r.contingency.say),
     "no internal deadline at all is the commonest version of the same thing", r.contingency.say);
}

console.log("\n=== order is a constraint, not a preference ===\n");
{
  const r = checkBidProgramme({ activities: { ...GOOD, estimate: A("2026-12-05") }, buyerDeadline: "2026-12-16" });
  const f = r.outOfOrder.find((x) => x.first === "estimate" && x.second === "settlement");
  ok(Boolean(f), "AN ESTIMATE THAT FREEZES AFTER SETTLEMENT WAS NOT WHAT SETTLEMENT APPROVED", r.outOfOrder);
  ok(/was not what settlement approved/.test(programmeNotes(r).join(" ")), "and the note says why it matters");
}
{
  const r = checkBidProgramme({ activities: { ...GOOD, returns: A("2026-11-05") }, buyerDeadline: "2026-12-16" });
  ok(r.outOfOrder.some((x) => x.first === "enquiries" && x.second === "returns"),
     "an enquiry cannot be returned before it is issued", r.outOfOrder);
}
{
  const r = checkBidProgramme({ activities: { ...GOOD, signature: A("2026-12-02") }, buyerDeadline: "2026-12-16" });
  ok(r.outOfOrder.some((x) => x.second === "signature"),
     "a signature before settlement authorises a price nobody set", r.outOfOrder);
}
ok(ORDER.length === 9, "nine ordering constraints", ORDER.length);

console.log("\n=== an activity with no owner happens to nobody ===\n");
{
  const r = checkBidProgramme({ activities: { ...GOOD, returns: A("2026-11-20", "Commercial") }, buyerDeadline: "2026-12-16" });
  ok(r.unowned.length === 1 && r.unowned[0].owner === "Commercial",
     "A DEPARTMENT IS NOT A PERSON — it cannot be telephoned on the Friday the return is late", r.unowned);
}
{
  const r = checkBidProgramme({ activities: { ...GOOD, review: A("2026-12-01", "TBC") }, buyerDeadline: "2026-12-16" });
  ok(r.unowned.length === 1, "and neither is TBC", r.unowned);
}

console.log("\n=== what is missing, and what is not a date ===\n");
{
  const { surveys, ...noSurveys } = GOOD;
  const r = checkBidProgramme({ activities: noSurveys, buyerDeadline: "2026-12-16" });
  ok(r.missing.length === 1 && /Surveys/.test(r.missing[0]), "an activity with no line on the plan is reported", r.missing);
  ok(r.outOfOrder.every((x) => x.first !== "surveys"),
     "and it is not also reported as out of order — one fault, named once", r.outOfOrder);
}
{
  const r = checkBidProgramme({ activities: { ...GOOD, review: A("before settlement") }, buyerDeadline: "2026-12-16" });
  ok(r.unreadableDates.length === 1, "'before settlement' is a relationship, not a date", r.unreadableDates);
}

console.log("\n=== a plan whose activities are behind it is a record ===\n");
{
  const r = checkBidProgramme({ activities: GOOD, buyerDeadline: "2026-12-16", today: "2026-11-21" });
  ok(r.overdue.length === 3, "three activities already passed on that date", r.overdue.map((x) => x.activity));
  ok(/not a plan/.test(programmeNotes(r).join(" ")), "and the note says what that makes it");
}
{
  const r = checkBidProgramme({ activities: GOOD, buyerDeadline: "2026-12-16" });
  ok(r.overdue.length === 0, "with no reference date nothing is overdue — it does not guess at today", r.overdue);
}

console.log("\n=== the arithmetic ===\n");
ok(daysBetween("2026-11-09", "2026-11-20") === 11, "eleven days");
ok(daysBetween("2026-11-20", "2026-11-09") === -11, "and backwards is negative, which is how order is tested");
ok(daysBetween("soon", "2026-11-09") === null, "an unreadable date is null, never zero");

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
