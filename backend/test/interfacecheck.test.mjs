/**
 * The interface register check — the continuity gate, and the business's own
 * thesis made mechanical.
 *
 *   node backend/test/interfacecheck.test.mjs
 *
 * ETABLIX's position is that projects fail at the unowned interfaces between
 * fifteen to twenty-five supplier packages rather than inside them, and Model
 * 02 sells "one management team owns every supplier interface". If that is
 * the argument then an interface with no named owner is the one thing the
 * system must not be able to issue — and "owned by both" has to be refused as
 * firmly as a blank, because on the page it reads as though it had been
 * answered.
 *
 * The register is the only document in the system that is CARRIED FORWARD,
 * which gives it a failure the one-off matrices do not have: a row can
 * quietly disappear. An interface open in March and absent in April has
 * either been closed, which is a fact somebody must be told, or been lost,
 * and only the movement log can tell them apart. So the register and its own
 * log are reconciled, in both directions.
 */
import { isOwner, isPoint, refsIn, reconcileRegisterToMovements, interfaceNotes, interfaceStatement, REGISTER_COLUMNS, MOVEMENT_COLUMNS, MOVEMENTS } from "../lib/interfacecheck.js";

let pass = 0, fail = 0;
const ok = (c, m, x) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m + (x !== undefined ? "  → " + String(x).slice(0, 300) : ""))); };

console.log("\n=== the interface register check ===\n");

console.log("--- one named owner, or none\n");
{
  for (const good of ["Temporary Works Coordinator", "Supplier A", "J Nseya, Delivery Lead", "Client engineer"]) {
    ok(isOwner(good), `"${good}"`);
  }
  // The rejections are the point of the whole agent.
  for (const bad of ["", "-", "TBC", "n/a", "none", "both", "Both parties", "shared", "joint", "jointly", "the team", "team", "unassigned", "to be agreed", "?"]) {
    ok(!isOwner(bad), `"${bad || "(blank)"}" is not an owner`);
  }
  ok(!isOwner("Supplier A and Supplier B"), "two parties named is not one owner — it is the condition being eliminated");
  ok(!isOwner("Supplier A / Supplier B"), "and a slash does not make it one either");
  ok(!isOwner("P02 or P03"), "nor does an 'or'");
}

console.log("\n--- a boundary a person could stand at\n");
{
  for (const good of ["Top of formation at level 42.150, drawing C-1042 rev C", "Outgoing terminals of board DB-01", "Valve V-104 on drawing M-2201 rev C", "Slab edge and level, witnessed jointly"]) {
    ok(isPoint(good), `"${good.slice(0, 44)}"`);
  }
  for (const bad of ["up to the building", "at the boundary", "as shown", "as required", "TBC", "", "edge", "various", "generally", "as directed"]) {
    ok(!isPoint(bad), `"${bad || "(blank)"}" cannot be witnessed`);
  }
}

console.log("\n--- references\n");
ok(refsIn("IF-1 IF-07 IF-7").join(",") === "IF-1,IF-7", "IF-07 and IF-7 are one interface");
ok(refsIn("IFRS-1 IF1 xIF-1").length === 0, "and nothing that merely looks like one counts", refsIn("IFRS-1 IF1 xIF-1"));

const reg = (rows) => `| ${REGISTER_COLUMNS.join(" | ")} |\n|${REGISTER_COLUMNS.map(() => "---").join("|")}|\n${rows.join("\n")}`;
const mov = (rows) => `| ${MOVEMENT_COLUMNS.join(" | ")} |\n|${MOVEMENT_COLUMNS.map(() => "---").join("|")}|\n${rows.join("\n")}`;
const POINT = "Top of formation at level 42.150, drawing C-1042 rev C";
const OWNER = "Temporary Works Coordinator";

console.log("\n--- a register that reconciles\n");
{
  const r = reconcileRegisterToMovements(
    reg([
      `| IF-1 | P01 → P02 | ${POINT} | ${OWNER} | Open | 2026-11-02 | Client engineer |`,
      `| IF-2 | P02 → P03 | Outgoing terminals of board DB-01, drawing E-3301 rev B | Delivery Lead | Open | 2026-11-09 | Client engineer |`,
    ]),
    mov([
      "| IF-1 | CARRIED FORWARD | Nothing | — | MD |",
      "| IF-2 | OPENED | New interface | P03 let | MD |",
      "| IF-3 | CLOSED | Ready → Closed | Accepted on site | Client engineer |",
    ])
  );
  ok(r.ok === true, "it passes", r);
  ok(r.interfaces === 2 && r.movements === 3, "two interfaces, three movements");
  ok(r.closedThisPeriod === 1, "one closed, and correctly absent from the register");
  ok(interfaceNotes(r).length === 0, "producing no notes", interfaceNotes(r));
  const st = interfaceStatement(r);
  ok(/reconciles with its own movement log/.test(st), "the certificate says so");
  ok(/says nothing about whether the OWNER is the right one/.test(st),
     "and says what it does NOT check — a green table is not an engineering opinion");
}

