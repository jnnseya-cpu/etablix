/**
 * Roles, permissions and delegated authority — and the two sentences in the
 * specification that most systems get wrong.
 *
 *     "A user who can edit a response does not automatically gain access to
 *      the price or the contract departures."
 *
 *     "Agent identity must be distinct from the user identity that
 *      authorised the run."
 *
 * The first is about how permission is usually built. Somebody is "on the
 * bid team", so they get the bid workspace, and the bid workspace contains
 * the price. Nobody decided that the graduate writing the health and safety
 * section should see the margin; it simply came with the folder. On a
 * competitive tender that is the single most valuable piece of information
 * in the building and it is the least protected.
 *
 * The second is subtler and worse. An agent started by the commercial
 * director is not the commercial director. If it inherits their identity it
 * inherits their signing authority, and every approval gate downstream reads
 * an action taken with the director's permission — which no human took. The
 * agent's identity here is its own, it carries the roles the RUN was granted
 * rather than the roles the person holds, and the person who authorised it is
 * recorded separately as exactly that.
 *
 * RBAC FOR THE BUNDLE, ABAC FOR THE REST. A role says what kind of thing
 * somebody may do. The attributes say on which tender, for which client, up
 * to what value, in which region, for how long — and a delegation that does
 * not expire is not a delegation, it is a promotion nobody announced.
 */

import { ROLES } from "../../../shared/constants.js";
import { ACTIONS, authorityFor } from "./policy.js";
import { num } from "./num.js";

/** The thirteen roles of the specification, with their default scope. */
export const BID_ROLES = [
  { id: "PLATFORM_ADMINISTRATOR", name: "Platform Administrator",
    scope: "Tenant provisioning and platform policy",
    // The most important word in this file.
    tenderContent: false,
    note: "NO implicit access to client tender content — administering a platform is not a reason to read a competitor-sensitive price" },
  { id: "ENTERPRISE_ADMINISTRATOR", name: "Enterprise Administrator",
    scope: "Identity, integrations, retention, policies and entitlements", tenderContent: false },
  { id: "EXECUTIVE_SPONSOR", name: "Executive Sponsor",
    scope: "Pursuit, risk appetite, award and high-value approval", tenderContent: true },
  { id: "BID_DIRECTOR", name: "Bid Director",
    scope: "Tender plan, team, strategy, readiness and submission recommendation", tenderContent: true },
  { id: "COMMERCIAL_AUTHORITY", name: "Commercial Authority",
    scope: "Estimate, price, cash, qualifications and commercial risk", tenderContent: true },
  { id: "TECHNICAL_AUTHORITY", name: "Technical Authority",
    scope: "Technical solution and engineering review", tenderContent: true },
  { id: "PLANNER", name: "Planner",
    scope: "Programme, logic, resources and scenario review", tenderContent: true },
  { id: "ESTIMATOR", name: "Estimator",
    scope: "Quantities, rates, quotes and estimate preparation", tenderContent: true },
  { id: "LEGAL_REVIEWER", name: "Legal Reviewer",
    scope: "Contract departures and legal risk review", tenderContent: true },
  { id: "CONTRIBUTOR", name: "Contributor",
    scope: "Assigned requirements and response sections only", tenderContent: true },
  { id: "EXTERNAL_PARTNER", name: "External Partner",
    scope: "Explicitly shared work packages and documents only", tenderContent: true },
  { id: "AUDITOR", name: "Auditor",
    scope: "Read-only evidence, decision and event access", tenderContent: true },
  { id: "SUBMISSION_SIGNATORY", name: "Submission Signatory",
    scope: "Final approval and the authorised submission action", tenderContent: true },
  { id: "KNOWLEDGE_STEWARD", name: "Knowledge Steward",
    scope: "Approved lessons and the promotion of knowledge", tenderContent: true },
];

const ROLE_BY_ID = new Map(BID_ROLES.map((r) => [r.id, r]));

/**
 * The content classes a bid is divided into. This is the list that stops the
 * response editor reading the margin: access is granted per class, never per
 * folder.
 */
export const CONTENT_CLASSES = [
  { id: "requirements", name: "Requirements and compliance matrix" },
  { id: "response", name: "Response sections and narrative" },
  { id: "evidence", name: "Evidence registry" },
  { id: "price", name: "Estimate, rates, margin and price", sensitive: true },
  { id: "contract", name: "Contract departures and legal position", sensitive: true },
  { id: "programme", name: "Programme and resources" },
  { id: "strategy", name: "Win themes, competitor view and bid strategy", sensitive: true },
  { id: "decisions", name: "Decisions, approvals and the event log" },
];

