/**
 * The interface register check — the register must reconcile with its own
 * movement log, and every interface must have exactly one owner.
 *
 * THE BUSINESS'S OWN THESIS, MADE MECHANICAL. ETABLIX's position is that
 * projects fail at the unowned interfaces between fifteen to twenty-five
 * supplier packages, not inside them. Model 02 sells "one management team
 * owns every supplier interface". If that is the argument, then an interface
 * with no named owner is the one thing this system must not be able to issue.
 *
 * IT IS A LIVING REGISTER, AND THAT CHANGES WHAT HAS TO BE CHECKED. The
 * diagnostic and the requirements package produce an interface matrix once,
 * at the start. This one is reissued every month for the life of the
 * appointment, and a register that is reissued has a failure mode the
 * one-off documents do not: A ROW CAN QUIETLY DISAPPEAR.
 *
 * An interface that was open in March and absent in April has either been
 * closed — which is a fact somebody should be told — or been lost, and
 * nothing on April's register distinguishes the two. Six months later the
 * handover that nobody owns is discovered by the person standing at the slab
 * edge with two contractors who both think it is the other's.
 *
 * So the register and its movement log must reconcile. Every interface in the
 * register appears in the log as OPENED or CARRIED FORWARD; every interface
 * in the log that is not CLOSED appears in the register. Neither can lose a
 * row without the other contradicting it, and this compares them by machine
 * on every run.
 *
 * Three more failures, each of which makes a register decorative:
 *
 *   · NO OWNER, or an owner that is not a single party. "Both", "shared",
 *     "the team", "TBC" and a blank are the same answer, and it is the answer
 *     the whole business exists to refuse.
 *   · A BOUNDARY THAT IS NOT A PHYSICAL POINT. "Up to the building" cannot
 *     be witnessed, so it cannot be handed over or accepted, so the interface
 *     is unresolved however many columns are filled in.
 *   · NO DATE. An interface with no date is not on anybody's programme.
 *
 * The reference form is fixed and the agent is told it verbatim:
 *
 *     IF-<n>       e.g. IF-1, IF-24
 */

import { isDate } from "./bidcheck.js";

/** An interface reference wherever it appears. */
const REF = /\bIF-(\d{1,3})\b/g;

/** The register's columns, mandated in the brief and checked here. */
export const REGISTER_COLUMNS = ["Ref", "Between", "The physical point", "Owner", "State", "Date required", "Accepted by"];

/** The movement log's columns. */
export const MOVEMENT_COLUMNS = ["Ref", "Movement", "What changed", "Why", "Authorised by"];

/** The movements a row may record. Anything else is not a movement. */
export const MOVEMENTS = ["OPENED", "CARRIED FORWARD", "CLOSED", "OWNER CHANGED", "DATE CHANGED", "POINT CHANGED"];

/**
 * An owner cell that names one accountable party.
 *
 * The rejections are the point. "Both parties" is the condition this register
 * exists to eliminate, and it reads on the page as though it had been
 * answered.
 */
const NOT_AN_OWNER = /^(|-|—|–|tbc|tba|n\/a|na|none|both|both parties|shared|joint|jointly|the team|team|all|either|to be agreed|to be confirmed|unassigned|unknown|\?)$/i;

/** A boundary that cannot be witnessed. */
const NOT_A_POINT = /\b(as required|as necessary|as appropriate|tbc|tba|to be confirmed|to be agreed|up to the building|up to the works|at the boundary|as shown|as directed|various|generally|approximately|somewhere)\b/i;

export function isOwner(cell) {
  const s = String(cell || "").replace(/[*_`]/g, "").trim();
  if (NOT_AN_OWNER.test(s)) return false;
  // A cell naming two parties is two owners, which is none.
  //
  // Split on the separators rather than testing for them: the first version
  // wrapped the punctuation in \b, and a word boundary either side of "/"
  // does not behave the way it reads — so "Supplier A / Supplier B" passed as
  // a single owner, which is exactly the value this function exists to refuse.
  //
  // A COMMA IS NOT A SEPARATOR HERE. "J Nseya, Delivery Lead" is one person
  // and their role, which is the most useful thing this cell can contain.
  const parties = s.split(/\s+(?:and|or)\s+|\s*[/&+]\s*|\s+\+\s+/i).map((x) => x.trim()).filter((x) => x.length > 2);
  if (parties.length > 1) return false;
  return s.length >= 2;
}

export function isPoint(cell) {
  const s = String(cell || "").replace(/[*_`]/g, "").trim();
  if (!s || NOT_AN_OWNER.test(s)) return false;
  if (NOT_A_POINT.test(s)) return false;
  // A physical point is described, not named in two words.
  return s.length >= 12;
}

export function refsIn(text) {
  const out = [];
  const seen = new Set();
  const src = String(text || "");
  REF.lastIndex = 0;
  let m;
  while ((m = REF.exec(src))) {
    const ref = `IF-${Number(m[1])}`;
    if (!seen.has(ref)) { seen.add(ref); out.push(ref); }
  }
  return out;
}

const byRef = (a, b) => Number(a.slice(3)) - Number(b.slice(3));

