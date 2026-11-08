/**
 * Concurrency and stored-utility autonomy — arithmetic, so no model asserts it.
 *
 * THE DOUBLE-COUNT IS THE DEFECT THIS EXISTS FOR. A site with a nominal
 * workforce of 100 can have 130 people standing in the welfare zone at shift
 * overlap, and the number nobody writes down is the one the compound is sized
 * against. Shift A has 72, shift B has 50, eight visitors are on site: add
 * them and you get 130, which is right only if those cohorts are genuinely
 * distinct. Add them when shift B's 50 includes 20 of shift A's people and
 * you get 130 against a true 110, and the welfare is oversized by a fifth.
 * Take the largest shift alone and you get 72 against a true 130, and the
 * queue at the canteen is the finding.
 *
 * So cohorts are unioned by identity where identities are known, and where
 * they are not, the overlap is a stated assumption rather than a silent one.
 * The specification is explicit: use the union of known cohorts to avoid
 * double counting, and where identities are absent, store bounded scenarios
 * with their source assumptions.
 *
 * AND THE NOMINAL FIGURE IS NEVER QUIETLY REPLACED. A brief saying "100
 * personnel" against a computed peak of 130 is not an error to correct, it is
 * a discrepancy to report: one of the two numbers is wrong, the client owns
 * both, and a platform that overwrites the brief has hidden the question.
 *
 * STORED-UTILITY AUTONOMY IS THE SAME SHAPE. A 10 m³ water store against 5.2
 * m³/day is not "about two days". It is 46.15 hours gross, and 36.92 hours if
 * an approved policy holds 2 m³ in reserve — and the second number is the one
 * that decides whether a tanker booked for Thursday is early or late. The
 * reserve is a policy input, never a default: a platform that assumes one has
 * invented a safety margin, and a platform that ignores one reports an
 * autonomy the site does not have.
 *
 * NONE OF THIS SETS A REQUIREMENT. Floor area per person, fixture ratios and
 * litres per head come from the applicable welfare requirements and the
 * client's standards, retrieved and versioned. This computes against inputs
 * somebody supplied; it does not know what is adequate.
 */

const round = (n, dp) => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};

const num = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};

/**
 * Peak concurrency across cohorts.
 *
 * `cohorts` is [{ id, count, members?, basis? }]. Where `members` is given,
 * the union is computed by identity and the answer is exact. Where it is not,
 * counts are summed and the result is marked as resting on an assumption that
 * the cohorts are distinct — which is the only honest thing to do with
 * headcounts and no names.
 */
export function peakConcurrency({ cohorts = [], nominal = null, zone = null } = {}) {
  const rows = (Array.isArray(cohorts) ? cohorts : []).filter(Boolean);
  if (!rows.length) {
    return { ok: false, peak: null, basis: "none", cohorts: [], unreadable: [],
             say: "no cohorts supplied, so there is no concurrency to compute" };
  }

  const unreadable = [];
  const read = [];
  for (const r of rows) {
    const id = String(r.id ?? "(unnamed cohort)");
    const members = Array.isArray(r.members) ? r.members.map(String) : null;
    const count = members ? members.length : num(r.count);
    if (count === null) { unreadable.push({ cohort: id, given: String(r.count ?? "(blank)") }); continue; }
    read.push({ id, count, members, basis: r.basis ? String(r.basis) : null });
  }
  if (!read.length) {
    return { ok: false, peak: null, basis: "none", cohorts: [], unreadable,
             say: "no cohort supplied a readable count" };
  }

  const withMembers = read.filter((r) => r.members);
  const withoutMembers = read.filter((r) => !r.members);

  // Identities first: a union is exact and a sum is not.
  const union = new Set();
  for (const r of withMembers) for (const m of r.members) union.add(m);
  const identified = union.size;
  const counted = withoutMembers.reduce((t, r) => t + r.count, 0);
  const peak = identified + counted;

  const exact = withoutMembers.length === 0;
  const overlapWithinIdentified = withMembers.reduce((t, r) => t + r.count, 0) - identified;

  return {
    ok: true,
    peak,
    exact,
    basis: exact ? "union by identity" : withMembers.length ? "union by identity, plus counts assumed distinct" : "counts assumed distinct",
    identified,
    counted,
    overlapRemoved: overlapWithinIdentified > 0 ? overlapWithinIdentified : 0,
    cohorts: read.map((r) => ({ id: r.id, count: r.count, identified: Boolean(r.members), basis: r.basis })),
    unreadable,
    // The brief's figure is reported against the computed one, never replaced.
    nominal: num(nominal),
    discrepancy: num(nominal) !== null && num(nominal) !== peak
      ? { nominal: num(nominal), peak, delta: peak - num(nominal) }
      : null,
    zone: zone ? String(zone) : null,
    say: exact
      ? `peak ${peak} by union of ${withMembers.length} identified cohort(s)`
          + (overlapWithinIdentified > 0 ? `, ${overlapWithinIdentified} duplicate membership(s) removed` : "")
      : `peak ${peak}, assuming ${withoutMembers.map((r) => r.id).join(", ")} are distinct cohorts`
          + (zone ? ` and all present in ${zone}` : ""),
  };
}

