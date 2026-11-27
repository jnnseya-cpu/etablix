/**
 * THE THREE REFUSALS, CHECKED IN WHAT THE SYSTEM WRITES.
 *
 * All three failures read as ordinary, competent construction English. That
 * is exactly why an instruction is not enough and a guard is: there is
 * nothing obviously wrong with any of these sentences, and each is a claim
 * the business cannot stand behind.
 *
 * The hard half is the other direction. The same words appear legitimately
 * all day — in a clause addressed to somebody else, or in the sentence that
 * denies the thing. A guard that fires on those is turned off within a week,
 * so the false-positive tests below matter at least as much as the others.
 */
import { readFileSync } from "node:fs";
import { checkPosition, positionNotes, positionStatement, POSITION_RULES, MODEL_C_RULES } from "../lib/positionguard.js";

let pass = 0, fail = 0;
const ok = (c, m, saw) => {
  if (c) { pass++; console.log(`  ✓ ${m}`); }
  else { fail++; console.log(`  ✗ ${m}${saw !== undefined ? `\n      saw: ${JSON.stringify(saw).slice(0, 300)}` : ""}`); }
};
const fires = (text, rule) => checkPosition(text).findings.some((f) => f.rule === rule);

console.log("\n=== 1 · the CDM appointment, which is not ours to take ===\n");
ok(fires("ETABLIX will act as Principal Contractor for the site-services scope.", "cdm"),
   "AT-04 · acting as Principal Contractor");
ok(fires("We are appointed as the Principal Designer for the temporary works.", "cdm"),
   "appointed as Principal Designer");
ok(fires("ETABLIX shall be the principal contractor for this package.", "cdm"),
   "and the lower-case, future-tense version");
ok(fires("We will prepare the construction phase plan before works begin.", "cdm-duty"),
   "THE DUTY BY ANOTHER NAME — the construction phase plan is the Principal Contractor's");

console.log("\n=== 2 · self-delivery, which there is no plant for ===\n");
ok(fires("We will install the compound and the temporary power distribution.", "self-delivery"),
   "installing");
ok(fires("ETABLIX will construct the haul road in week four.", "self-delivery"),
   "constructing");
ok(fires("Our own plant will be mobilised in week three.", "own-plant"),
   "OWNED PLANT — the possessive is the subject, so this never names the company and is the claim all the same");
ok(fires("Our labour will be on site from Monday.", "own-plant"), "owned labour");

console.log("\n=== 3 · holding the supply chain, which the policy does not answer ===\n");
ok(fires("ETABLIX will contract the suppliers directly.", "holds-contracts"), "holding the contracts");
ok(fires("We shall appoint the subcontractors for each package.", "holds-contracts"), "appointing them");
ok(fires("We will pay the supply chain monthly against certified value.", "holds-money"), "paying them");

console.log("\n=== the sentences that must NOT fire, which decide whether anyone keeps it on ===\n");
const GOOD = `ETABLIX writes the output specification, the package boundaries and the tender documents.
We are not the Principal Contractor and we take no CDM appointment.
Nothing in this report creates or implies either appointment.
The Contractor shall prepare the construction phase plan before the construction phase begins.
The Principal Contractor remains the client or the appointed main-works contractor.
You contract every supplier; we never hold your money.
The client holds every supplier contract and pays every supplier.
We do not hold our own plant, labour or works contracts.
We specify the installation; the supplier installs it.
Our team coordinates the interfaces between packages.`;
{
  const r = checkPosition(GOOD);
  ok(r.ok, "a correct deliverable produces nothing", r.findings);
  ok(positionNotes(r).length === 0, "and no notes");
  ok(/nothing in this document claims/.test(positionStatement(r)), "the statement says so", positionStatement(r));
}
ok(!fires("We are not taking the Principal Contractor appointment.", "cdm"),
   "A DENIAL IS THE SENTENCE WE WANT TO SEE, not a breach of the thing denied");
ok(!fires("Under CDM 2015 the Principal Contractor plans and manages the construction phase.", "cdm"),
   "a statement about the regime names nobody and claims nothing");
ok(!fires("The supplier will install the cabins to the specification.", "self-delivery"),
   "somebody else installing is the arrangement, not a breach");
ok(!fires("We specify the installation rather than carrying it out.", "self-delivery"),
   "and specifying is the opposite claim");

console.log("\n=== the one legitimate exception, named explicitly ===\n");
{
  const modelC = "Under Model C, ETABLIX will contract the suppliers and we will pay the supply chain.";
  ok(checkPosition(modelC, { allow: MODEL_C_RULES }).ok,
     "an internal description of Model C passes when the rules are allowed by name");
  ok(!checkPosition(modelC, { allow: ["holds-contracts", "holds-money"] }).ok,
     "AND A HAND-TYPED ALLOWANCE IS NOW INCOMPLETE — naming only the two original rules leaves pays-the-supplier firing, which is exactly why the set is exported instead of retyped");
  ok(!MODEL_C_RULES.includes("cdm") && !MODEL_C_RULES.includes("self-delivery") && !MODEL_C_RULES.includes("own-plant"),
     "and the allowance does not reach CDM or self-delivery: Model C is prime for the site-services system only, never a Principal Contractor appointment and never own labour");
  ok(!checkPosition(modelC).ok,
     "and the same sentence without that allowance is still a breach — the exception is never implicit");
}

