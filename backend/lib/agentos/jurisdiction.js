/**
 * England and Scotland are not one regime with regional variations.
 *
 * They are separate systems with separate regulators, separate consent
 * routes, separate building control and separate words for the same thing.
 * A platform that treats Scotland as England-with-exceptions will, sooner or
 * later, discharge a Scottish prerequisite with English evidence — and the
 * failure is silent, because the English document is real, correctly issued
 * and entirely inapplicable.
 *
 * THE SPECIFIC ERROR THIS EXISTS TO PREVENT. Temporary dewatering from an
 * excavation to surface water is covered in England by an Environment Agency
 * regulatory position statement. On Skye the same activity is a water
 * activity under the Scottish regime and is authorised by SEPA. Both
 * documents describe dewatering. Both are genuine. Filing the English one
 * against the Scottish requirement leaves the site discharging without
 * authorisation while the register shows the matter closed, and the
 * specification says so in terms: England environment guidance cannot
 * discharge a Scottish prerequisite.
 *
 * SO EVIDENCE CARRIES A JURISDICTION AND SO DOES A REQUIREMENT, and a match
 * is required rather than assumed. Where they differ the requirement stays
 * UNRESOLVED and the correct route is named. It is not downgraded to a
 * warning: a warning on a consent is a consent nobody has.
 *
 * THE VOCABULARY MATTERS TOO, and not for pedantry. In Scotland it is a
 * building warrant from a verifier against building standards; in England
 * it is building control against the Building Regulations. A document asking
 * a Highland client for "Building Regs sign-off" tells them the author has
 * not worked there, which costs the same as being wrong.
 *
 * WHAT THIS IS NOT. It is not legal advice and it does not decide
 * applicability. The specification requires each project's appointed team to
 * verify applicability and the effective version before publishing project
 * rules. This routes a question to the right regulator and refuses a
 * mismatch; a person confirms the answer.
 */

/** The two pilot profiles, effective-dated, with their own vocabulary. */
export const JURISDICTIONS = [
  {
    id: "england",
    name: "England",
    environmentRegulator: "Environment Agency",
    buildingControl: "building control against the Building Regulations",
    buildingConsent: "building regulations approval",
    terms: { verifier: null, warrant: null },
  },
  {
    id: "scotland",
    name: "Scotland",
    environmentRegulator: "SEPA",
    buildingControl: "a verifier against the Scottish building standards",
    buildingConsent: "a building warrant",
    terms: { verifier: "verifier", warrant: "building warrant" },
  },
];

/**
 * Activities that are regulated differently on each side of the border, with
 * the route for each. `reference` is the published source the profile cites.
 */
export const REGULATED_ACTIVITIES = [
  {
    id: "dewatering",
    name: "Temporary dewatering from excavations to surface water",
    england: { route: "Environment Agency regulatory position statement RPS 261, subject to its conditions", ref: "R5" },
    scotland: { route: "a water activity under the Scottish environmental authorisation regime, authorised by SEPA", ref: "R6" },
  },
  {
    id: "site-runoff",
    name: "Construction site surface-water run-off",
    england: { route: "Environment Agency permitting or an applicable exemption", ref: "R5" },
    scotland: { route: "the SEPA construction site run-off regime", ref: "R6" },
  },
  {
    id: "building-consent",
    name: "Consent for temporary buildings and sleeping accommodation",
    england: { route: "building control against the Building Regulations", ref: null },
    scotland: { route: "a building warrant from the verifier against the Scottish building standards, with use classification and fire requirements determined for sleeping accommodation", ref: "R11" },
  },
  {
    id: "procurement",
    name: "Public procurement route",
    england: { route: "the Procurement Act 2023 regime for a reserved contracting authority, subject to the transition profile", ref: "R12" },
    scotland: { route: "the devolved Scottish procurement regime — selected by contracting authority and framework, not by site location alone", ref: "R12" },
  },
];

const BY_ID = new Map(JURISDICTIONS.map((j) => [j.id, j]));
const ACT = new Map(REGULATED_ACTIVITIES.map((a) => [a.id, a]));

