/**
 * Repair the links on signals queued before the notice URL was built properly.
 *
 *   docker exec etablix node backend/tools/signals-relink.mjs           # dry run
 *   docker exec etablix node backend/tools/signals-relink.mjs --write   # apply
 *
 * WHY THIS EXISTS. Every Find a Tender signal queued before 21 October 2026
 * links to the API endpoint the sweep had just read — so clicking one hands a
 * reader a megabyte of JSON instead of the notice. The fix only applies to
 * signals queued afterwards, and re-sweeping does not help: the fingerprint
 * already holds those stories, so a fresh sweep skips them as "already seen"
 * and the broken links stay broken for ever.
 *
 * MUST RUN INSIDE THE CONTAINER. It writes to the queue, so it needs the same
 * data volume the application reads. Run on the host it edits a different
 * store and reports success against rows nobody will ever see.
 *
 * AND IT MENDS MORE THAN THE LINK, because mending only the link was useless.
 * Those same rows predate the fields that answer the question a reader
 * actually has — who do I write to. They carry no buyer, no supplier, no
 * contact and no deadline, so a relinked row still showed a headline and
 * nothing else. The two halves of the repair are one job.
 *
 * WHAT IT WILL NOT TOUCH, AND THIS IS THE LOAD-BEARING PART. It writes only
 * the fields in MENDABLE below: the link, the parties, the published contact
 * route and the dates. It will not write status, actedBy, actedAt or note —
 * a person's judgement about a signal is theirs and a tool must not quietly
 * revise it. It also deliberately leaves score, triggers and sectors alone:
 * re-deriving those under today's rules would reorder a queue somebody has
 * already read, and "the list moved while I was working it" is a worse defect
 * than the one being fixed.
 *
 * The contact still passes through scrub(), the same gate the sweep uses, so
 * no personal address reaches storage by this route either.
 *
 * It is safe to run twice: a row that already has what it needs is left alone.
 */
import { politeFetch } from "../lib/signals/fetch.js";
import { extract, resolveUrl, sources, sourcesFile, seedStatus, stage, extractDeadline, namedOrgs } from "../lib/signals/parse.js";
import { scrub, isRoleAddress } from "../lib/signals/contact.js";
import { collection, update } from "../lib/store.js";

/**
 * The only fields this tool may ever write. Everything a person sets, and
 * everything that decides the queue's order, is deliberately absent.
 */
const MENDABLE = [
  "url", "summary",
  "buyer", "suppliers", "orgs",
  "roleAddress", "contactOrg", "contactRole", "contactWithheld", "contactUrl",
  "deadlineAt", "deadlineKind", "deadlineText",
  "stage",
];
const NEVER = ["status", "actedBy", "actedAt", "note", "id", "fingerprint", "seenAt", "sourceId", "score", "triggers", "sectors"];

const WRITE = process.argv.includes("--write");

console.log(`\nreading: ${sourcesFile()}`);
{
  const seed = seedStatus();
  if (seed.stale) {
    console.log(`\n  !! this list is version ${seed.liveVersion}; version ${seed.repoVersion} shipped with the image.`);
    console.log(`     The templates this tool needs may only exist in the newer one. Take it first:`);
    console.log(`       docker exec etablix cp ${seed.repo} ${seed.live}\n`);
  }
}

const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");

/** An ocid stated in the summary, which is where the sweep puts the reference. */
const ocidIn = (text) => (/\b(ocds-[a-z0-9]+-[a-z0-9]+)\b/i.exec(String(text || "")) || [])[1] || null;

/**
 * Fill a template from a reference, refusing when the placeholder names
 * something we do not have. Deliberately the same rule as the extractor: a
 * template on the wrong field gives a confident dead link, which is worse than
 * the API link it would replace.
 */
