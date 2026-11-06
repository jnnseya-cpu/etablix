/**
 * The three things this business must never claim, checked in what it writes.
 *
 * ETABLIX's position rests on three refusals. Each is recorded — in
 * `DELIVERY_INVARIANTS`, in the agent briefs, on the public pages — and until
 * now each was recorded only as an instruction. An instruction is a thing a
 * model is asked to follow. A check is a thing that happens.
 *
 * The difference matters more here than anywhere else in the system, because
 * all three failures read perfectly well. There is nothing obviously wrong
 * with a sentence saying ETABLIX will manage the construction phase, or that
 * we will install the compound, or that we will contract the suppliers. They
 * are ordinary, confident, competent-sounding construction English. They are
 * also, in order: an unlawful assumption of a statutory role, a claim to a
 * capability the company does not have, and an offer the insurance does not
 * answer.
 *
 * WHAT EACH REFUSAL IS FOR.
 *
 * 1 · CDM PRINCIPAL CONTRACTOR AND PRINCIPAL DESIGNER. Under CDM 2015 these
 *     are appointed roles, held by one organisation at a time, carrying
 *     statutory duties. Most of the firms this business sells to hold them
 *     themselves, on their own sites. A supplier whose document implies it
 *     is taking one is telling the buyer either that it misunderstands the
 *     regime or that it intends to compete with them. Both end the
 *     conversation, and the second ends it permanently.
 *
 * 2 · SELF-DELIVERY. The company holds no plant, no direct labour and no
 *     works contracts. It specifies, procures and integrates; specialist
 *     subcontractors supply and install. A document claiming otherwise is a
 *     claim that fails the first competent question, and on a prequalification
 *     it is a false declaration.
 *
 * 3 · HOLDING THE SUPPLY CHAIN. Under Advisory and Management Integrator the
 *     client holds every supplier contract and pays every supplier. That is
 *     the USP — "you hold every supplier contract; we never hold your money"
 *     — and it is also the insurance position: the professional indemnity
 *     policy in force insures a consultant and does not respond to holding
 *     works contracts. A deliverable that says ETABLIX will contract or pay
 *     the suppliers offers the one thing the company cannot perform.
 *
 * HOW IT READS, AND WHY THAT IS HARD. The same words appear legitimately all
 * the time. "The Principal Contractor shall..." is correct in an Employer's
 * Requirements clause addressed to somebody else. "We do not take the
 * Principal Contractor appointment" is the sentence the business wants to
 * see. So this matches a CLAIM — a first-person subject joined to a
 * prohibited predicate — and ignores the same predicate anywhere else. The
 * cost of that choice is that an unusual phrasing slips through; the cost of
 * the other choice is a guard that fires on every correct document and is
 * therefore turned off within a week.
 *
 * It reports rather than blocks, and the independent challenger is where a
 * bid is stopped. A guard that blocks on a regular-expression match would be
 * overruled the first time it was wrong, and overruled permanently.
 */

/** The subject of a claim: this company, speaking about itself. */
const SUBJECT = "(?:etablix|we|our team|the company|jnn global(?: ltd)?)";