console.log("\n=== shape ===\n");
{
  const r = checkPosition("We will install the compound. We will install the welfare. We will install the fencing.");
  ok(r.findings.length === 1 && r.occurrences === 3,
     "one finding per rule, with the occurrences counted — three sentences are one problem", { f: r.findings.length, o: r.occurrences });
  ok(r.findings[0].sentence.length <= 180, "the quoted sentence is trimmed for a note");
}
ok(POSITION_RULES.length === 9, "nine rules across the three refusals", POSITION_RULES.map((r) => r.id));

console.log("\n=== THE OPERATIONAL FORMS, WHICH SHIPPED PAST THIS GUARD ===\n");
//
// On 27 November 2026 a supplier replied to an approval email expecting to
// agree payment terms with ETABLIX. They were not confused: catalog.js had
// been sending "ETABLIX purchase order", "this is our payment notice", "the
// sum we intend to pay" and "ETABLIX remittance" to real suppliers, and every
// one of them passed this guard clean.
//
// TWO REASONS IT MISSED THEM, and both are worth keeping written down.
//
// First, holds-contracts and holds-money look for a VERB with "the suppliers"
// after it — the shape of a sentence in a proposal. A purchase order is a
// noun. A remittance is a noun. Neither rule could see an entire payment
// machinery addressed in the second person.
//
// Second, checkPosition skips a non-standalone rule on any sentence without
// the subject in it, and "accept our framework terms" has no subject but
// "our". own-plant already carried a comment explaining exactly this, for
// exactly this reason. The new rules repeat its flag rather than its mistake.
{
  const caught = (text, rule) => {
    const r = checkPosition(text);
    return !r.ok && r.findings.some((f) => f.rule === rule);
  };
  ok(caught("ETABLIX purchase order 1234 for the welfare units is issued at the agreed sum below.", "issues-order"),
     "AN ORDER IN OUR NAME IS THE SUPPLIER CONTRACT — the client places the order; we administer it");
  ok(caught("Set up your payment structure and accept our framework terms.", "issues-order"),
     'and so are "our framework terms" — the possessive is the subject, which is why the rule is standalone');
  ok(caught("This is our payment notice for your application 12.", "issues-payment-notice"),
     "A PAYMENT NOTICE IN OUR NAME MAKES US THE PAYER — s.110A of the Housing Grants, Construction and Regeneration Act 1996 is the paying party's statutory act, and we assess rather than certify");
  ok(caught("ETABLIX remittance — application 12 paid.", "issues-payment-notice"),
     "and a remittance is the same claim after the fact");
  ok(caught("The sum we intend to pay and its basis are set out below.", "pays-the-supplier"),
     "a sum we commit to paying is money we are holding");

  // THE CORRECT FORMS MUST STAY SAYABLE, or the rules get switched off.
  for (const [what, text] of [
    ["the client's order", "The client purchase order 1234 for the welfare units is issued at the agreed sum below, on the client framework terms."],
    ["the client's notice", "The client payment notice for your application 12 is set out below: the sum the client intends to pay."],
    ["the client paying", "ETABLIX assesses the applications, and the client certifies and pays."],
    ["us administering", "ETABLIX administers the contract on the client behalf and is not a party to it."],
    ["the denial itself", "ETABLIX is not a party to that contract and never holds the money."],
  ]) ok(checkPosition(text).ok, `and "${what}" still passes — a guard that forbids the right answer is a guard somebody disables`);
}

console.log("\n=== every outbound template is run through the live guard ===\n");
//
// NOT A COPY OF THE RULES. The templates are checked with checkPosition
// itself, so a rule added later covers them without anybody remembering to
// come back here. This is the wiring that was missing: the guard existed, the
// templates existed, and nothing ever put one through the other.
{
  const { CATEGORIES } = await import("../lib/catalog.js");
  const events = CATEGORIES.flatMap((c) => c.events);
  ok(events.length > 80, `${events.length} notification templates read`, events.length);

  const breaching = events
    .map((e) => ({ code: e.code, r: checkPosition(`${e.subject}. ${e.line}`) }))
    .filter((x) => !x.r.ok)
    .map((x) => `${x.code}: ${x.r.findings.map((f) => f.rule).join(", ")}`);
  ok(breaching.length === 0,
     "NO TEMPLATE CLAIMS A POSITION THE BUSINESS CANNOT STAND BEHIND — these are the only sentences the platform sends without a human writing them, so they are the last place a prohibition should be checked and the first place it was not",
     breaching);

  // The scope of works is written by an agent and read by a supplier.
  const ai = readFileSync(new URL("../lib/ai.js", import.meta.url), "utf8");
  const scope = ai.slice(ai.indexOf("COMMERCIAL BASIS"), ai.indexOf("COMMERCIAL BASIS") + 600);
  ok(/CLIENT'S framework terms/.test(scope),
     "draftScope tells the agent the framework terms are the CLIENT'S, not ours");
  ok(/Never write that ETABLIX places the order/.test(scope) && /s\.110A/.test(scope),
     "and names the statutory section, so an agent asked why has the answer rather than a rule");
}
ok(checkPosition("").ok, "empty text claims nothing");
ok(checkPosition(null).ok, "and neither does nothing at all");

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
