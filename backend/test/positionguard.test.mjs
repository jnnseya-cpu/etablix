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
import { checkPosition, positionNotes, positionStatement, POSITION_RULES } from "../lib/positionguard.js";

let pass = 0, fail = 0;
const ok = (c, m, saw) => {
  if (c) { pass++; console.log(`  ✓ ${m}`); }
  else { fail++; console.log(`  ✗ ${m}${saw !== undefined ? `\n      saw: ${JSON.stringify(saw).slice(0, 300)}` : ""}`); }
};
const fires = (text, rule) => checkPosition(text).findings.some((f) => f.rule === rule);

console.log("\n=== 1 · the CDM appointment, which is not ours to take ===\n");
ok(fires("ETABLIX will act as Principal Contractor for the site-services scope.", "cdm"),
   "acting as Principal Contractor");
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
  ok(!checkPosition(modelC, { allow: ["holds-contracts", "holds-money"] }).ok === false,
     "an internal description of Model C passes when the rules are allowed by name");
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
ok(POSITION_RULES.length === 6, "six rules across the three refusals", POSITION_RULES.map((r) => r.id));
ok(checkPosition("").ok, "empty text claims nothing");
ok(checkPosition(null).ok, "and neither does nothing at all");

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
