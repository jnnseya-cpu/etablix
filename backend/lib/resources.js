/**
 * Resource workload — who is committed to what, and whether that fits.
 *
 * The one panel the portfolio dashboard could not honestly draw. The
 * arithmetic was never the problem: there was no people, department or
 * capacity data anywhere in the system, and a chart of invented
 * allocations would have been worse than no chart.
 *
 * So this is the mechanism, not the data. Capacity lives on the
 * employee record — a department and the hours a month that person is
 * genuinely available for project work, entered by an administrator in
 * Team. Allocations commit some of those hours to a project. Workload
 * is the rollup, and until real people carry real numbers the panel
 * says exactly what is missing instead of drawing something plausible.
 *
 * Two honesty rules the rollup keeps:
 *   - Only active employees with a stated capacity count. Someone with
 *     no capacity recorded is not treated as having zero, and not
 *     silently treated as infinite either — they are listed as
 *     unrecorded, so the gap is visible rather than averaged away.
 *   - Allocations to a project that no longer exists are surfaced as
 *     orphaned rather than quietly dropped from the totals.
 */

import { collection } from "./store.js";

/**
 * The functions ETABLIX actually hires into, per the playbook's hiring
 * sequence. A person's department decides which bar their hours land in.
 */
export const DEPARTMENTS = [
  "Delivery",
  "Commercial",
  "Technical",
  "Procurement",
  "HSEQ",
  "Business development",
  "Finance & administration",
];

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Employees who can carry project hours, with whatever capacity is recorded. */
export function people() {
  return collection("users")
    .filter((u) => u.active !== false)
    .map((u) => ({
      id: u.id,
      name: u.name,
      position: u.position || "",
      department: DEPARTMENTS.includes(u.department) ? u.department : "",
      capacityHours: num(u.capacityHours),
      hasCapacity: num(u.capacityHours) > 0 && DEPARTMENTS.includes(u.department),
    }));
}

/**
 * Workload by department: hours allocated against hours available.
 *
 * Returns the rollup plus everything that stopped a person counting, so
 * the panel can tell you why a department looks empty.
 */
export function workload() {
  const staff = people();
  const projects = collection("projects");
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const staffById = new Map(staff.map((s) => [s.id, s]));

  const rows = collection("allocations");
  const orphaned = [];
  const byDept = new Map();

  for (const dept of DEPARTMENTS) {
    const members = staff.filter((s) => s.department === dept && s.hasCapacity);
    if (!members.length) continue;
    byDept.set(dept, {
      department: dept,
      capacity: members.reduce((n, m) => n + m.capacityHours, 0),
      allocated: 0,
      people: members.length,
    });
  }

  for (const a of rows) {
    const person = staffById.get(a.userId);
    const project = projectById.get(a.projectId);
    if (!person || !project || !person.hasCapacity) {
      orphaned.push({
        id: a.id,
        hours: num(a.hours),
        reason: !person
          ? "the person is no longer an active employee"
          : !project
            ? "the project no longer exists"
            : "that person has no department and capacity recorded",
      });
      continue;
    }
    const row = byDept.get(person.department);
    if (row) row.allocated += num(a.hours);
  }

  const departments = [...byDept.values()]
    .map((d) => ({
      ...d,
      utilisation: d.capacity > 0 ? (d.allocated / d.capacity) * 100 : 0,
      over: d.allocated > d.capacity,
    }))
    .sort((a, b) => b.utilisation - a.utilisation);

  const unrecorded = staff.filter((s) => !s.hasCapacity);

  return {
    departments,
    orphaned,
    unrecorded: unrecorded.map((s) => ({ id: s.id, name: s.name, position: s.position })),
    totals: {
      capacity: departments.reduce((n, d) => n + d.capacity, 0),
      allocated: departments.reduce((n, d) => n + d.allocated, 0),
      peopleCounted: departments.reduce((n, d) => n + d.people, 0),
      peopleUnrecorded: unrecorded.length,
    },
    /**
     * What a person must do before this panel means anything. Null once
     * at least one department has capacity — the panel then stands on
     * real numbers, however few.
     */
    setupNote: departments.length
      ? null
      : staff.length
        ? "No capacity recorded yet. In Team, give each employee a department and the hours a month they are genuinely available for project work; then allocate those hours to projects here."
        : "No active employees yet. Create accounts in Team, record each person's department and monthly capacity, then allocate hours to projects here.",
  };
}

/** Allocations with the person and project resolved, for the table. */
export function allocationRows() {
  const staffById = new Map(people().map((s) => [s.id, s]));
  const projectById = new Map(collection("projects").map((p) => [p.id, p]));
  return collection("allocations")
    .map((a) => {
      const person = staffById.get(a.userId);
      const project = projectById.get(a.projectId);
      return {
        id: a.id,
        userId: a.userId,
        projectId: a.projectId,
        hours: num(a.hours),
        note: a.note || "",
        person: person?.name || "(no longer active)",
        department: person?.department || "",
        project: project?.code || "(project removed)",
        projectName: project?.name || "",
        valid: Boolean(person && project && person.hasCapacity),
      };
    })
    .sort((a, b) => String(a.project).localeCompare(String(b.project)) || String(a.person).localeCompare(String(b.person)));
}