/** A jurisdiction from whatever arrived. Skye is Scotland; a guess is null. */
export function jurisdiction(raw) {
  const s = String(raw ?? "").toLowerCase().trim();
  if (!s) return null;
  if (/\b(scotland|scottish|skye|highland|argyll|sepa)\b/.test(s)) return BY_ID.get("scotland");
  if (/\b(england|english|wales)\b/.test(s)) return BY_ID.get("england");
  return BY_ID.get(s) || null;
}

/** The route for an activity in a jurisdiction. */
export function requirementProfile(where, activityId) {
  const j = jurisdiction(where);
  const a = ACT.get(String(activityId ?? ""));
  if (!j) {
    return { ok: false, say: `"${String(where ?? "")}" does not resolve to a pilot jurisdiction, and an unknown jurisdiction fails closed rather than defaulting to England` };
  }
  if (!a) {
    return { ok: false, jurisdiction: j.id, say: `"${String(activityId ?? "")}" is not a regulated activity this profile covers` };
  }
  const r = a[j.id];
  return {
    ok: true,
    jurisdiction: j.id,
    activity: a.id,
    name: a.name,
    regulator: j.environmentRegulator,
    route: r.route,
    reference: r.ref,
    say: `in ${j.name}, ${a.name.toLowerCase()} goes through ${r.route}`,
  };
}

/**
 * Does this evidence discharge this requirement?
 *
 * The jurisdictions must match. A genuine, correctly issued English document
 * does not discharge a Scottish prerequisite, and the requirement is left
 * UNRESOLVED rather than warned about.
 */
export function checkEvidenceJurisdiction({ requirementJurisdiction = null, evidenceJurisdiction = null, activityId = null } = {}) {
  const need = jurisdiction(requirementJurisdiction);
  const have = jurisdiction(evidenceJurisdiction);
  if (!need) {
    return { ok: false, status: "UNRESOLVED", reason: "REQUIREMENT_JURISDICTION_UNKNOWN",
             say: "the requirement does not say which jurisdiction it belongs to, so no evidence can be shown to discharge it" };
  }
  if (!have) {
    return { ok: false, status: "UNRESOLVED", reason: "EVIDENCE_JURISDICTION_UNKNOWN", required: need.id,
             say: `the evidence does not say which jurisdiction it was issued under, and a ${need.name} requirement needs ${need.name} evidence` };
  }
  if (need.id !== have.id) {
    const profile = activityId ? requirementProfile(need.id, activityId) : null;
    return {
      ok: false,
      status: "UNRESOLVED",
      reason: "WRONG_JURISDICTION",
      required: need.id,
      supplied: have.id,
      correctRoute: profile && profile.ok ? profile.route : null,
      say: `${have.name} evidence does not discharge a ${need.name} prerequisite. `
         + `The document may be genuine and correctly issued and it is inapplicable here`
         + (profile && profile.ok ? `; the route is ${profile.route}` : "")
         + ". The requirement stays unresolved.",
    };
  }
  return { ok: true, status: "SATISFIED", required: need.id, supplied: have.id,
           say: `${have.name} evidence against a ${need.name} requirement` };
}

/** The vocabulary a document must use for this jurisdiction. */
export function consentVocabulary(where) {
  const j = jurisdiction(where);
  if (!j) return null;
  return {
    jurisdiction: j.id,
    buildingConsent: j.buildingConsent,
    buildingControl: j.buildingControl,
    environmentRegulator: j.environmentRegulator,
    say: `in ${j.name} the consent is ${j.buildingConsent}, assessed by ${j.buildingControl}, and the environmental regulator is ${j.environmentRegulator}`,
  };
}

/** The notes an approver reads. */
export function jurisdictionNotes(result) {
  if (!result || result.ok) return [];
  if (result.reason === "WRONG_JURISDICTION") {
    return [`JURISDICTION MISMATCH ON A CONSENT — ${result.say} `
      + "This is the failure that is invisible on a register: the document is real, so the row looks closed, "
      + "and the site is operating without the authorisation it needs."];
  }
  return [`JURISDICTION UNRESOLVED — ${result.say}`];
}