const CLASS_BY_ID = new Map(CONTENT_CLASSES.map((c) => [c.id, c]));

/** Read and write, per role, per content class. Absent means no access. */
export const GRANTS = {
  PLATFORM_ADMINISTRATOR: {},
  ENTERPRISE_ADMINISTRATOR: {},
  EXECUTIVE_SPONSOR: { requirements: "read", response: "read", evidence: "read", price: "read", contract: "read", programme: "read", strategy: "write", decisions: "write" },
  BID_DIRECTOR: { requirements: "write", response: "write", evidence: "write", price: "read", contract: "read", programme: "read", strategy: "write", decisions: "write" },
  COMMERCIAL_AUTHORITY: { requirements: "read", response: "read", evidence: "read", price: "write", contract: "write", programme: "read", strategy: "read", decisions: "write" },
  TECHNICAL_AUTHORITY: { requirements: "read", response: "write", evidence: "read", programme: "read", decisions: "write" },
  PLANNER: { requirements: "read", response: "read", programme: "write", decisions: "read" },
  ESTIMATOR: { requirements: "read", price: "write", programme: "read", decisions: "read" },
  LEGAL_REVIEWER: { requirements: "read", response: "read", contract: "write", decisions: "read" },
  // The whole point, in one line: response write, and nothing on price or
  // contract. Not "read". Absent.
  CONTRIBUTOR: { requirements: "read", response: "write", evidence: "read" },
  EXTERNAL_PARTNER: { response: "write" },
  AUDITOR: { requirements: "read", response: "read", evidence: "read", price: "read", contract: "read", programme: "read", strategy: "read", decisions: "read" },
  SUBMISSION_SIGNATORY: { requirements: "read", response: "read", evidence: "read", price: "read", contract: "read", programme: "read", decisions: "write" },
  KNOWLEDGE_STEWARD: { decisions: "read", response: "read" },
};

/**
 * The bridge to the roles this system already has. A real user holds one of
 * six employee roles; a bid role is what that means on a tender. Without this
 * mapping the thirteen roles above would be a list nobody could be assigned.
 */
export const ROLE_MAPPING = {
  [ROLES.ADMIN]: ["ENTERPRISE_ADMINISTRATOR", "BID_DIRECTOR", "SUBMISSION_SIGNATORY", "EXECUTIVE_SPONSOR", "LEGAL_REVIEWER", "KNOWLEDGE_STEWARD"],
  [ROLES.COMMERCIAL_MANAGER]: ["COMMERCIAL_AUTHORITY", "ESTIMATOR"],
  [ROLES.OPERATIONS_DIRECTOR]: ["EXECUTIVE_SPONSOR", "BID_DIRECTOR", "TECHNICAL_AUTHORITY"],
  [ROLES.PROJECT_MANAGER]: ["PLANNER", "CONTRIBUTOR", "TECHNICAL_AUTHORITY"],
  [ROLES.SITE_ENGINEER]: ["CONTRIBUTOR"],
  [ROLES.QA_INSPECTOR]: ["CONTRIBUTOR", "AUDITOR"],
};

/**
 * IN A SMALL BUSINESS ONE PERSON HOLDS SEVERAL OF THESE, and the mapping
 * above says so rather than pretending otherwise. An administrator here
 * carries six bid roles, which on paper means one person can satisfy every
 * approval on a tender.
 *
 * What stops that is not the role list. It is that segregation is checked
 * against the PERSON, not the role: the gate engine refuses an approval whose
 * approver is the author, whichever hat they were wearing, and refuses one
 * person making up a quorum of two. So a single administrator can move a bid
 * through the gates they did not author and is blocked at the ones they did —
 * which is the correct answer for a business of this size, and is a real
 * constraint rather than an org chart.
 *
 * The alternative — declaring roles the business does not have — would leave
 * gates that nobody can ever pass, and gates nobody can pass get removed.
 */

/** Roles held by people outside the business, so no employee role maps them. */
export const EXTERNAL_ONLY = new Set(["EXTERNAL_PARTNER"]);

/** The bid roles an employee role carries. */
export function bidRolesFor(employeeRole) {
  return (ROLE_MAPPING[String(employeeRole)] || []).slice();
}

/** The strongest access a set of roles has to a content class. */
export function accessTo(roles = [], contentClass) {
  const cls = CLASS_BY_ID.get(String(contentClass));
  if (!cls) return { level: "none", reason: `"${contentClass}" is not a content class` };
  let level = "none";
  const from = [];
  for (const r of roles) {
    const grant = (GRANTS[String(r)] || {})[cls.id];
    if (!grant) continue;
    from.push(r);
    if (grant === "write") level = "write";
    else if (level !== "write") level = "read";
  }
  return { level, contentClass: cls.id, sensitive: cls.sensitive === true, from, reason: level === "none" ? `no role held grants access to ${cls.name}` : `${level} via ${from.join(", ")}` };
}

