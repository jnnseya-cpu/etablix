/**
 * The seven mobilisation gates, and the distinction a delivery note hides.
 *
 * A DELIVERED CABIN IS NOT AN INSTALLED ONE. It is an asset receipt: a thing
 * on the ground, signed for, with hire running. It is not lifted, not
 * levelled, not connected, not tested and not open — and the one record that
 * exists at that moment, the delivery note, looks like completion to every
 * system that reads it. A platform that advances state on a receipt reports a
 * compound as mobilised when it is a field with boxes in it.
 *
 * So receipt, installation, commissioning and opening are four gates, and
 * each needs its own evidence. The specification lists seven in total and
 * they run in order: order, dispatch, lift and place, connect and test, open
 * service, change or relocate, remove or reinstate.
 *
 * AND OPENING IS PER SERVICE AND PER AREA, NOT PER COMPOUND. Cabins installed
 * with the water unproven and the fire alarm failed is not a compound that
 * opens late; it is a compound that opens for the services that pass, in the
 * areas they cover, and for nothing else. A restricted release must say what
 * capacity, for what time, in what permitted area — and it cannot waive a
 * mandatory requirement, because a release that waives one is not restricted,
 * it is unauthorised.
 */

/** The seven gates, in order, with the inputs each requires. */
export const MOB_GATES = [
  { id: "order", name: "Order", requires: ["scope", "price", "approvedSupplier", "buyingEntity", "approval", "fundedExposure", "deliveryAssumptions"] },
  { id: "dispatch", name: "Dispatch to site", requires: ["accessSlot", "approvedTransport", "route", "unloadingCapacity", "receiptingParty", "preservation"] },
  { id: "lift", name: "Lift and place", requires: ["groundConstraints", "foundationRelease", "liftPlan", "fieldAuthority", "equipmentEvidence", "exclusionZone"] },
  { id: "connect", name: "Connect and test", requires: ["installedRevision", "authorisedSpecialists", "utilityBoundary", "testScript", "qualityRecords", "calibration"] },
  { id: "open", name: "Open service", requires: ["systemTests", "inspections", "usableCapacity", "dependencies", "operatingInstructions", "emergencyPlan", "acceptingParty"] },
  { id: "relocate", name: "Change or relocate", requires: ["revisedDependency", "capacityEvidence", "transitionPlan", "isolationPlan", "approvals"] },
  { id: "remove", name: "Remove or reinstate", requires: ["dependencyRelease", "offHireTerms", "disconnection", "haulage", "wasteRoute", "landEvidence"] },
];

/** The attempt lifecycle for a test. A retest is a new linked attempt. */
export const TEST_STATES = ["PREPARED", "READY", "RUNNING", "PASSED", "FAILED", "ABORTED", "INVALID"];

const GATE_BY_ID = new Map(MOB_GATES.map((g) => [g.id, g]));
const has = (v) => v !== undefined && v !== null && v !== "" && v !== false;

/**
 * Asset receipt. Deliberately its own function, returning a state that is
 * explicitly not installation, so no caller can treat a delivery note as one.
 */
export function assetReceipt({ asset = null, serial = null, receivedAt = null, receiptedBy = null, condition = null } = {}) {
  const missing = [];
  if (!asset && !serial) missing.push("an asset or serial");
  if (!receivedAt) missing.push("a receipt date");
  if (!receiptedBy) missing.push("a receipting party");
  return {
    ok: missing.length === 0,
    state: missing.length ? "NOT_RECEIPTED" : "RECEIPTED",
    asset: asset || serial || null,
    serial: serial || null,
    receivedAt: receivedAt || null,
    receiptedBy: receiptedBy || null,
    condition: condition || null,
    // The whole reason this exists.
    installed: false,
    commissioned: false,
    open: false,
    missing,
    say: missing.length
      ? `not receipted: no ${missing.join(", no ")}`
      : `${asset || serial} receipted on ${receivedAt} by ${receiptedBy} — an asset on the ground with hire running, `
        + "not installed, not commissioned and not open",
  };
}

/** One gate, against the evidence supplied for it. */
export function checkGate(gateId, evidence = {}) {
  const gate = GATE_BY_ID.get(String(gateId));
  if (!gate) return { ok: false, gate: String(gateId), missing: [], say: `there is no "${gateId}" gate` };
  const missing = gate.requires.filter((k) => !has(evidence[k]));
  return {
    ok: missing.length === 0,
    gate: gate.id,
    name: gate.name,
    missing,
    say: missing.length ? `${gate.name} is not released: no ${missing.join(", no ")}` : `${gate.name} released`,
  };
}

/**
 * Opening, per service and per area.
 *
 * `services` is [{ code, area, testsPassed, mandatory }]. A service whose
 * tests have not passed does not open. A compound where any mandatory service
 * has not passed opens RESTRICTED — naming capacity, time and area — or not
 * at all, and the restriction cannot cover the mandatory service itself.
 */
