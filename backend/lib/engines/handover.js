/**
 * THE HANDOVER AGENT — a completeness score that forecasts a failed handover
 * BEFORE the contractual date rather than reporting one after it.
 *
 * That is the register's own condition and it is the whole difference. Every
 * project tracks handover documentation. Almost all of them track it as a
 * percentage of documents received, which reaches 90% about four weeks out
 * and then stops, because the last 10% is the evidence that does not exist
 * yet and cannot be chased into existence.
 *
 * Scoring per ASSET across the TWELVE evidence types changes what the number
 * means. 90% of documents received says nothing about whether any single
 * asset is handoverable. 40 assets complete out of 300 says exactly that.
 *
 * THE TWELVE, from the register's own list: submittals, approval,
 * installation evidence, inspection, testing, commissioning, defect closure,
 * training, certification, warranty, spares, operating procedure.
 *
 * THE ORDERING IS THE FORECAST. Some of the twelve can be produced in a week
 * and some cannot: a warranty starts when the manufacturer says it does, a
 * training session needs the client's people in a room, and a certificate
 * needs a third party's diary. So each type carries the lead time it really
 * has, and the forecast is built from the SLOWEST missing item per asset
 * rather than from the count of missing items.
 *
 * WHAT IT REFUSES:
 *
 *   · EVIDENCE RECORDED AS COMPLETE WITH NO REFERENCE. A tick with no
 *     document behind it is the whole failure mode of a handover tracker.
 *   · A DEFECT CLOSURE TICKED WHILE DEFECTS ARE OPEN against that asset.
 *   · A CERTIFICATE THAT EXPIRES BEFORE HANDOVER. The same rule as the
 *     submission controller: against the date it is assessed, not today.
 */

import { num } from "../l7/num.js";
import { day, asAtOr, moment } from "./moment.js";

const DAY = 86400000;

/** The twelve, each with the lead time it really has. */
export const EVIDENCE = [
  { key: "submittal", name: "Technical submittal", leadDays: 10 },
  { key: "approval", name: "Approval of the submittal", leadDays: 15 },
  { key: "installation", name: "Installation evidence", leadDays: 5 },
  { key: "inspection", name: "Inspection record", leadDays: 5 },
  { key: "testing", name: "Test results", leadDays: 10 },
  { key: "commissioning", name: "Commissioning record", leadDays: 20 },
  { key: "defects", name: "Defect closure", leadDays: 15 },
  { key: "training", name: "Training delivered", leadDays: 25, needsClient: true },
  { key: "certification", name: "Third-party certification", leadDays: 30, needsThirdParty: true },
  { key: "warranty", name: "Warranty documentation", leadDays: 20, needsThirdParty: true },
  { key: "spares", name: "Spares and consumables", leadDays: 35, needsThirdParty: true },
  { key: "operating", name: "Operating and maintenance procedure", leadDays: 15 },
];
const BY_KEY = new Map(EVIDENCE.map((e) => [e.key, e]));