function fill(templates, ref) {
  if (!templates || !ref) return null;
  const isOcid = /^ocds-/i.test(ref);
  // AN ARRAY, BECAUSE A SOURCE NOW GIVES AN ORDERED LIST. This took a string
  // until the notice template became "notice first, procurement page second",
  // and then threw TypeError: template.replace is not a function on the first
  // row whose story had aged out of the feed — which is the only branch that
  // reaches here. Everything up to that point had already been mended, so the
  // failure looked like a crash halfway through a backfill.
  for (const t of [].concat(templates)) {
    const tpl = String(t);
    // EACH PLACEHOLDER WANTS ITS OWN KIND OF IDENTIFIER, and getting this
    // backwards is the whole defect: a {id} template filled with an ocid
    // produces /Notice/ocds-h6vhtk-0657bc, which is a confident dead link and
    // worse than the search-page fallback it replaced.
    if (/\{ocid\}/.test(tpl) && !isOcid) continue;   // wants an ocid; this is not one
    if (/\{id\}/.test(tpl) && isOcid) continue;      // wants a notice number; this is an ocid
    const url = tpl.replace(/\{(ocid|id|ref)\}/g, () => encodeURIComponent(ref));
    if (!/\{[a-z]+\}/i.test(url)) return url;
  }
  return null;
}

const all = sources();
const byId = new Map(all.map((s) => [s.id, s]));
const signals = collection("signals");
console.log(`${signals.length} signal(s) in the queue, ${all.length} source(s) enabled\n`);

/** Does this row already point at a notice rather than at an API or a search page? */
const linkedProperly = (sig, src) => {
  for (const t of [].concat(src.noticeUrl || [])) {
    const prefix = String(t).split("{")[0];
    if (prefix && String(sig.url || "").startsWith(prefix)) return true;
  }
  return false;
};

/** And does it carry the fields that answer "who do I write to"? */
const hasParties = (sig) => Boolean(sig.buyer) || (Array.isArray(sig.suppliers) && sig.suppliers.length);

// A row is worth mending if its link is wrong OR it predates the party fields.
const candidates = signals.filter((sig) => {
  const src = byId.get(sig.sourceId);
  if (!src || !src.noticeUrl) return false;
  return !linkedProperly(sig, src) || !hasParties(sig);
});

if (!candidates.length) {
  console.log("Nothing to mend: every signal from a notice source has its link and its parties.\n");
  process.exit(0);
}

const bySource = new Map();
for (const sig of candidates) {
  if (!bySource.has(sig.sourceId)) bySource.set(sig.sourceId, []);
  bySource.get(sig.sourceId).push(sig);
}
console.log(`${candidates.length} signal(s) across ${bySource.size} source(s) link somewhere other than a notice.\n`);

let mended = 0, linkOnly = 0, unresolved = 0, failedSource = 0;
const changedFields = new Set();

/**
 * Everything the record now says about a signal, as a patch, with nothing in
 * it a person owns.
 *
 * Built from the same item the sweep would build, then put through scrub() —
 * the one gate — so a published contact that turns out to be a named
 * individual is nulled here exactly as it would be on the way into the queue.
 */
function patchFor(sig, item, src) {
  const text = `${item.title} ${item.summary || ""}`;
  const deadline = extractDeadline(text);
  const orgs = (item.orgs && item.orgs.length) ? item.orgs : namedOrgs(text);

  const fresh = scrub({
    url: item.url,
    summary: item.summary || sig.summary || "",
    buyer: item.buyer || null,
    suppliers: item.suppliers || [],
    orgs,
    roleAddress: item.roleAddress || null,
    contactOrg: item.contactOrg || null,
    contactRole: item.contactRole || null,
    contactWithheld: Boolean(item.contactFound) && !isRoleAddress(item.roleAddress),
    contactUrl: item.contactUrl || src.contactPage || null,
    deadlineAt: deadline ? deadline.at : null,
    deadlineKind: deadline ? deadline.kind : null,
    deadlineText: deadline ? deadline.text : null,
    // The stage is a reading of the triggers already stored, not a re-score.
    stage: stage(sig.triggers || []),
  });

  const patch = {};
  for (const key of MENDABLE) {
    if (!(key in fresh)) continue;
    const next = fresh[key], now = sig[key];
    if (JSON.stringify(next) === JSON.stringify(now === undefined ? null : now)) continue;
    if (next === null || next === "" || (Array.isArray(next) && !next.length)) {
      // Never replace something with nothing: a row that already names a
      // supplier must not lose it because today's read came back thin.
      if (now !== undefined && now !== null && (!Array.isArray(now) || now.length)) continue;
    }
    patch[key] = next;
  }
  return patch;
}

