/**
 * The publishing cadence, as arithmetic rather than as an intention.
 *
 * WHAT A DAILY BLOG ACTUALLY REQUIRES. Not a scheduler. Publishing costs one
 * command; the thing that fails is having something to publish on a day when
 * three other things went wrong. So the only number that predicts whether a
 * daily cadence survives is the BUFFER: how many finished, unpublished posts
 * are sitting in the repository right now.
 *
 * A buffer of one is a cadence that ends on the first bad day. A buffer of
 * seven survives a week of site problems. Everything in this file exists to
 * make that number visible before it reaches zero, because by the time the
 * cadence has visibly broken it is a fortnight since anybody noticed.
 *
 * The functions here are pure — they take arrays and a date and return
 * numbers — so the cadence can be tested without a database, a clock or a
 * network. backend/test/editorial.test.mjs asserts on the awkward cases: two
 * posts on one day, a gap over a weekend, a schedule entry dated tomorrow.
 */

const DAY = 86400000;
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
const ms = (day) => Date.parse(`${day}T00:00:00Z`);

/** Every date from `from` to `to` inclusive, as ISO days. */
export function daysBetween(from, to) {
  const out = [];
  for (let t = ms(from); t <= ms(to); t += DAY) out.push(iso(t));
  return out;
}

/**
 * The state of the cadence on a given day.
 *
 * `posts` are published (each carrying `published`), `drafts` are written and
 * unpublished, `plan` are briefs not yet written. The three are deliberately
 * different currencies and are never added together into one reassuring
 * number: a brief is not a draft, and a draft is not a post.
 */
export function cadence({ posts = [], drafts = [], plan = [], today, window = 30 } = {}) {
  if (!today) throw new Error("cadence() needs an explicit today — a function that reads the clock cannot be tested.");

  const byDay = new Map();
  for (const p of posts) {
    if (!p.published) continue;
    byDay.set(p.published, (byDay.get(p.published) || 0) + 1);
  }
  const published = [...byDay.keys()].sort();
  const last = published.length ? published[published.length - 1] : null;
  const first = published.length ? published[0] : null;

  // The window we report on: the last `window` days ending today, but never
  // earlier than the first post — a blog three days old is not 27 days behind.
  const windowStart = iso(Math.max(ms(today) - (window - 1) * DAY, first ? ms(first) : ms(today)));
  const days = daysBetween(windowStart, today);
  const missed = days.filter((d) => !byDay.has(d));

  // The streak counts back from today, and today counts only if something
  // went out. A streak that includes a day still in progress flatters itself.
  let streak = 0;
  for (let t = ms(today); ; t -= DAY) {
    if (!byDay.has(iso(t))) break;
    streak += 1;
  }

  const daysSinceLast = last ? Math.round((ms(today) - ms(last)) / DAY) : null;
  const publishedToday = byDay.has(today);
  const bufferDays = drafts.length;

  return {
    today,
    publishedToday,
    lastPublished: last,
    daysSinceLast,
    streak,
    // What is actually in the repository, finished, waiting.
    bufferDays,
    // Briefs. Not posts. Named separately so nobody reads one as the other.
    plannedBriefs: plan.length,
    postsInWindow: days.length - missed.length,
    windowDays: days.length,
    missedDays: missed,
    // The next two decisions a person has to make today.
    nextToPublish: drafts[0] || null,
    nextToWrite: plan[0] || null,
    ...verdict({ publishedToday, bufferDays, daysSinceLast }),
  };
}

/**
 * One sentence a person can act on, and the action.
 *
 * Ordered by what hurts soonest. An empty buffer outranks a missed day,
 * because a missed day is yesterday's problem and an empty buffer is every
 * day from here.
 */
function verdict({ publishedToday, bufferDays, daysSinceLast }) {
  if (bufferDays === 0 && !publishedToday)
    return { state: "empty", say: "Nothing published today and nothing written to publish. Write one before anything else.", act: "write" };
  if (bufferDays === 0)
    return { state: "spent", say: "Today is out, and the buffer is now empty. Tomorrow has nothing in it.", act: "write" };
  if (!publishedToday)
    return { state: "due", say: `Nothing published today. ${bufferDays} written and waiting.`, act: "publish" };
  if (bufferDays < 3)
    return { state: "thin", say: `Today is out, but the buffer is down to ${bufferDays}. Two bad days ends the run.`, act: "write" };
  if (daysSinceLast !== null && daysSinceLast > 1)
    return { state: "resumed", say: "Back on cadence after a gap.", act: "write" };
  return { state: "ok", say: `Today is out and ${bufferDays} are written ahead.`, act: "write" };
}

/**
 * Posts per week over the reported window, to one decimal place.
 *
 * Reported as a rate rather than as "on target", because the target is a
 * decision and the rate is a fact, and mixing the two is how a dashboard
 * starts lying to the person who built it.
 */
export function ratePerWeek(c) {
  if (!c.windowDays) return 0;
  return Math.round((c.postsInWindow / c.windowDays) * 7 * 10) / 10;
}
