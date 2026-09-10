/**
 * IndexNow — telling search engines a page changed, without an account.
 *
 * WHY THIS AND NOT A SITEMAP PING. Google retired its sitemap ping endpoint in
 * 2023 and it now answers 404; it found that unauthenticated submissions were
 * mostly spam. So for Google there is no way in except Search Console, which
 * needs a person and their login.
 *
 * IndexNow is the opposite. It is an open protocol supported by Bing, Yandex,
 * Seznam and Naver, and it authenticates by domain ownership rather than by
 * account: you host a key file at the root of the site, and a submission
 * carrying that key is accepted because only somebody who controls the site
 * could have put the file there. Bing usually crawls a submitted URL within
 * hours instead of whenever it next comes round.
 *
 * That matters here beyond Bing's own share of search: Bing's index feeds
 * several of the answer engines we care about, so this is the one lever on
 * AI-answer discovery that needs no human at all.
 *
 * THE KEY IS NOT A SECRET. It is published, by design, at
 * https://etablix.com/<key>.txt — that publication IS the proof of ownership.
 * It is committed to the repository for the same reason, and there is nothing
 * to leak. Rotating it means replacing the file; nothing else changes.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PUB = path.join(root, "frontend", "public");

export const SITE = "https://etablix.com";
export const ENDPOINT = "https://api.indexnow.org/IndexNow";

/**
 * The key, read from the file that publishes it.
 *
 * Deliberately derived from the file rather than held in a constant beside it.
 * Two copies of a key are a key that will one day disagree with itself, and
 * the failure — submissions silently rejected — looks exactly like nothing
 * happening at all.
 */
export function readKey() {
  const files = fs.readdirSync(PUB).filter((f) => /^[a-f0-9]{8,128}\.txt$/i.test(f));
  if (files.length === 0) return { key: null, file: null, error: "no IndexNow key file in frontend/public" };
  if (files.length > 1) return { key: null, file: null, error: `more than one key file: ${files.join(", ")} — an engine cannot tell which one is current` };
  const file = files[0];
  const contents = fs.readFileSync(path.join(PUB, file), "utf8").trim();
  const expected = file.replace(/\.txt$/i, "");
  if (contents !== expected) {
    return { key: null, file, error: `${file} contains "${contents.slice(0, 40)}" but must contain exactly its own name, ${expected}` };
  }
  return { key: expected, file, error: null };
}

/** Every URL in the sitemap — what "the site changed" means in practice. */
export function urlsFromSitemap() {
  const xml = fs.readFileSync(path.join(PUB, "sitemap.xml"), "utf8");
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

/**
 * URLs whose lastmod is on or after `since` — what actually changed.
 *
 * Submitting the whole site on every deploy is how a domain gets rate-limited
 * and quality-scored down. The protocol is for telling an engine what moved.
 */
export function changedSince(since) {
  const xml = fs.readFileSync(path.join(PUB, "sitemap.xml"), "utf8");
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)]
    .map((m) => ({
      loc: /<loc>([^<]+)<\/loc>/.exec(m[1])?.[1],
      lastmod: /<lastmod>([^<]+)<\/lastmod>/.exec(m[1])?.[1],
    }))
    .filter((u) => u.loc && u.lastmod && u.lastmod >= since)
    .map((u) => u.loc);
}

/**
 * Submit a list of URLs.
 *
 * A 200 means accepted. A 202 means the engine has the list and is about to
 * fetch the key file to check it — normal on a first submission, and not an
 * error. Anything else is reported with its body rather than swallowed,
 * because a submission that quietly fails is indistinguishable from one that
 * quietly worked.
 */
export async function submit(urls, { key, host = "etablix.com", endpoint = ENDPOINT, fetchImpl = fetch, dryRun = false } = {}) {
  if (!key) throw new Error("No IndexNow key.");
  const list = [...new Set(urls)].filter((u) => u.startsWith(`https://${host}`));
  if (!list.length) return { submitted: 0, status: null, ok: true, note: "nothing changed — nothing sent" };
  if (list.length > 10000) throw new Error("IndexNow accepts at most 10,000 URLs in one request.");
  const body = { host, key, keyLocation: `https://${host}/${key}.txt`, urlList: list };
  if (dryRun) return { submitted: list.length, status: null, ok: true, note: "dry run — nothing sent", body };

  const res = await fetchImpl(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  const text = await res.text().catch(() => "");
  const ok = res.status === 200 || res.status === 202;
  return {
    submitted: list.length,
    status: res.status,
    ok,
    note: res.status === 202
      ? "accepted — the engine will fetch the key file to verify ownership, which is normal on a first submission"
      : res.status === 200
      ? "accepted"
      : `refused: ${text.slice(0, 200)}`,
    urls: list,
  };
}