/**
 * An attribute-based check on top of the role bundle. Every one of these has
 * blocked a real leak somewhere: the wrong legal entity, the wrong client,
 * a work package a partner was never shared, a delegation that never ended.
 */
export function checkAttributes({ subject = {}, object = {}, at = null } = {}) {
  const faults = [];
  const now = at ? Date.parse(at) : Date.now();

  if (object.tenantId && subject.tenantId && String(object.tenantId) !== String(subject.tenantId)) {
    faults.push("a different tenant");
  }
  if (object.legalEntityId && subject.legalEntityIds && !subject.legalEntityIds.map(String).includes(String(object.legalEntityId))) {
    faults.push("a legal entity this user is not part of");
  }
  if (object.tenderId && subject.tenderIds && !subject.tenderIds.map(String).includes(String(object.tenderId))) {
    faults.push("a tender this user is not on");
  }
  if (object.clientId && subject.barredClientIds && subject.barredClientIds.map(String).includes(String(object.clientId))) {
    faults.push("a client this user is conflicted out of");
  }
  if (object.workPackageId && subject.workPackageIds && !subject.workPackageIds.map(String).includes(String(object.workPackageId))) {
    faults.push("a work package that was never shared with this user");
  }
  if (object.region && subject.permittedRegions && !subject.permittedRegions.map(String).includes(String(object.region))) {
    faults.push(`content held in ${object.region}`);
  }
  const value = num(object.value);
  const limit = num(subject.valueLimit);
  if (value !== null) {
    if (limit === null) faults.push("a value with no limit recorded against this user");
    else if (value > limit) faults.push(`a value of ${value} above this user's limit of ${limit}`);
  }
  // A delegation with no end is not a delegation.
  if (subject.delegation) {
    const until = Date.parse(String(subject.delegation.until || ""));
    if (!Number.isFinite(until)) faults.push("a delegation with no end date, which is a promotion nobody announced");
    else if (until < now) faults.push(`a delegation that expired on ${subject.delegation.until}`);
  }
  return { ok: faults.length === 0, faults, say: faults.length ? `refused: ${faults[0]}` : "every attribute matches" };
}

/**
 * An identity. `kind` is "human" or "agent", and an agent's identity is its
 * own: it carries the roles GRANTED TO THE RUN, and names separately the
 * person who authorised it. It never inherits their roles.
 */
export function identity(raw = {}) {
  const kind = raw.kind === "agent" ? "agent" : "human";
  const granted = Array.isArray(raw.roles) ? raw.roles.map(String).filter((r) => ROLE_BY_ID.has(r)) : [];
  // Carried through re-normalisation. identity() is called on its own output
  // in may(), and the first version recomputed this from the already-filtered
  // roles — so a nonexistent role was reported once and then forgotten, and
  // the call that actually decides permission never saw it.
  const invalid = [
    ...(Array.isArray(raw.roles) ? raw.roles.map(String).filter((r) => !ROLE_BY_ID.has(r)) : []),
    ...(Array.isArray(raw.invalidRoles) ? raw.invalidRoles.map(String) : []),
  ];
  return {
    kind,
    id: String(raw.id || ""),
    name: raw.name ? String(raw.name) : null,
    roles: granted,
    invalidRoles: [...new Set(invalid)],
    // Present on agents only, and never used as a source of permission.
    authorisedBy: kind === "agent" && raw.authorisedBy ? String(raw.authorisedBy) : null,
    runId: raw.runId ? String(raw.runId) : null,
    tenantId: raw.tenantId ? String(raw.tenantId) : null,
    legalEntityIds: Array.isArray(raw.legalEntityIds) ? raw.legalEntityIds.map(String) : null,
    tenderIds: Array.isArray(raw.tenderIds) ? raw.tenderIds.map(String) : null,
    workPackageIds: Array.isArray(raw.workPackageIds) ? raw.workPackageIds.map(String) : null,
    barredClientIds: Array.isArray(raw.barredClientIds) ? raw.barredClientIds.map(String) : null,
    permittedRegions: Array.isArray(raw.permittedRegions) ? raw.permittedRegions.map(String) : null,
    valueLimit: num(raw.valueLimit),
    delegation: raw.delegation ? { by: String(raw.delegation.by || ""), until: raw.delegation.until ? String(raw.delegation.until) : null } : null,
  };
}

