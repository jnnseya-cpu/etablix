/**
 * CONSTRUX write validation — what a delivery record has to be before it is
 * allowed into the system.
 *
 * Until now CONSTRUX was read-only apart from a manual RAG override, so every
 * schedule activity, inspection, non-conformance, RFI and sensor reading came
 * from the seed or from nowhere. Opening the write path is the useful part;
 * opening it without these checks is how a delivery record becomes a thing
 * nobody trusts inside a month.
 *
 * THE CHECKS THAT MATTER ARE THE CONTRADICTIONS, not the missing fields.
 *
 * A missing field is caught by anybody reading the row. A row that is
 * internally impossible reads perfectly and is believed:
 *
 *   · AN INSPECTION RECORDED AS PASSED WITH FAILURES LISTED. Both halves look
 *     like data entry. Together they mean nobody knows whether the welfare
 *     compound was accepted, and the row will be cited as evidence that it
 *     was.
 *   · AN ACTIVITY THAT ENDS BEFORE IT STARTS. Arithmetic on it produces a
 *     negative duration, which propagates into every float calculation that
 *     touches it and turns a critical path into nonsense.
 *   · A NON-CONFORMANCE CLOSED WITH NOTHING CLOSING IT. The commonest way a
 *     defect is "resolved": somebody changes a dropdown. A closure with no
 *     evidence and no closer is an open defect wearing a green label, and it
 *     is the one that reappears at handover.
 *   · A SENSOR READING PAST ITS OWN THRESHOLD MARKED OK. The threshold exists
 *     to raise an alarm. A reading above it recorded as fine is an alarm that
 *     was turned off at the point of entry.
 *   · 100 PER CENT PROGRESS ON AN ACTIVITY THAT HAS NOT FINISHED. Complete
 *     with a future end date is either a wrong date or a wrong claim, and
 *     both are worth stopping to look at.
 *
 * Every one of those is refused rather than warned about, on the same
 * reasoning as every other gate in this system: a warning on a screen at the
 * moment somebody is typing is a warning that gets dismissed.
 */

import { instant } from "./l7/evidence.js";
import { num } from "./l7/num.js";

/** The statuses each record may carry. Anything else is refused. */
export const SCHEDULE_PHASES = ["Set-up", "Mobilisation", "Delivery", "Closeout", "Handover"];
export const INSPECTION_STATUS = ["scheduled", "in_progress", "passed", "failed"];
export const NCR_SEVERITY = ["minor", "major", "critical"];
export const NCR_STATUS = ["open", "in_progress", "closed", "escalated"];
export const RFI_STATUS = ["open", "answered", "closed", "escalated"];
export const RFI_PRIORITY = ["low", "medium", "high", "critical"];
export const SENSOR_STATUS = ["ok", "warning", "alarm", "offline"];

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A day, or null. Strict: a description of a date is not a date. */
function day(value) {
  const s = String(value == null ? "" : value).trim();
  if (!ISO_DAY.test(s)) return null;
  return instant(s);
}

function base(faults, row, { projectId, projects }) {
  if (!projectId) faults.push("no project");
  else if (projects && !projects.some((p) => p.id === String(projectId) || p.code === String(projectId))) {
    faults.push(`no project matches "${projectId}" — a delivery record against a project that does not exist is a record nobody will ever find`);
  }
  return row;
}

/** A schedule activity. */
export function validateActivity(raw = {}, { projects = null } = {}) {
  const faults = [];
  base(faults, raw, { projectId: raw.projectId, projects });
  const activity = String(raw.activity || "").trim();
  if (!activity) faults.push("no activity name");
  const phase = String(raw.phase || "").trim();
  if (phase && !SCHEDULE_PHASES.includes(phase)) faults.push(`"${phase}" is not one of ${SCHEDULE_PHASES.join(", ")}`);

  const start = day(raw.start);
  const end = day(raw.end);
  if (start === null) faults.push(`start "${raw.start}" is not a date in YYYY-MM-DD`);
  if (end === null) faults.push(`end "${raw.end}" is not a date in YYYY-MM-DD`);
  if (start !== null && end !== null && end < start) {
    faults.push("the activity ends before it starts. Arithmetic on a negative duration propagates into every float calculation that touches it.");
  }

  const progress = num(raw.progress);
  if (progress === null) faults.push("progress is not a number");
  else if (progress < 0 || progress > 100) faults.push(`progress of ${progress} is outside 0 to 100`);
  else if (progress === 100 && end !== null && end > Date.now()) {
    faults.push(`recorded as 100% complete with an end date of ${raw.end}, which is in the future. Either the date is wrong or the claim is, and both are worth stopping for.`);
  }
  if (raw.critical !== undefined && typeof raw.critical !== "boolean") faults.push("critical must be true or false");

  return {
    ok: faults.length === 0,
    faults,
    record: faults.length === 0 ? {
      projectId: String(raw.projectId),
      activity,
      phase: phase || "Delivery",
      start: String(raw.start),
      end: String(raw.end),
      progress,
      critical: raw.critical === true,
    } : null,
  };
}

