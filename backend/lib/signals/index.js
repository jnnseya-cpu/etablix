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
import { publishedContact, scrub, isRoleAddress } from "./contact.js";
import { TRIGGERS, SECTORS, SECTOR_LABEL, sources, sourcesFile, seedStatus, fingerprint, score, extract, classify,
         stage, STAGE_LABEL, OPEN_TRIGGERS, CONFIRMED_TRIGGERS, namedOrgs, extractDeadline, resolveUrl,
         WORKS, hasWorks, NOT_OURS, notOurs, nextLink } from "./parse.js";

// Re-exported so every caller keeps one import, and so the split between what
// needs the database and what does not stays an implementation detail.
export { TRIGGERS, SECTORS, SECTOR_LABEL, sources, sourcesFile, seedStatus, fingerprint, score, extract, classify,
         stage, STAGE_LABEL, OPEN_TRIGGERS, CONFIRMED_TRIGGERS, namedOrgs, extractDeadline, resolveUrl,
         WORKS, hasWorks, NOT_OURS, notOurs, nextLink };


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
  const out = { checked: 0, blocked: 0, unchanged: 0, failed: 0, queued: [], skipped: 0, expired: 0, offSector: 0, noWorks: 0, notOurs: 0, pages: 0 };
  for (const src of sources()) {
    out.checked++;
    // resolveUrl, not src.url: the procurement APIs are windowed queries and
    // several refuse a request with no window, so the source file states the
    // window as {{date:-7}} and the sweep fills in today's date.
    /**
     * A NAMED NOTICE IS FETCHED, NOT SEARCHED FOR.
     *
     * THE FAILURE THIS ANSWERS, AND IT WAS MINE TWICE OVER. National Grid's
     * substation construction dynamic market was published on 19 February
     * 2026 and is still open: open-ended, every English region and Wales,
     * site welfare and security named in its own scope. It is the single best
     * entry on the portal and the watcher never found it.
     *
     * When that was reported I widened the date window to 120 days and added
     * paging. Both were useless, because the notice is EIGHT MONTHS old — it
     * sits outside any window worth querying, and a hundred items a page
     * against tens of thousands of notices is not a search, it is a lottery.
     *
     * The API answers a direct request for a notice by its own identifier.
     * That fact was in the documentation I had already read and quoted. So a
     * source may now name the notices it watches, and each is fetched
     * exactly, every sweep, one request each. No window, no paging, no luck.
     *
     * This is how an open-ended market is watched: you do not trawl for it,
     * you name it. It queues once, a person reads it, and it is then
     * "already seen" for ever — which is correct, because a market that
     * admits members at any time needs reading once and acting on, not
     * re-reading every morning.
     */
    const targets = Array.isArray(src.notices) && src.notices.length
      ? src.notices.map((id) => resolveUrl(String(src.url).replace(/\{\{notice\}\}/g, encodeURIComponent(String(id).trim()))))
      : [resolveUrl(src.url)];

    const first = targets[0];
    const res = await politeFetch(first);
    if (res.blocked) { out.blocked++; continue; }
    if (res.notModified) { out.unchanged++; continue; }
    if (!res.ok) { out.failed++; continue; }

    /**
     * FOLLOW THE PAGES A SOURCE ASKS FOR.
     *
     * One response is a hundred notices and a pointer to the rest. For news
     * that is plenty; for a notice API it is not, because the entries worth
     * most are the open-ended dynamic markets, and those are old. A source
     * says how deep to go and the default stays one, so nothing that does not
     * ask for this behaves any differently.
     */
    const opts = { noticeUrl: src.noticeUrl || null, siteUrl: src.siteUrl || null };
    const items = extract(res.body, first, opts);
    let pages = 1, url = first, body = res.body;

    // The rest of the watchlist, each fetched exactly. A notice that has been
    // withdrawn answers 404 and is skipped rather than stopping the others.
    for (const target of targets.slice(1)) {
      const one = await politeFetch(target);
      pages++;
      if (!one.ok || !one.body) { out.failed++; continue; }
      items.push(...extract(one.body, target, opts));
    }

    const wanted = targets.length > 1 ? 1 : Math.max(1, Math.min(Number(src.pages) || 1, 50));
    while (pages < wanted) {
      const next = nextLink(body, url);
      if (!next) break;
      const more = await politeFetch(next);
      if (!more.ok || !more.body) break;
      const batch = extract(more.body, next, opts);
      if (!batch.length) break;
      items.push(...batch);
      url = next; body = more.body; pages++;
    }
    out.pages = (out.pages || 0) + pages;

    for (const item of items) {
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
      /**
       * AND IS IT SOMETHING WE COULD EVER SELL TO?
       *
       * The sector gate asks whether it is our industry and the works gate
       * asks whether there is anything to build. Both are about the SCHEME.
       * Neither asks what is actually being BOUGHT — and on a procurement
       * portal that is the question that matters. A council buying agency
       * staff, laptops or legal advice will never need a site compound,
       * however the words happen to land.
       *
       * Applied to every source, not only the portals, because the list is
       * narrow enough to be safe anywhere: a trade press piece about an IT
       * support contract is not wanted either.
       */
      if (notOurs(text)) { out.notOurs++; continue; }

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

      /**
       * THE CONTACT, AND THE ORDER OF PREFERENCE.
       *
       * A notice's own contactPoint beats anything read off a company page: it
       * is specific to this procurement, the publisher filled it in for this
       * purpose, and it arrived in the same response as the award. A source's
       * standing contact page is the fallback for everything else, which is
       * most of the trade press.
       *
       * contactWithheld is computed HERE, before queue() scrubs, because
       * afterwards there is deliberately no way to tell the difference between
       * "no contact was published" and "one was, and it was a person's". The
       * reader needs to know which: the first means go and find a route in,
       * the second means open the notice and read it, where it is published
       * and lawful to read and nobody has copied it into a database.
       */
      let contactUrl = item.contactUrl || null;
      let roleAddress = item.roleAddress || null;
      const contactWithheld = Boolean(item.contactFound) && !isRoleAddress(roleAddress);

      if (enrich && !roleAddress && src.contactPage) {
        const page = await politeFetch(src.contactPage);
        if (page.ok && page.body) {
          const got = publishedContact(page.body, src.contactPage);
          contactUrl = contactUrl || got.contactUrl;
          roleAddress = got.roleAddress;
        }
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
        // Whose address it is, which matters as much as what it is: on an
        // award the notice's contact is often the BUYER who let the contract,
        // while the party needing a compound is the supplier who won it.
        contactOrg: item.contactOrg || null,
        contactRole: item.contactRole || null,
        contactWithheld,
        // Who let it and who won it, kept apart. On an award the supplier is
        // the one who needs a compound; the buyer is the one who paid for it.
        buyer: item.buyer || null,
        suppliers: item.suppliers || [],
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