/** One asset's evidence set. */
export function assetEvidence(raw = {}, { handoverDate = null, asAt = null, openDefects = 0 } = {}) {
  const faults = [];
  const at = asAtOr(asAt);
  const by = handoverDate ? moment(handoverDate) : null;
  const tag = String(raw.tag || raw.asset || "").trim();
  if (!tag) faults.push("no asset tag");

  const given = raw.evidence && typeof raw.evidence === "object" ? raw.evidence : {};
  const held = [];
  const missing = [];
  for (const e of EVIDENCE) {
    const row = given[e.key];
    const complete = row && row.complete === true;
    if (!complete) { missing.push(e.key); continue; }
    const ref = String(row.ref || "").trim();
    if (!ref) {
      faults.push(`${e.name} is ticked with no document reference. A tick with nothing behind it is the whole failure mode of a handover tracker.`);
      missing.push(e.key);
      continue;
    }
    const expires = row.expires ? moment(row.expires) : null;
    if (row.expires && expires === null) faults.push(`${e.name}: the expiry "${row.expires}" is not a date`);
    if (expires !== null && by !== null && expires < by) {
      faults.push(`${e.name} (${ref}) expires ${day(expires)}, before handover on ${day(by)}. Assessed against the handover date, not against today.`);
      missing.push(e.key);
      continue;
    }
    held.push({ key: e.key, ref, expires: expires === null ? null : day(expires) });
  }

  if (given.defects?.complete === true && openDefects > 0) {
    faults.push(`defect closure is ticked with ${openDefects} defect(s) still open against this asset`);
  }

  // The forecast: the slowest thing still missing, not the count.
  const slowest = missing
    .map((k) => BY_KEY.get(k))
    .filter(Boolean)
    .sort((a, b) => b.leadDays - a.leadDays)[0] || null;
  const needsDays = slowest ? slowest.leadDays : 0;
  const daysLeft = by === null ? null : Math.round((by - at) / DAY);
  const willMiss = daysLeft !== null && needsDays > daysLeft;

  return {
    ok: faults.length === 0 && missing.length === 0,
    faults,
    row: {
      tag: tag || null,
      held: held.length,
      of: EVIDENCE.length,
      percent: Math.round((held.length / EVIDENCE.length) * 100),
      missing,
      slowestMissing: slowest ? slowest.key : null,
      needsDays, daysLeft, willMiss,
      // Named because these three do not depend on effort. Chasing them
      // harder does not make them arrive sooner.
      blockedOnOthers: missing.filter((k) => BY_KEY.get(k)?.needsThirdParty || BY_KEY.get(k)?.needsClient),
    },
  };
}

/** The whole handover, forecast. */
export function forecast({ assets = [], handoverDate = null, asAt = null, defectsByAsset = {} } = {}) {
  const at = asAtOr(asAt);
  const by = handoverDate ? moment(handoverDate) : null;
  const checked = assets.map((a) => ({
    ...assetEvidence(a, { handoverDate: by, asAt: at, openDefects: num(defectsByAsset[String(a.tag || a.asset || "")]) || 0 }),
    given: a,
  }));
  const rows = checked.map((c) => c.row);
  const faulty = checked.filter((c) => c.faults.length).map((c) => ({ tag: c.given?.tag || c.given?.asset || null, faults: c.faults }));

  const complete = rows.filter((r) => r.missing.length === 0);
  const willMiss = rows.filter((r) => r.willMiss);
  const documentShare = rows.length
    ? Math.round((rows.reduce((t, r) => t + r.held, 0) / (rows.length * EVIDENCE.length)) * 100)
    : 0;
  const assetShare = rows.length ? Math.round((complete.length / rows.length) * 100) : 0;

  const blocked = new Map();
  for (const r of rows) for (const k of r.blockedOnOthers) blocked.set(k, (blocked.get(k) || 0) + 1);

  return {
    ok: willMiss.length === 0 && faulty.length === 0 && complete.length === rows.length,
    asAt: day(at),
    handoverDate: by === null ? null : day(by),
    assets: rows,
    faulty,
    willMiss,
    documentShare,
    assetShare,
    blocked: [...blocked.entries()].map(([key, n]) => ({ key, name: BY_KEY.get(key)?.name, assets: n })),
    // THE TWO NUMBERS, TOGETHER, ON PURPOSE. The first is the one every
    // handover tracker reports and it is the one that reaches 90% and stops.
    // The second is the one that says whether anything can actually be
    // handed over.
    say: [
      `${documentShare}% of the evidence is held, and ${assetShare}% of assets are complete on all ${EVIDENCE.length} types. The first number is the one every handover tracker reports; the second is the one that says whether anything can be handed over.`,
      faulty.length ? `${faulty.length} asset(s) carry a tick with nothing behind it or a certificate that expires first.` : null,
      willMiss.length && by !== null
        ? `${willMiss.length} asset(s) CANNOT be complete by ${day(by)}: the slowest thing still missing on each takes longer than the time left. That is arithmetic on lead times, not a view about anybody's effort — and it is the point of running this before the date rather than after it.`
        : by !== null ? `Every asset can still be complete by ${day(by)} on lead times alone.` : null,
      blocked.size
        ? `Waiting on somebody else: ${[...blocked.entries()].map(([k, n]) => `${BY_KEY.get(k)?.name.toLowerCase()} on ${n} asset(s)`).join(", ")}. Chasing these harder does not make them arrive sooner.`
        : null,
    ].filter(Boolean).join(" "),
  };
}

export function state() { return { evidenceTypes: EVIDENCE.length }; }
