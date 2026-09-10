/**
 * Reach — one page that answers both questions about the website.
 *
 * "What is the SEO score" and "how many people read it" were answerable
 * before this existed, but only by running a test suite and by reading a
 * strip of text on another page. Two numbers that decide whether the writing
 * is worth doing should not require a terminal.
 *
 * The join is the point. A score without views is a tidy page nobody reads.
 * Views without a score is traffic you cannot explain or repeat. Per post,
 * side by side, they answer the only question that matters commercially:
 * which piece of writing brought somebody who could buy something.
 */
import { Router } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { requireAuth } from "../middleware/auth.js";
import { auditSite, MAX_SCORE } from "../lib/seo.js";
import { summary, viewsForPage, today } from "../lib/reach.js";
import { cadence, ratePerWeek } from "../lib/editorial.js";
import { POSTS, DRAFTS, PLAN, postUrl } from "../lib/blog.js";

const router = Router();
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PUBLIC_DIR = path.join(root, "frontend", "public");

/**
 * The audit walks every page on disk and parses it. That is milliseconds, but
 * it is milliseconds per dashboard refresh for an answer that cannot change
 * until the next deploy — the files are baked into the image. So it is held
 * for a minute, which also means a browser left open on this page all day
 * costs the server almost nothing.
 */
let cached = { at: 0, audit: null };
function audit() {
  if (cached.audit && Date.now() - cached.at < 60_000) return cached.audit;
  cached = { at: Date.now(), audit: auditSite(PUBLIC_DIR) };
  return cached.audit;
}

const round = (n) => Math.round(n * 10) / 10;

/** GET /api/reach — the score, the views and the cadence, in one object. */
router.get("/", requireAuth, (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 400);
  let a;
  try {
    a = audit();
  } catch (err) {
    // A page that cannot be parsed must not take the dashboard down with it.
    return res.status(500).json({ error: `The site audit failed: ${err.message}` });
  }

  const scoreFor = (file) => a.pages.find((p) => p.file === file) || null;
  const failures = (p) => p.results.filter((r) => r.got < r.of).map((r) => ({ what: r.what, got: r.got, of: r.of, note: r.note || null }));

  const scores = a.pages.map((p) => p.score);
  const seo = {
    max: MAX_SCORE,
    average: scores.length ? round(scores.reduce((s, n) => s + n, 0) / scores.length) : null,
    lowest: scores.length ? Math.min(...scores) : null,
    pagesScored: scores.length,
    // The gate the publish tool enforces, stated here so the number on screen
    // and the number that blocks a submission are visibly the same one.
    gate: 90,
    below: a.pages.filter((p) => p.score < 90).map((p) => ({ file: p.file, score: p.score })),
    pages: a.pages
      .sort((x, y) => x.score - y.score)
      .map((p) => ({ file: p.file, url: p.url, kind: p.kind, score: p.score, earned: p.earned, applicable: p.applicable, failures: failures(p) })),
    excluded: a.excluded,
  };

  const views = summary({ days });

  const live = POSTS.map((p) => {
    const url = postUrl(p);
    const v = viewsForPage(url);
    const s = scoreFor(`blog/${p.slug}.html`);
    return {
      slug: p.slug,
      title: p.title,
      published: p.published,
      updated: p.updated,
      url,
      score: s ? s.score : null,
      views: v.views,
      bots: v.bots,
      // The first crawler visit is the answer to "is it indexed yet", from
      // our own logs rather than from an external tool's guess.
      firstCrawl: v.firstCrawl,
      buyer: p.buyer || null,
    };
  });

  const c = cadence({ posts: POSTS, drafts: DRAFTS, plan: PLAN, today: today() });

  res.json({
    seo,
    views,
    editorial: {
      ...c,
      ratePerWeek: ratePerWeek(c),
      live,
      drafts: DRAFTS.map((d) => ({ slug: d.slug, title: d.title })),
      plan: PLAN.map((b) => ({ slug: b.slug, title: b.title, buyer: b.buyer, objection: b.objection, sourcesNeeded: b.sourcesNeeded || null })),
    },
  });
});

export default router;
