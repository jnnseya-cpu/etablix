/**
 * The trigger watcher.
 *
 * It does not find email addresses. It finds MOMENTS — the point at which a
 * scheme has just become somebody's problem and nobody has answered it yet:
 * consent granted, a main contractor appointed, a project transferred to an
 * owner, financial close reached. The approach is written and sent by a
 * person afterwards, from their own mailbox, a few a week.
 *
 * THE THREE RULES, AND WHERE EACH ONE LIVES.
 *
 *   robots.txt and rate limiting   backend/lib/signals/fetch.js
 *   triggers and parsing, no store   backend/lib/signals/parse.js
 *   no personal address, ever      backend/lib/signals/contact.js
 *   suppression nothing overrides  this file, isSuppressed() and queue()
 *
 * WHAT THIS IS NOT. It never sends anything. There is no transport in this
 * module and there must never be one: the moment a watcher can also send, it
 * becomes the thing it was built instead of. The queue is read by a person.
 */
import { collection, insert, update } from "../store.js";
import { politeFetch } from "./fetch.js";
import { publishedContact, scrub } from "./contact.js";
import { TRIGGERS, sources, fingerprint, score, extract } from "./parse.js";

// Re-exported so every caller keeps one import, and so the split between what
// needs the database and what does not stays an implementation detail.
export { TRIGGERS, sources, fingerprint, score, extract };


/**
 * What counts as a moment.
 *
 * Deterministic patterns rather than judgement, so the same page always
 * scores the same and a reviewer can see why something surfaced. Weights are
 * coarse on purpose: this ranks a reading queue, it does not make decisions.
 */
/**
 * The suppression list, and the reason it is checked rather than consulted.
 *
 * Somebody asks not to be approached, or a name must never be approached for
 * a reason that belongs in a different conversation. Either way the answer
 * has to hold against a future change of mind, a bulk import and a tired
 * evening. So this is checked inside queue(), the only way a signal is ever
 * written, and the route that marks a signal approached checks it again.
 * There is no flag to bypass it, and adding one would be a defect.
 */
export function isSuppressed(signal) {
  const haystack = [signal.org, signal.url, signal.title].filter(Boolean).join(" ").toLowerCase();
  let host = "";
  try { host = new URL(signal.url).host.toLowerCase(); } catch { /* not a url */ }
  return collection("suppressions").some((s) => {
    const needle = String(s.pattern || "").trim().toLowerCase();
    if (!needle) return false;
    return haystack.includes(needle) || (host && host.includes(needle));
  });
}

export function suppress(pattern, { by = null, why = null } = {}) {
  const value = String(pattern || "").trim().toLowerCase();
  if (!value) throw new Error("A suppression needs something to match on.");
  const existing = collection("suppressions").find((s) => s.pattern === value);
  if (existing) return existing;
  return insert("suppressions", { pattern: value, by, why, at: Date.now() });
}

/**
 * Write a signal, or decline to and say why.
 *
 * The only way into the queue. Suppression, deduplication and the personal
 * data gate all sit on this path so none of them can be walked around.
 */
export function queue(signal) {
  const row = scrub(signal);
  if (isSuppressed(row)) return { queued: false, reason: "suppressed" };
  const fp = fingerprint(row.url, row.title);
  if (collection("signals").some((s) => s.fingerprint === fp)) return { queued: false, reason: "already seen" };
  return { queued: true, signal: insert("signals", { ...row, fingerprint: fp, status: "new", seenAt: Date.now() }) };
}

/**
 * One pass over the enabled sources.
 *
 * Returns what it did rather than logging it, so the automation sweep can
 * report and the test can assert. Never throws for one bad source: a feed
 * that has moved should not stop the other nine.
 */
export async function sweep({ minScore = 3, enrich = true } = {}) {
  const out = { checked: 0, blocked: 0, unchanged: 0, failed: 0, queued: [], skipped: 0 };
  for (const src of sources()) {
    out.checked++;
    const res = await politeFetch(src.url);
    if (res.blocked) { out.blocked++; continue; }
    if (res.notModified) { out.unchanged++; continue; }
    if (!res.ok) { out.failed++; continue; }

    for (const item of extract(res.body, src.url)) {
      const { triggers, score: n } = score(`${item.title} ${item.summary}`);
      if (n < minScore) continue;

      let contactUrl = null, roleAddress = null;
      if (enrich && src.contactPage) {
        const page = await politeFetch(src.contactPage);
        if (page.ok && page.body) ({ contactUrl, roleAddress } = publishedContact(page.body, src.contactPage));
      }

      const result = queue({
        sourceId: src.id, sourceName: src.name || src.id,
        org: src.org || src.name || "", title: item.title, summary: item.summary,
        url: item.url, publishedAt: item.publishedAt, triggers, score: n,
        contactUrl: contactUrl || src.contactPage || null, roleAddress,
      });
      if (result.queued) out.queued.push(result.signal);
      else out.skipped++;
    }
  }
  return out;
}

/** Move a signal along. Approaching is a person's act and is recorded as one. */
export function act(signalId, status, { by = null, note = null } = {}) {
  const row = collection("signals").find((s) => s.id === signalId);
  if (!row) throw new Error("That signal does not exist.");
  if (status === "approached" && isSuppressed(row)) {
    throw new Error("That organisation is on the suppression list and must not be approached.");
  }
  if (!["new", "reading", "approached", "dismissed"].includes(status)) throw new Error("Unknown status.");
  return update("signals", signalId, { status, actedBy: by, actedAt: Date.now(), note: note || row.note || null });
}