/**
 * An agent identity derived from a person's authorisation — the ONLY correct
 * way to build one. The agent gets the roles the run was granted, which must
 * be a subset of what the person holds, and never more.
 */
export function agentIdentityFrom(person, { runId, grantRoles = [], agentId = "agent" } = {}) {
  const p = identity(person);
  const held = new Set(p.roles);
  const granted = grantRoles.map(String).filter((r) => ROLE_BY_ID.has(r));
  const escalating = granted.filter((r) => !held.has(r));
  if (escalating.length) {
    return {
      ok: false,
      escalating,
      say: `the run would be granted ${escalating.join(", ")}, which ${p.name || p.id} does not hold — an agent cannot be given authority its authoriser lacks`,
      identity: null,
    };
  }
  return {
    ok: true,
    escalating: [],
    say: `agent run ${runId} authorised by ${p.name || p.id}, carrying ${granted.length} of that person's ${p.roles.length} role(s)`,
    identity: identity({
      kind: "agent", id: agentId, name: agentId, roles: granted, authorisedBy: p.id, runId,
      tenantId: p.tenantId, legalEntityIds: p.legalEntityIds, tenderIds: p.tenderIds,
      workPackageIds: p.workPackageIds, barredClientIds: p.barredClientIds,
      permittedRegions: p.permittedRegions,
      // An agent NEVER inherits a signing limit. Committing value is a
      // human act and the policy engine refuses it regardless; carrying the
      // number across would make that refusal look like an oversight.
      valueLimit: null,
    }),
  };
}

/** May this subject take this action on this object? Role, then attributes. */
export function may({ subject, actionId, contentClass = null, object = {}, at = null } = {}) {
  const who = identity(subject);
  const found = authorityFor(actionId);
  if (actionId && !found) return { ok: false, reason: `"${actionId}" is not an action this system recognises` };

  if (who.invalidRoles.length) {
    return { ok: false, reason: `role(s) that do not exist: ${who.invalidRoles.join(", ")}`, invalidRoles: who.invalidRoles };
  }
  if (contentClass) {
    const access = accessTo(who.roles, contentClass);
    const need = found && /draft|update|tag|create|change|mark|promote|approve|issue|submit|certify|withdraw|close|stop/.test(found.action.id) ? "write" : "read";
    if (access.level === "none") return { ok: false, reason: access.reason, access };
    if (need === "write" && access.level !== "write") return { ok: false, reason: `${contentClass} is readable but not writable by ${who.roles.join(", ")}`, access };
  }
  const attrs = checkAttributes({ subject: who, object, at });
  if (!attrs.ok) return { ok: false, reason: attrs.say, faults: attrs.faults };
  return { ok: true, reason: "permitted", roles: who.roles, kind: who.kind };
}

/**
 * The check that a role bundle has not quietly become a folder. Returns every
 * role that can write a response and also read the price — which should be a
 * short list of senior people and, on most systems, is everybody.
 */
export function priceExposure() {
  const exposed = [];
  for (const role of BID_ROLES) {
    const g = GRANTS[role.id] || {};
    if (g.response === "write" && (g.price === "read" || g.price === "write")) {
      exposed.push({ role: role.id, name: role.name, price: g.price });
    }
  }
  return {
    exposed,
    contributorSees: (GRANTS.CONTRIBUTOR || {}).price || "nothing",
    ok: !exposed.some((e) => e.role === "CONTRIBUTOR" || e.role === "EXTERNAL_PARTNER"),
    say: exposed.length
      ? `${exposed.length} role(s) can write a response and see the price: ${exposed.map((e) => e.name).join(", ")}`
      : "no role that writes a response can see the price",
  };
}

/** Every role in the mapping resolves, and every bid role is assignable. */
export function coverage() {
  const mapped = new Set();
  const bad = [];
  for (const [employee, bidRoles] of Object.entries(ROLE_MAPPING)) {
    for (const r of bidRoles) {
      if (!ROLE_BY_ID.has(r)) bad.push(`${employee} maps to "${r}", which is not a bid role`);
      mapped.add(r);
    }
  }
  const unassignable = BID_ROLES
    .filter((r) => !mapped.has(r.id) && r.tenderContent !== false && !EXTERNAL_ONLY.has(r.id))
    .map((r) => r.id);
  const ungranted = BID_ROLES.filter((r) => !GRANTS[r.id]).map((r) => r.id);
  return {
    roles: BID_ROLES.length,
    contentClasses: CONTENT_CLASSES.length,
    actions: ACTIONS.length,
    bad,
    unassignable,
    ungranted,
    externalOnly: [...EXTERNAL_ONLY],
    ok: bad.length === 0 && ungranted.length === 0 && unassignable.length === 0,
  };
}