function tableRows(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((l) => l.trim().startsWith("|") && l.trim().endsWith("|"))
    .filter((l) => !/^\s*\|[\s:|-]+\|\s*$/.test(l))
    .map((l) => l.trim().slice(1, -1).split("|").map((c) => c.trim()));
}

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z]/g, "");

/** The register, row by row. Headers are found by their columns, so a
 *  register split by package is read in full. */
function registerRows(text) {
  const rows = [];
  let refCol = -1, betweenCol = -1, pointCol = -1, ownerCol = -1, stateCol = -1, dateCol = -1;
  for (const cells of tableRows(text)) {
    const header = cells.map(norm);
    const r = header.indexOf("ref");
    const o = header.indexOf("owner");
    if (r >= 0 && o >= 0) {
      refCol = r; ownerCol = o;
      betweenCol = header.findIndex((h) => h === "between" || h === "packages" || h === "parties");
      pointCol = header.findIndex((h) => h === "thephysicalpoint" || h === "physicalpoint" || h === "point" || h === "boundary");
      stateCol = header.findIndex((h) => h === "state" || h === "status");
      dateCol = header.findIndex((h) => h === "daterequired" || h === "date" || h === "requiredby");
      continue;
    }
    if (refCol < 0) continue;
    const ref = refsIn(cells[refCol] || "")[0];
    if (!ref) continue;
    rows.push({
      ref,
      between: betweenCol >= 0 ? cells[betweenCol] || "" : "",
      point: pointCol >= 0 ? cells[pointCol] || "" : "",
      owner: ownerCol >= 0 ? cells[ownerCol] || "" : "",
      state: stateCol >= 0 ? cells[stateCol] || "" : "",
      date: dateCol >= 0 ? cells[dateCol] || "" : "",
    });
  }
  return rows;
}

