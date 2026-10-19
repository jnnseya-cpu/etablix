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
import { TRIGGERS, SECTORS, SECTOR_LABEL, sources, sourcesFile, fingerprint, score, extract, classify,
         stage, STAGE_LABEL, OPEN_TRIGGERS, CONFIRMED_TRIGGERS, namedOrgs, extractDeadline, resolveUrl,
         WORKS, hasWorks } from "./parse.js";

// Re-exported so every caller keeps one import, and so the split between what
// needs the database and what does not stays an implementation detail.
export { TRIGGERS, SECTORS, SECTOR_LABEL, sources, sourcesFile, fingerprint, score, extract, classify,
         stage, STAGE_LABEL, OPEN_TRIGGERS, CONFIRMED_TRIGGERS, namedOrgs, extractDeadline, resolveUrl,
         WORKS, hasWorks };


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
  const seen = collection("signals");
  if (seen.some((s) => s.fingerprint === fp)) return { queued: false, reason: "already seen" };

  /**
   * THE SAME STORY OFF TWO WIRES IS STILL ONE STORY.
   *
   * The fingerprint is url plus title, which is right for the same page seen
   * twice and wrong for syndication. Mining Weekly and Engineering News are
   * both Creamer Media, so the second live run queued "$40m for Prieska Copper
   * Zinc Mine development" twice and "Deep Yellow pushes out FID" twice, under
   * different URLs. Four of thirty signals were two signals.
   *
   * So an identical headline already in the queue is a duplicate regardless of
   * where it came from. Headlines are specific enough that a genuine collision
   * is rarer than the syndication this prevents, and the cost of being wrong
   * is one missed read rather than a wrong approach.
   */
  const key = String(row.title || "").trim().toLowerCase().replace(/\s+/g, " ");
  if (key && seen.some((s) => String(s.title || "").trim().toLowerCase().replace(/\s+/g, " ") === key)) {
    return { queued: false, reason: "already seen under another source" };
  }
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
  const out = { checked: 0, blocked: 0, unchanged: 0, failed: 0, queued: [], skipped: 0, expired: 0, offSector: 0, noWorks: 0 };
  for (const src of sources()) {
    out.checked++;
    // resolveUrl, not src.url: the procurement APIs are windowed queries and
    // several refuse a request with no window, so the source file states the
    // window as {{date:-7}} and the sweep fills in today's date.
    const res = await politeFetch(resolveUrl(src.url));
    if (res.blocked) { out.blocked++; continue; }
    if (res.notModified) { out.unchanged++; continue; }
    if (!res.ok) { out.failed++; continue; }

    for (const item of extract(res.body, resolveUrl(src.url),
                               { noticeUrl: src.noticeUrl || null, siteUrl: src.siteUrl || null })) {
      const text = `${item.title} ${item.summary}`;
      const { triggers, sectors, score: n } = score(text);
      if (n < minScore) continue;

      // THE DATE DECIDES WHETHER IT IS STILL AN OPPORTUNITY.
      // An open notice whose closing date has passed is not a lead, it is a
      // line of history occupying the top of a queue sorted by score. It is
      // dropped at the door rather than filtered later, because a reader who
      // has to check every date themselves stops checking.
      const deadline = extractDeadline(text);
      const where = stage(triggers);

      /**
       * A NOTICE PORTAL WITHOUT A SECTOR FILTER IS NOT A SOURCE, IT IS A FLOOD.
       *
       * THE NUMBERS FROM THE FIRST LIVE RUN. Find a Tender: 100 notices read,
       * 70 would have queued. Contracts Finder: 100 read, 95 would have
       * queued. They were right to — every one is genuinely a contract award,
       * so the award trigger fires on all of them. But they were pricing
       * agreements for cough assist therapy devices, periodicals subscriptions
       * and a rightsizing project in Hong Kong. Two hundred of those a day
       * does not improve the queue, it ends it: nobody reads a list where the
       * nineteenth item is the first relevant one.
       *
       * So a source may demand that an item land in one of our six sectors
       * before it is queued at all. Only the portals set it, and they set it
       * because they carry every procurement in the country rather than a
       * trade press editor's judgement about what is construction news.
       */
      if (src.requireSector && !sectors.length && !src.sector) { out.offSector++; continue; }

      /**
       * AND IS THERE ANYTHING TO BUILD?
       *
       * The sector gate cut Find a Tender from 70 to 13, and all thirteen were
       * Hinkley Point B decommissioning call-offs: a radioactive laundry
       * service, fire door maintenance, LOLER inspections, facilities
       * management. Real awards, right industry, and not one with a
       * construction site, a workforce to house or a compound to establish.
       *
       * The sector says whether it is our industry. This says whether there is
       * work of the kind that needs a temporary estate. On trade press an
       * editor has already asked that question; on a portal, which publishes
       * every framework call-off a site makes, nobody has.
       */
      if (src.requireWorks && !hasWorks(text)) { out.noWorks++; continue; }
      if (where === "open" && deadline && deadline.at < Date.now() - 86400000) { out.expired = (out.expired || 0) + 1; continue; }

      let contactUrl = null, roleAddress = null;
      if (enrich && src.contactPage) {
        const page = await politeFetch(src.contactPage);
        if (page.ok && page.body) ({ contactUrl, roleAddress } = publishedContact(page.body, src.contactPage));
      }

      const result = queue({
        sourceId: src.id, sourceName: src.name || src.id,
        org: src.org || src.name || "", title: item.title, summary: item.summary,
        url: item.url, publishedAt: item.publishedAt, triggers, score: n,
        // What kind of moment, who is named in it, and by when. The three
        // things a reader had to open the link to find out.
        stage: where,
        // A notice API states its buyer and suppliers in named fields, so the
        // record wins. The regex is for prose, where there is nothing better.
        orgs: (item.orgs && item.orgs.length) ? item.orgs : namedOrgs(text),
        deadlineAt: deadline ? deadline.at : null,
        deadlineKind: deadline ? deadline.kind : null,
        deadlineText: deadline ? deadline.text : null,
        // A source that only ever covers one sector says so, and the item
        // inherits it: a mining feed's headline need not repeat the word.
        sectors: sectors.length ? sectors : (src.sector ? [src.sector] : []),
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