/** Hedges that turn a claim into its opposite, and must not be flagged. */
const NEGATED = /\b(?:not|never|no|nor|neither|without|cannot|can't|does not|do not|don't|won't|will not|excludes?|excluding|other than|rather than)\b/i;

/**
 * Each rule is a predicate the subject must not be joined to. `window` is how
 * far after the subject the predicate may sit and still be the same claim;
 * beyond it, the two are probably in different sentences.
 */
const RULES = [
  {
    id: "cdm",
    label: "CDM Principal Contractor or Principal Designer",
    predicate: /\b(?:act(?:ing|s)? as|appointed as|take[sn]?|taking|accept(?:s|ing)?|assume[sd]?|will be|shall be|are|is)\b[^.;]{0,60}\b(?:the\s+)?principal\s+(?:contractor|designer)\b/i,
    why: "Under CDM 2015 these are appointed statutory roles. Most buyers hold them themselves, and a supplier implying it is taking one is competing with its own customer.",
  },
  {
    id: "cdm-duty",
    label: "a CDM Principal Contractor duty, held in our name",
    predicate: /\b(?:will|shall|we)\b[^.;]{0,40}\b(?:prepare|produce|own|hold|discharge)\b[^.;]{0,30}\bconstruction phase plan\b/i,
    why: "The construction phase plan is the Principal Contractor's duty. Writing it into our scope is the appointment by another name.",
  },
  {
    id: "self-delivery",
    label: "self-delivery with our own labour or plant",
    predicate: /\b(?:will|shall|we)\b[^.;]{0,40}\b(?:self-?deliver|install|erect|construct|build|excavate|lay|commission)\b(?![^.;]{0,30}\bspecif)/i,
    why: "The company holds no plant, no direct labour and no works contracts. It specifies, procures and integrates; the suppliers install.",
  },
  {
    id: "own-plant",
    // STANDALONE, because the possessive IS the subject. "Our own plant will
    // be mobilised in week three" never names the company and is the claim
    // all the same — and it is the phrasing somebody reaches for precisely
    // when they are describing a capability that is not there.
    standalone: true,
    label: "plant or labour held by us",
    predicate: /\bour\s+(?:own\s+)?(?:plant|labour|workforce|operatives|fleet|depot|yard)\b/i,
    why: "There is none. A claim of owned resource fails the first competent question and, on a prequalification, is a false declaration.",
  },
  {
    id: "holds-contracts",
    label: "ETABLIX holding the supplier contracts",
    predicate: /\b(?:will|shall|we)\b[^.;]{0,40}\b(?:contract|engage|appoint|employ)\b[^.;]{0,25}\b(?:the\s+)?(?:suppliers?|subcontractors?|supply chain)\b/i,
    why: "Under Advisory and Management Integrator the client holds every supplier contract. The policy in force insures a consultant and does not respond to holding works contracts.",
  },
  {
    id: "holds-money",
    label: "ETABLIX paying the supply chain",
    predicate: /\b(?:will|shall|we)\b[^.;]{0,40}\b(?:pay|settle|fund|remunerate)\b[^.;]{0,25}\b(?:the\s+)?(?:suppliers?|subcontractors?|supply chain)\b/i,
    why: "“You hold every supplier contract; we never hold your money” is the sentence that separates this business from an intermediary.",
  },
];

/** Sentences, roughly — enough to judge whether a subject and a predicate belong together. */
function sentences(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .split(/(?<=[.!?:;])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Scan a deliverable for claims the business must not make.
 *
 * `allow` lists rule ids to skip, for the one legitimate case: a document
 * that exists to describe Model C internally, where "ETABLIX contracts every
 * supplier" is the accurate description of a model that is designed and not
 * offered.
 */
export function checkPosition(text, { allow = [] } = {}) {
  const skip = new Set(allow);
  const findings = [];
  const subjectRe = new RegExp(`\\b${SUBJECT}\\b`, "i");

  for (const s of sentences(text)) {
    // A sentence that denies the thing is the sentence we want to see.
    if (NEGATED.test(s)) continue;
    const hasSubject = subjectRe.test(s);
    for (const rule of RULES) {
      if (skip.has(rule.id)) continue;
      if (!rule.standalone && !hasSubject) continue;
      if (!rule.predicate.test(s)) continue;
      findings.push({ rule: rule.id, label: rule.label, why: rule.why, sentence: s.slice(0, 180) });
    }
  }

  // One finding per rule is enough to act on; the rest are the same problem.
  const byRule = new Map();
  for (const f of findings) if (!byRule.has(f.rule)) byRule.set(f.rule, f);

  const unique = [...byRule.values()];
  return {
    findings: unique,
    occurrences: findings.length,
    ok: unique.length === 0,
    say: unique.length === 0
      ? "nothing in this document claims a CDM appointment, self-delivery, or that ETABLIX holds the supplier contracts"
      : `${unique.length} position breach(es): ${unique.map((f) => f.label).join("; ")}`,
  };
}

/** The notes an approver reads. */
export function positionNotes(result) {
  if (!result || result.ok) return [];
  return result.findings.map(
    (f) => `POSITION — this document claims ${f.label}. ${f.why} The sentence: “${f.sentence}”`,
  );
}

/** One sentence for the run log. */
export function positionStatement(result) {
  if (!result) return "the position guard did not run";
  return result.say;
}

export { RULES as POSITION_RULES };