/** An inspection. */
export function validateInspection(raw = {}, { projects = null } = {}) {
  const faults = [];
  base(faults, raw, { projectId: raw.projectId, projects });
  const type = String(raw.type || "").trim();
  if (!type) faults.push("no inspection type");
  const inspector = String(raw.inspector || "").trim();
  if (!inspector) faults.push("no inspector named — an inspection nobody signed is not an inspection");
  const status = String(raw.status || "").trim();
  if (!INSPECTION_STATUS.includes(status)) faults.push(`"${status}" is not one of ${INSPECTION_STATUS.join(", ")}`);
  if (day(raw.date) === null) faults.push(`date "${raw.date}" is not a date in YYYY-MM-DD`);

  const items = num(raw.items);
  const failures = num(raw.failures);
  const score = num(raw.score);
  if (items === null || items < 0) faults.push("items is not a count");
  if (failures === null || failures < 0) faults.push("failures is not a count");
  if (items !== null && failures !== null && failures > items) {
    faults.push(`${failures} failures against ${items} items — more things failed than were checked`);
  }
  if (score !== null && (score < 0 || score > 100)) faults.push(`a score of ${score} is outside 0 to 100`);

  // THE CONTRADICTION. Both halves look like data entry; together they mean
  // nobody knows whether the thing was accepted.
  if (status === "passed" && failures !== null && failures > 0) {
    faults.push(`recorded as PASSED with ${failures} failure(s) listed. A pass with failures is not a pass, and this row would be cited as evidence that it was.`);
  }
  if (status === "failed" && failures === 0) {
    faults.push("recorded as FAILED with no failures listed. Whatever failed has to be written down or nobody can close it.");
  }
  if ((status === "scheduled" || status === "in_progress") && score !== null) {
    faults.push(`a score of ${score} on an inspection that has not been carried out`);
  }

  return {
    ok: faults.length === 0,
    faults,
    record: faults.length === 0 ? {
      projectId: String(raw.projectId),
      ref: raw.ref ? String(raw.ref) : null,
      type, inspector, status,
      score: score === null ? null : score,
      date: String(raw.date),
      items, failures,
    } : null,
  };
}

/** A non-conformance. */
export function validateNcr(raw = {}, { projects = null } = {}) {
  const faults = [];
  base(faults, raw, { projectId: raw.projectId, projects });
  const title = String(raw.title || "").trim();
  if (!title) faults.push("no title");
  if (title && title.length < 12) faults.push("the title is too short to identify the defect later");
  const severity = String(raw.severity || "").trim();
  if (!NCR_SEVERITY.includes(severity)) faults.push(`"${severity}" is not one of ${NCR_SEVERITY.join(", ")}`);
  const status = String(raw.status || "").trim();
  if (!NCR_STATUS.includes(status)) faults.push(`"${status}" is not one of ${NCR_STATUS.join(", ")}`);
  if (!String(raw.assignedTo || "").trim()) faults.push("nobody is assigned — an unassigned non-conformance is a defect with no owner");

  // THE ONE THAT MATTERS. Changing a dropdown is how defects get "resolved".
  if (status === "closed") {
    if (!String(raw.closureEvidence || "").trim()) {
      faults.push("closed with no closure evidence. A non-conformance closed by changing a dropdown is an open defect wearing a green label, and it is the one that reappears at handover.");
    }
    if (!String(raw.closedBy || "").trim()) faults.push("closed by nobody");
    if (day(raw.closedAt) === null) faults.push(`closed on "${raw.closedAt}", which is not a date`);
  }
  if (severity === "critical" && status === "closed" && !String(raw.verifiedBy || "").trim()) {
    faults.push("a CRITICAL non-conformance closed without a second person verifying it. The severity is the reason.");
  }

  return {
    ok: faults.length === 0,
    faults,
    record: faults.length === 0 ? {
      projectId: String(raw.projectId),
      ref: raw.ref ? String(raw.ref) : null,
      title, severity, status,
      assignedTo: String(raw.assignedTo).trim(),
      closureEvidence: raw.closureEvidence ? String(raw.closureEvidence).trim() : null,
      closedBy: raw.closedBy ? String(raw.closedBy).trim() : null,
      closedAt: raw.closedAt ? String(raw.closedAt) : null,
      verifiedBy: raw.verifiedBy ? String(raw.verifiedBy).trim() : null,
    } : null,
  };
}