/**
 * Autonomy of a stored utility, in hours.
 *
 * `usable` is net usable store, not nominal tank volume — the difference is
 * draw-off level, sludge and unusable heel, and reporting nominal as usable
 * overstates autonomy by whatever that difference is. `reserve` is a policy
 * figure and is only applied when one is given.
 */
export function storedAutonomy({ people = null, litresPerPersonDay = null, usable = null, reserve = null, unit = "m3" } = {}) {
  const p = num(people);
  const l = num(litresPerPersonDay);
  const store = num(usable);
  const res = num(reserve);
  const missing = [];
  if (p === null) missing.push("the population");
  if (l === null) missing.push("litres per person per day");
  if (store === null) missing.push("net usable store");
  if (missing.length) {
    return { ok: false, demandPerDay: null, grossHours: null, operationalHours: null, missing,
             say: `autonomy cannot be computed without ${missing.join(" and ")}` };
  }
  if (p <= 0 || l <= 0) {
    return { ok: false, demandPerDay: 0, grossHours: null, operationalHours: null, missing: [],
             say: "a population or a per-person demand of zero gives no demand to divide into, so autonomy is not a number" };
  }

  // Litres to cubic metres: the specification's fixture is stated in both.
  const demandPerDay = round((p * l) / 1000, 4);
  const grossHours = round((store / demandPerDay) * 24, 2);
  const available = res === null ? store : store - res;
  const operationalHours = res === null ? null : round((available / demandPerDay) * 24, 2);

  return {
    ok: true,
    people: p,
    litresPerPersonDay: l,
    unit,
    demandPerDay,
    usable: store,
    reserve: res,
    available: round(available, 4),
    grossHours,
    operationalHours,
    negativeReserve: res !== null && available < 0,
    say: `${demandPerDay} ${unit}/day against ${store} ${unit} usable gives ${grossHours} hour(s) gross`
      + (res === null
          ? "; no reserve policy supplied, so no operational figure is given rather than one assumed"
          : available < 0
            ? `, and a reserve of ${res} ${unit} exceeds the store — there is no operational autonomy at all`
            : `, and ${operationalHours} hour(s) before a ${res} ${unit} reserve`),
  };
}

/** The notes an approver reads. */
export function capacityNotes(peak, autonomy) {
  const out = [];
  if (peak && peak.ok && peak.discrepancy) {
    out.push(`CONCURRENCY AGAINST THE BRIEF — the brief states ${peak.discrepancy.nominal} and the cohorts compute to `
      + `${peak.discrepancy.peak}, a difference of ${peak.discrepancy.delta}. Both figures belong to the client and one of them is wrong. `
      + "The computed figure is not substituted for the brief's: sizing against either without resolving it is a decision nobody made.");
  }
  if (peak && peak.ok && !peak.exact) {
    out.push(`CONCURRENCY RESTS ON AN ASSUMPTION — ${peak.say}. Supplying cohort membership rather than headcounts makes this exact; `
      + "until then the figure is an upper bound and the overlap is unmeasured.");
  }
  if (peak && peak.unreadable?.length) {
    out.push(`A COHORT WITH NO READABLE COUNT — ${peak.unreadable.map((x) => `${x.cohort} ("${x.given}")`).join(", ")}.`);
  }
  if (autonomy && autonomy.ok && autonomy.operationalHours === null) {
    out.push(`STORED AUTONOMY WITH NO RESERVE POLICY — ${autonomy.grossHours} hour(s) gross is the whole store run to empty. `
      + "No operational figure is given because no reserve was supplied, and inventing one would be inventing a safety margin.");
  }
  if (autonomy && autonomy.negativeReserve) {
    out.push(`THE RESERVE EXCEEDS THE STORE — ${autonomy.reserve} against ${autonomy.usable} usable. There is no operational autonomy; `
      + "the store is below its own reserve from the moment it is filled.");
  }
  return out;
}