export function openService({ services = [], capacity = null, until = null, acceptingParty = null } = {}) {
  const rows = (Array.isArray(services) ? services : []).filter(Boolean);
  if (!rows.length) return { ok: false, state: "CLOSED", opened: [], withheld: [], say: "no services offered for opening" };

  const opened = rows.filter((s) => s.testsPassed === true);
  const withheld = rows.filter((s) => s.testsPassed !== true);
  const mandatoryWithheld = withheld.filter((s) => s.mandatory === true);

  if (!acceptingParty) {
    return { ok: false, state: "CLOSED", opened: [], withheld: rows.map((s) => s.code),
             say: "no named accepting party, and a service nobody accepted is not open" };
  }
  if (!opened.length) {
    return { ok: false, state: "CLOSED", opened: [], withheld: withheld.map((s) => s.code),
             say: `nothing opens: ${withheld.map((s) => s.code).join(", ")} have not passed their tests` };
  }
  if (mandatoryWithheld.length) {
    // Opening around a failed mandatory service is not a restricted release.
    const openedAreas = [...new Set(opened.map((s) => s.area).filter(Boolean))];
    const blockedAreas = [...new Set(mandatoryWithheld.map((s) => s.area).filter(Boolean))];
    const overlap = openedAreas.filter((a) => blockedAreas.includes(a));
    if (overlap.length) {
      return {
        ok: false, state: "CLOSED",
        opened: [], withheld: rows.map((s) => s.code), blockedAreas: overlap,
        say: `${mandatoryWithheld.map((s) => s.code).join(", ")} are mandatory and have not passed in ${overlap.join(", ")} — `
           + "nothing opens in those areas. A release that waives a mandatory requirement is not restricted, it is unauthorised",
      };
    }
  }

  const restricted = withheld.length > 0;
  if (restricted && (!capacity || !until)) {
    return { ok: false, state: "CLOSED", opened: [], withheld: withheld.map((s) => s.code),
             say: "a restricted release must state the capacity and the time it is restricted to; without both it is not a restriction" };
  }

  return {
    ok: true,
    state: restricted ? "OPEN_RESTRICTED" : "OPEN",
    opened: opened.map((s) => s.code),
    withheld: withheld.map((s) => s.code),
    areas: [...new Set(opened.map((s) => s.area).filter(Boolean))],
    capacity: restricted ? capacity : null,
    until: restricted ? until : null,
    acceptingParty,
    say: restricted
      ? `OPEN RESTRICTED — ${opened.map((s) => s.code).join(", ")} in ${[...new Set(opened.map((s) => s.area).filter(Boolean))].join(", ")}, `
        + `to ${capacity} until ${until}, accepted by ${acceptingParty}; ${withheld.map((s) => s.code).join(", ")} withheld`
      : `OPEN — all ${opened.length} service(s) passed, accepted by ${acceptingParty}`,
  };
}

/** A test attempt. A material configuration change makes downstream acceptance stale. */
export function testAttempt({ state = null, requirement = null, scriptRevision = null, configuration = null, witness = null, priorConfiguration = null } = {}) {
  const s = String(state ?? "").toUpperCase();
  if (!TEST_STATES.includes(s)) {
    return { ok: false, state: null, stale: false, say: `"${state}" is not one of ${TEST_STATES.join(", ")}` };
  }
  const pins = { requirement, scriptRevision, configuration, witness };
  const unpinned = Object.entries(pins).filter(([, v]) => !has(v)).map(([k]) => k);
  const stale = Boolean(priorConfiguration) && Boolean(configuration) && String(priorConfiguration) !== String(configuration);
  return {
    ok: s === "PASSED" && unpinned.length === 0 && !stale,
    state: s,
    unpinned,
    stale,
    say: stale
      ? `the configuration changed from ${priorConfiguration} to ${configuration}, which makes downstream acceptance stale — a retest is a new linked attempt`
      : unpinned.length
        ? `an attempt with no ${unpinned.join(", no ")} proves nothing`
        : `${s}`,
  };
}

/** The notes an approver reads. */
export function mobilisationNotes(receipt, opening) {
  const out = [];
  if (receipt && receipt.ok) {
    out.push(`ASSET RECEIPTED, NOT INSTALLED — ${receipt.say}. The delivery note is the only record that exists at this point `
      + "and it reads as completion to every system that sees it.");
  }
  if (opening && !opening.ok) {
    out.push(`SERVICE NOT OPEN — ${opening.say}.`);
  }
  if (opening && opening.state === "OPEN_RESTRICTED") {
    out.push(`RESTRICTED RELEASE — ${opening.say}. The restriction is the release: capacity, time and area, and it covers no mandatory requirement.`);
  }
  return out;
}