for (const [sourceId, rows] of bySource) {
  const src = byId.get(sourceId);
  console.log(`  ${sourceId} — ${rows.length} signal(s) to look at`);

  // Read the source ONCE. Parties and contacts only exist in the record, so
  // unlike a link they cannot be reconstructed from what is already stored.
  const res = await politeFetch(resolveUrl(src.url));
  const live = new Map();
  if (res.ok && res.body) {
    for (const item of extract(res.body, resolveUrl(src.url), { noticeUrl: src.noticeUrl, siteUrl: src.siteUrl })) {
      if (item.title) live.set(norm(item.title), item);
    }
    console.log(`     read ${live.size} item(s) from the source`);
  } else {
    console.log(`     SOURCE DID NOT ANSWER — ${res.reason || "no body"}. Falling back to held references only.`);
  }

  for (const sig of rows) {
    // ONE BAD ROW MUST NOT END THE RUN. A backfill that stops halfway leaves
    // the queue in two states and gives no clue which rows were reached —
    // and this one did exactly that, on a TypeError in the fallback branch.
    try {
    const item = live.get(norm(sig.title));

    if (item) {
      const patch = patchFor(sig, item, src);
      if (!Object.keys(patch).length) { console.log(`     already current  ${sig.title.slice(0, 54)}`); continue; }
      for (const k of Object.keys(patch)) changedFields.add(k);
      console.log(`     ${WRITE ? "mended" : "would"}  ${sig.title.slice(0, 54)}`);
      console.log(`              ${patch.url || sig.url}`);
      const who = patch.suppliers || sig.suppliers, buyer = patch.buyer || sig.buyer;
      if ((who || []).length) console.log(`              won by ${(who || []).join(", ")}`);
      if (buyer) console.log(`              let by ${buyer}`);
      if (patch.roleAddress) console.log(`              contact ${patch.roleAddress}`);
      else if (patch.contactWithheld) console.log(`              a contact is on the notice but it is a person's — not stored`);
      console.log(`              fields: ${Object.keys(patch).join(", ")}`);
      if (WRITE) update("signals", sig.id, patch);
      mended++;
      continue;
    }

    // Not in the source any more — almost always aged out of the API's date
    // window. The link can still be rebuilt from a reference already held;
    // the parties cannot, because nothing local ever carried them.
    const ref = ocidIn(sig.summary) || ocidIn(sig.title);
    const url = fill(src.noticeUrl, ref);
    if (url && url !== sig.url) {
      console.log(`     ${WRITE ? "link  " : "would "}  ${sig.title.slice(0, 54)}`);
      console.log(`              ${url}   (link only — aged out, so no parties)`);
      if (WRITE) update("signals", sig.id, { url });
      changedFields.add("url");
      linkOnly++;
    } else {
      console.log(`     no match  ${sig.title.slice(0, 54)}`);
      unresolved++;
      if (!res.ok) failedSource++;
    }
    } catch (err) {
      console.log(`     ERROR     ${sig.title.slice(0, 54)}`);
      console.log(`               ${err.message}`);
      unresolved++;
    }
  }
  console.log("");
}

// Said out loud, every run: the point of the allowlist is that it is checkable.
console.log(`fields written: ${[...changedFields].sort().join(", ") || "none"}`);
const forbidden = [...changedFields].filter((f) => NEVER.includes(f));
if (forbidden.length) {
  console.log(`\n!! REFUSING: tried to write ${forbidden.join(", ")}, which this tool must never touch.\n`);
  process.exit(1);
}

console.log(`\n=== ${WRITE ? "mended" : "would mend"} ${mended + linkOnly} of ${candidates.length} ===`);
console.log(`    ${mended} fully from the record, ${linkOnly} link only`);
if (unresolved) {
  console.log(`    ${unresolved} could not be matched — almost always a notice that has aged out of`);
  console.log(`      the API's date window. Widen the window in the source url ({{date:-30}}) and`);
  console.log(`      run again, or leave them: the search-page link still works, it is just slower.`);
}
if (failedSource) console.log(`    ${failedSource} of those because the source did not answer at all`);

if (!WRITE) {
  console.log(`\nNothing was changed. To apply:\n  docker exec etablix node backend/tools/signals-relink.mjs --write\n`);
} else {
  console.log(`\nDone. Read them at https://etablix.com/internal/signals.html\n`);
}
process.exit(0);