/**
 * OVERNIGHT ACCOMMODATION IS NOT LARGER DAY-USE WELFARE.
 *
 * A day-use welfare cabin sized for 130 people at shift overlap does not
 * become sleeping accommodation for 40 by adding beds. The demand is
 * different — bed-nights rather than a concurrency peak — and so is almost
 * everything else: usable room stock against rooming constraints, arrival
 * and departure profile, cleaning turnaround between occupants, and a fire
 * and occupation approval that is a different approval from the one a day
 * cabin holds.
 *
 * THE SPECIFIC HAZARD. Somebody adds "and they'll sleep there" to a brief
 * late, the layout is already drawn, and the compound opens with people
 * sleeping in a building consented for day use. On Skye that is a building
 * warrant question with a use classification and a fire requirement attached,
 * and it is decided by a verifier, not by the person who drew the layout.
 *
 * So overnight demand is computed separately, and overnight OPENING is held
 * until the approvals that only overnight use needs are evidenced. Day-use
 * opening is unaffected: the welfare that passed stays open.
 */

/** What only overnight use needs, and what a day cabin's consent does not cover. */
export const OVERNIGHT_APPROVALS = ["fireApproval", "occupationApproval", "useClassification"];

/**
 * Beds, from bed-night demand rather than from a headcount.
 *
 * `bedNights` is demand over the period. `roomStock` is USABLE rooms, after
 * rooming constraints. `turnaroundHours` is cleaning between occupants, which
 * takes a room out of service and is the figure people leave out.
 */
export function bedRequirement({
  bedNights = null, nights = null, roomStock = null, bedsPerRoom = 1,
  turnaroundHours = null, arrivalsPerDay = null, approvals = {},
} = {}) {
  const demand = num(bedNights);
  const n = num(nights);
  const stock = num(roomStock);
  const per = num(bedsPerRoom) ?? 1;
  const turn = num(turnaroundHours);

  const missing = [];
  if (demand === null) missing.push("bed-night demand");
  if (n === null || n <= 0) missing.push("the number of nights");
  if (stock === null) missing.push("usable room stock");
  if (missing.length) {
    return { ok: false, bedsNeeded: null, missing, held: true,
             say: `overnight demand cannot be computed without ${missing.join(" and ")} — and a headcount is not bed-night demand` };
  }

  const bedsNeeded = Math.ceil(demand / n);
  const bedsAvailable = stock * per;
  // Turnaround takes a room out of service; without it the figure is optimistic.
  const effective = turn === null ? bedsAvailable : Math.floor(bedsAvailable * (1 - Math.min(turn, 24) / 24));
  const shortfall = bedsNeeded - effective;

  const absent = OVERNIGHT_APPROVALS.filter((k) => !(approvals && (approvals[k] === true || approvals[k] === "verified")));

  return {
    ok: shortfall <= 0 && absent.length === 0,
    bedsNeeded,
    bedsAvailable,
    effectiveBeds: effective,
    turnaroundApplied: turn !== null,
    shortfall: shortfall > 0 ? shortfall : 0,
    missingApprovals: absent,
    // Overnight opening is held on its own approvals; day-use is untouched.
    held: absent.length > 0 || shortfall > 0,
    say: absent.length
      ? `OVERNIGHT OPENING HELD — no ${absent.join(", no ")}. These are not the day cabin's consent: sleeping accommodation is a `
        + "separate use classification with its own fire requirement, decided by the verifier and not by the layout"
      : shortfall > 0
        ? `${bedsNeeded} bed(s) needed against ${effective} effective`
          + (turn === null ? " (no cleaning turnaround applied, so even that is optimistic)" : ` after ${turn}h turnaround`)
          + ` — short by ${shortfall}`
        : `${bedsNeeded} bed(s) needed against ${effective} effective, and the overnight approvals are held`,
  };
}

/** Day-use and overnight, reported apart, because they open apart. */
export function welfareSplit({ dayUse = null, overnight = null } = {}) {
  return {
    dayUse: dayUse || null,
    overnight: overnight || null,
    dayUseOpens: Boolean(dayUse && dayUse.ok),
    overnightOpens: Boolean(overnight && overnight.ok),
    say: `day-use ${dayUse && dayUse.ok ? "sized" : "not established"}; overnight `
       + `${overnight ? (overnight.ok ? "sized and approved" : "HELD") : "not requested"}`
       + ". The two are distinct and a held overnight opening does not close the welfare that passed",
  };
}