/** An RFI. */
export function validateRfi(raw = {}, { projects = null } = {}) {
  const faults = [];
  base(faults, raw, { projectId: raw.projectId, projects });
  const subject = String(raw.subject || "").trim();
  if (!subject) faults.push("no subject");
  if (subject && subject.length < 12) faults.push("the subject is too short to answer without opening the record");
  const status = String(raw.status || "").trim();
  if (!RFI_STATUS.includes(status)) faults.push(`"${status}" is not one of ${RFI_STATUS.join(", ")}`);
  const priority = String(raw.priority || "").trim();
  if (!RFI_PRIORITY.includes(priority)) faults.push(`"${priority}" is not one of ${RFI_PRIORITY.join(", ")}`);
  if (!String(raw.raisedBy || "").trim()) faults.push("nobody raised it");

  if (status === "answered" || status === "closed") {
    if (!String(raw.answer || "").trim()) {
      faults.push(`marked ${status} with no answer recorded. An RFI closed without its answer is a question that will be asked again.`);
    }
    if (!String(raw.answeredBy || "").trim()) faults.push(`marked ${status} with nobody named as answering it`);
  }
  // A critical RFI with no date needed is a priority nobody can work back from.
  if (priority === "critical" && day(raw.neededBy) === null) {
    faults.push("a CRITICAL RFI with no date it is needed by. The priority is the claim; the date is what makes it actionable.");
  }

  return {
    ok: faults.length === 0,
    faults,
    record: faults.length === 0 ? {
      projectId: String(raw.projectId),
      number: raw.number ? String(raw.number) : null,
      subject, status, priority,
      raisedBy: String(raw.raisedBy).trim(),
      neededBy: raw.neededBy ? String(raw.neededBy) : null,
      answer: raw.answer ? String(raw.answer).trim() : null,
      answeredBy: raw.answeredBy ? String(raw.answeredBy).trim() : null,
    } : null,
  };
}

/** A sensor reading. */
export function validateReading(raw = {}, { projects = null } = {}) {
  const faults = [];
  base(faults, raw, { projectId: raw.projectId, projects });
  if (!String(raw.sensor || "").trim()) faults.push("no sensor identifier");
  if (!String(raw.kind || "").trim()) faults.push("no reading kind");
  if (!String(raw.location || "").trim()) faults.push("no location — a reading from nowhere cannot be acted on");
  if (!String(raw.unit || "").trim()) faults.push("no unit. A bare number is not a measurement.");

  const value = num(raw.value);
  const threshold = num(raw.threshold);
  const status = String(raw.status || "").trim();
  // An offline sensor has no reading, so the value is required for every
  // other status and refused for that one. Requiring it unconditionally made
  // an offline sensor impossible to record at all: with a value it was
  // refused as a reading from a sensor that is not reporting, and without one
  // it was refused as a missing number. The gap between the two was a sensor
  // that had stopped sending and could not be written down.
  if (status !== "offline" && value === null) faults.push("the value is not a number");
  if (!SENSOR_STATUS.includes(status)) faults.push(`"${status}" is not one of ${SENSOR_STATUS.join(", ")}`);
  if (status !== "offline" && threshold === null) faults.push("no threshold, so nothing can say whether the reading is a problem");

  // THE ALARM TURNED OFF AT THE POINT OF ENTRY.
  if (value !== null && threshold !== null && value > threshold && status === "ok") {
    faults.push(`${value}${raw.unit || ""} is above the threshold of ${threshold} and recorded as OK. The threshold exists to raise an alarm; a reading past it marked fine is an alarm switched off where nobody will look for it.`);
  }
  if (status === "offline" && value !== null) {
    faults.push("recorded as offline with a value. A reading from a sensor that is offline came from somewhere else.");
  }
  // And an offline sensor still has to say WHICH sensor and where, because
  // "one of them stopped" is not something anybody can act on. Those are
  // checked above for every status, including this one.

  return {
    ok: faults.length === 0,
    faults,
    record: faults.length === 0 ? {
      projectId: String(raw.projectId),
      sensor: String(raw.sensor).trim(),
      kind: String(raw.kind).trim(),
      location: String(raw.location).trim(),
      value: status === "offline" ? null : value,
      unit: String(raw.unit).trim(),
      threshold: threshold === null ? null : threshold,
      status,
      readAt: Date.now(),
    } : null,
  };
}

/** The next reference in a series, continuing from the highest ever used. */
export function nextRef(rows, field, prefix) {
  let highest = 0;
  const re = new RegExp(`^${prefix}-0*(\\d+)$`);
  for (const r of rows) {
    const m = re.exec(String(r[field] || ""));
    if (m) highest = Math.max(highest, Number(m[1]));
  }
  return `${prefix}-${String(highest + 1).padStart(3, "0")}`;
}

/** One entry point, so a route never has to pick a validator by hand. */
export const VALIDATORS = {
  schedule: validateActivity,
  inspections: validateInspection,
  ncrs: validateNcr,
  rfis: validateRfi,
  sensors: validateReading,
};

export const REF_FIELDS = {
  inspections: { field: "ref", prefix: "INS" },
  ncrs: { field: "ref", prefix: "NCR" },
  rfis: { field: "number", prefix: "RFI" },
};