console.log("\n--- the row that quietly disappeared\n");
{
  // The failure the whole check exists for: open last month, gone this month,
  // with no closure logged.
  const r = reconcileRegisterToMovements(
    reg([`| IF-1 | P01 → P02 | ${POINT} | ${OWNER} | Open | 2026-11-02 | Client engineer |`]),
    mov([
      "| IF-1 | CARRIED FORWARD | Nothing | — | MD |",
      "| IF-2 | CARRIED FORWARD | Nothing | — | MD |",
    ])
  );
  ok(r.ok === false, "does not pass");
  ok(r.dropped.length === 1 && r.dropped[0].ref === "IF-2", "the lost interface is named", r.dropped);
  const n = interfaceNotes(r);
  ok(n.some((x) => /MISSING FROM THE REGISTER/.test(x)), "and reported");
  ok(n.some((x) => /has either been closed .* or been lost/.test(x)), "with both readings, because only one is a defect", n);
  ok(n.some((x) => /standing at the boundary with two contractors/.test(x)),
     "and the consequence stated concretely rather than as 'a risk'", n);
  ok(/worse than no register at all/.test(interfaceStatement(r)), "the certificate refuses it");
}

console.log("\n--- an interface nobody owns\n");
{
  const r = reconcileRegisterToMovements(
    reg([
      `| IF-1 | P01 → P02 | ${POINT} | both | Open | 2026-11-02 | Client engineer |`,
      `| IF-2 | P02 → P03 | ${POINT} | | Open | 2026-11-09 | Client engineer |`,
    ]),
    mov(["| IF-1 | CARRIED FORWARD | Nothing | — | MD |", "| IF-2 | CARRIED FORWARD | Nothing | — | MD |"])
  );
  ok(r.unowned.length === 2, "both the blank and the 'both' are unowned", r.unowned.map((u) => u.ref));
  ok(r.ok === false, "and neither can be issued");
  const n = interfaceNotes(r);
  ok(n.some((x) => /the condition the whole appointment exists to eliminate/.test(x)),
     "the note says what it is, in the business's own terms", n);
  ok(n.some((x) => /reads on the page as though it had been given/.test(x)),
     "and why 'both' is more dangerous than a blank", n);
}

console.log("\n--- a closed interface is not held to the open rules\n");
{
  // A closure carries no owner, point or date requirement — holding it to
  // them would make every register fail as soon as it succeeded at anything.
  const r = reconcileRegisterToMovements(
    reg([`| IF-1 | P01 → P02 | as shown | | Closed | TBC | Client engineer |`]),
    mov(["| IF-1 | CLOSED | Open → Closed | Accepted on site | Client engineer |"])
  );
  ok(r.unowned.length === 0 && r.unwitnessed.length === 0 && r.undated.length === 0,
     "a closed interface is not marked down for having no owner, point or date", r);
  ok(r.ok === true, "and the register passes");
}

console.log("\n--- the other three failures\n");
{
  const r = reconcileRegisterToMovements(
    reg([
      `| IF-1 | P01 → P02 | up to the building | ${OWNER} | Open | 2026-11-02 | Client engineer |`,
      `| IF-2 | P02 → P03 | ${POINT} | ${OWNER} | Open | TBC | Client engineer |`,
      `| IF-3 | P01 → P03 | ${POINT} | ${OWNER} | Open | 2026-11-20 | Client engineer |`,
    ]),
    mov([
      "| IF-1 | CARRIED FORWARD | Nothing | — | MD |",
      "| IF-2 | reviewed and updated | — | — | MD |",
    ])
  );
  ok(r.unwitnessed.length === 1 && r.unwitnessed[0].ref === "IF-1", "a boundary nobody can stand at is found", r.unwitnessed);
  ok(r.undated.length === 1 && r.undated[0].ref === "IF-2", "an undated interface is found", r.undated);
  ok(r.unlogged.length === 1 && r.unlogged[0] === "IF-3", "a register row with no movement logged is found", r.unlogged);
  ok(r.unmoved.length === 1 && r.unmoved[0].ref === "IF-2", "and free text in the movement column is found", r.unmoved);
  const n = interfaceNotes(r);
  ok(n.length >= 4, `all four reported separately (${n.length} notes)`);
  ok(n.some((x) => new RegExp(MOVEMENTS.join("|")).test(x)), "and the movement note names the words that are allowed", n);
}

console.log("\n--- several tables, and a register written to no convention\n");
{
  const r = reconcileRegisterToMovements(
    reg([`| IF-1 | P01 → P02 | ${POINT} | ${OWNER} | Open | 2026-11-02 | Client engineer |`]) +
      "\n\n#### Package 3 interfaces\n\n" +
      reg([`| IF-2 | P02 → P03 | ${POINT} | ${OWNER} | Open | 2026-11-09 | Client engineer |`]),
    mov(["| IF-1 | CARRIED FORWARD | Nothing | — | MD |", "| IF-2 | OPENED | New | P03 let | MD |"])
  );
  ok(r.interfaces === 2 && r.ok === true, "both register tables are read", r.interfaces);
}
{
  const r = reconcileRegisterToMovements("A register with no references.", "A log with none either.");
  ok(r.referenced === false && r.ok === false, "an unreferenced register is not a clean result");
  const n = interfaceNotes(r);
  ok(n.length === 1 && /COULD NOT BE CHECKED/.test(n[0]), "one note saying the check could not run", n);
  ok(/has not passed the continuity check/.test(interfaceStatement(r)), "and the certificate says so");
}

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