/** The movement log, row by row. */
function movementRows(text) {
  const rows = [];
  let refCol = -1, moveCol = -1;
  for (const cells of tableRows(text)) {
    const header = cells.map(norm);
    const r = header.indexOf("ref");
    const m = header.findIndex((h) => h === "movement" || h === "change");
    if (r >= 0 && m >= 0) { refCol = r; moveCol = m; continue; }
    if (refCol < 0) continue;
    const ref = refsIn(cells[refCol] || "")[0];
    if (!ref) continue;
    const raw = String(cells[moveCol] || "").replace(/[*_`]/g, "").trim().toUpperCase();
    rows.push({ ref, movement: MOVEMENTS.find((mv) => raw.includes(mv)) || null, raw: cells[moveCol] || "(blank)" });
  }
  return rows;
}

/**
 * Reconcile the register against its own movement log.
 *
 * `ok` is true only when the two agree, every interface has one named owner,
 * every boundary is a witnessable point, and every open interface has a date.
 */
export function reconcileRegisterToMovements(registerText, movementText) {
  const reg = registerRows(registerText);
  const mov = movementRows(movementText);

  const regRefs = new Set(reg.map((r) => r.ref));
  const movByRef = new Map();
  for (const m of mov) movByRef.set(m.ref, m);

  // A register row nobody logged was added without being recorded.
  const unlogged = reg.filter((r) => !movByRef.has(r.ref)).map((r) => r.ref).sort(byRef);

  // A logged row that is not CLOSED and is not in the register has been LOST.
  // This is the failure the whole check exists for.
  const dropped = mov
    .filter((m) => m.movement !== "CLOSED" && !regRefs.has(m.ref))
    .map((m) => ({ ref: m.ref, movement: m.movement || m.raw }))
    .sort((a, b) => byRef(a.ref, b.ref));

  const unmoved = mov.filter((m) => !m.movement).map((m) => ({ ref: m.ref, raw: m.raw })).sort((a, b) => byRef(a.ref, b.ref));

  const closed = new Set(mov.filter((m) => m.movement === "CLOSED").map((m) => m.ref));
  const open = reg.filter((r) => !closed.has(r.ref) && !/closed|complete|accepted/i.test(r.state));

  const unowned = open.filter((r) => !isOwner(r.owner)).map((r) => ({ ref: r.ref, between: r.between, owner: r.owner || "(blank)" })).sort((a, b) => byRef(a.ref, b.ref));
  const unwitnessed = open.filter((r) => !isPoint(r.point)).map((r) => ({ ref: r.ref, between: r.between, point: r.point || "(blank)" })).sort((a, b) => byRef(a.ref, b.ref));
  const undated = open.filter((r) => !isDate(r.date)).map((r) => ({ ref: r.ref, between: r.between, date: r.date || "(blank)" })).sort((a, b) => byRef(a.ref, b.ref));

  return {
    interfaces: reg.length,
    openInterfaces: open.length,
    closedThisPeriod: closed.size,
    movements: mov.length,
    unlogged,
    dropped,
    unmoved,
    unowned,
    unwitnessed,
    undated,
    referenced: reg.length > 0 && mov.length > 0,
    ok:
      reg.length > 0 &&
      mov.length > 0 &&
      !unlogged.length &&
      !dropped.length &&
      !unmoved.length &&
      !unowned.length &&
      !unwitnessed.length &&
      !undated.length,
  };
}

const list = (items, cap = 10) =>
  items.slice(0, cap).join("; ") + (items.length > cap ? `, and ${items.length - cap} more` : "");

/**
 * The reconciliation as notes on the run.
 *
 * A register that reconciles produces NO notes.
 */
export function interfaceNotes(result) {
  const notes = [];
  if (!result.referenced) {
    notes.push(
      "THE INTERFACE REGISTER COULD NOT BE CHECKED: the register or the movement log carries no IF-n references, " +
        "so there is no way to establish that nothing has been lost since last month or that every interface has an owner. " +
        "Do not issue this register. Re-run it, and if it comes back the same the references have to be added by hand."
    );
    return notes;
  }
  if (result.dropped.length) {
    notes.push(
      `${result.dropped.length} interface(s) are in the movement log but MISSING FROM THE REGISTER: ` +
        `${list(result.dropped.map((d) => `${d.ref} (${d.movement})`))}. ` +
        "An interface that was open last month and is absent this month has either been closed — which is a fact somebody must be told — or been lost. " +
        "Nothing on the page distinguishes the two, and a lost interface is discovered six months later by the person standing at the boundary with two contractors who each think it is the other's. " +
        "Put it back in the register, or log it as CLOSED with who accepted it."
    );
  }
  if (result.unowned.length) {
    notes.push(
      `${result.unowned.length} open interface(s) have NO SINGLE NAMED OWNER: ` +
        `${list(result.unowned.map((u) => `${u.ref}${u.between ? ` (${u.between})` : ""} — owner "${u.owner}"`))}. ` +
        "This is the condition the whole appointment exists to eliminate. \"Both\", \"shared\", \"the team\" and a blank are the same answer, and it reads on the page as though it had been given. " +
        "Name one accountable party per interface before this register is issued."
    );
  }
  if (result.unlogged.length) {
    notes.push(
      `${result.unlogged.length} interface(s) are in the register with NO MOVEMENT LOGGED: ${list(result.unlogged)}. ` +
        "Either it is new, in which case log it as OPENED with why, or it was carried forward, in which case log it as CARRIED FORWARD. " +
        "A register whose rows appear without a record is a register nobody can audit against last month's."
    );
  }
  if (result.unwitnessed.length) {
    notes.push(
      `${result.unwitnessed.length} open interface(s) describe a boundary that CANNOT BE WITNESSED: ` +
        `${list(result.unwitnessed.map((u) => `${u.ref} — "${u.point}"`))}. ` +
        "A boundary a person cannot stand at cannot be handed over or accepted, so the interface is unresolved however many other columns are filled in. " +
        "Name a slab edge and level, a valve, a terminal, an isolator, or a line on a drawing by its number and revision."
    );
  }
  if (result.undated.length) {
    notes.push(
      `${result.undated.length} open interface(s) have no date: ${list(result.undated.map((u) => `${u.ref} — "${u.date}"`))}. ` +
        "An interface with no date is on nobody's programme, so nobody is late for it until the day it is needed."
    );
  }
  if (result.unmoved.length) {
    notes.push(
      `${result.unmoved.length} movement log entr(y/ies) record something that is not a movement: ` +
        `${list(result.unmoved.map((u) => `${u.ref} — "${u.raw}"`))}. ` +
        `Use one of: ${MOVEMENTS.join(", ")}. A movement log with free text in the movement column cannot be compared with next month's.`
    );
  }
  return notes;
}

/**
 * The reconciliation as a table for the register certificate.
 */
export function interfaceStatement(result) {
  if (!result.referenced) {
    return "**This interface register has not passed the continuity check.** The register and its movement log do not carry matching references, so it cannot be confirmed that nothing has been lost since the last issue or that every interface has an owner. Do not issue it on this basis.";
  }
  const rows = [
    "| Check | Result |",
    "|---|---|",
    `| Interfaces in the register | ${result.interfaces} |`,
    `| Open at this issue | ${result.openInterfaces} |`,
    `| Closed this period | ${result.closedThisPeriod} |`,
    `| Carried forward but missing from the register | ${result.dropped.length} |`,
    `| Open interfaces with no single named owner | ${result.unowned.length} |`,
    `| Boundaries that cannot be witnessed | ${result.unwitnessed.length} |`,
    `| Open interfaces with no date | ${result.undated.length} |`,
  ].join("\n");
  const verdict = result.ok
    ? "\n\n**This register reconciles with its own movement log.** Nothing carried forward has been lost, every interface added is recorded, every open interface names one accountable party and a boundary a person could stand at and witness, and every one of them has a date. The check is performed by the system on every issue, not by eye. It says nothing about whether the OWNER is the right one or the boundary is in the right place — those are engineering and commercial judgements and neither has been delegated."
    : "\n\n**This register does not reconcile and must not be issued as it stands.** The exceptions are listed in the run notes and each one must be closed before it goes out, because a register that has quietly lost a row is worse than no register at all.";
  return rows + verdict;
}
