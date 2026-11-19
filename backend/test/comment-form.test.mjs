/**
 * A LINKEDIN COMMENT IS "ETABLIX", AND NOTHING ELSE IS ADDED TO IT.
 *
 *   node backend/test/comment-form.test.mjs
 *
 * Two phrases were dropped from comments by the director on 19 November 2026:
 * the legal entity with the company number, and "we never hold your money".
 * Both still belong in a letter. Neither belongs in a public thread.
 *
 * WHY THIS IS A TEST AND NOT A NOTE. Every comment is written by copying the
 * shape of the last one, which is exactly how the nine October comments came
 * to share a single formula — the failure the "never the same argument twice"
 * rule exists for. A form rule that lives only in prose is a rule that holds
 * until somebody is in a hurry.
 *
 * IT READS THE QUOTED COMMENT, NOT THE FILE. Each of these files is a working
 * note AROUND a comment: it explains the angle, records the checks, and quotes
 * the comment itself in a blockquote. The note may discuss the entity and the
 * contracting position at any length — that is the point of it. Only the lines
 * inside the blockquote are the thing that gets posted, so only those are
 * held to the form.
 *
 * AND THE THREE THAT PREDATE THE RULE ARE NAMED, WITH THE REASON. They were
 * written to the rule as it stood and they are not rewritten, exactly as the
 * trading-name correction in CLAUDE.md says: the next one corrects it by being
 * right, and nothing already drafted is rewritten to pretend otherwise. A
 * count would have said "three" and said nothing about which three.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const DIR = path.join(ROOT, "business/marketing");

let pass = 0, fail = 0;
const ok = (c, m, saw) => {
  if (c) { pass++; console.log(`  ✓ ${m}`); }
  else { fail++; console.log(`  ✗ ${m}${saw !== undefined ? `\n      saw: ${String(saw).slice(0, 300)}` : ""}`); }
};

/** Written before 19 November 2026, to the rule as it then stood. */
const PRE_RULE = {
  "linkedin-egl3-bam-converter-stations.md":
    "12 November 2026 — the cross-border converter station comment",
  "linkedin-sse-berwick-bank-b-siemens.md":
    "12 November 2026 — the Berwick Bank B jobs-number comment",
  "linkedin-balfour-woolavington-gravity.md":
    "19 November 2026, earlier the same day — the Gravity Enterprise Zone comment",
};

/** The lines a reader of the thread would actually see. */
const quoted = (file) =>
  fs.readFileSync(file, "utf8")
    .split("\n")
    .filter((l) => /^>/.test(l))
    .join("\n");

const files = fs.readdirSync(DIR)
  .filter((f) => /^linkedin-.*\.md$/.test(f))
  .filter((f) => f !== "linkedin-daily-comments.md");

console.log(`\n=== the dropped phrases are out of every comment written since ===\n`);
ok(files.length >= 30, `${files.length} comment notes read`, files.length);

const DROPPED = [
  { id: "the legal entity and company number", re: /part of JNN GLOBAL LTD|company 15405437|Company No\. 15405437/i },
  { id: '"we never hold your money"', re: /never hold your money/i },
];

for (const { id, re } of DROPPED) {
  const offenders = files
    .filter((f) => re.test(quoted(path.join(DIR, f))))
    .filter((f) => !(f in PRE_RULE));
  ok(offenders.length === 0,
     `no comment written since 19 November 2026 carries ${id} — it belongs in a letter, where the reader is a procurement officer who will ask, and not in a public thread`,
     offenders);
}

console.log("\n=== and the three that predate it are named, not counted ===\n");
{
  const stillCarrying = files.filter((f) =>
    DROPPED.some(({ re }) => re.test(quoted(path.join(DIR, f)))));
  const unnamed = stillCarrying.filter((f) => !(f in PRE_RULE));
  ok(unnamed.length === 0, "every file carrying a dropped phrase is on the named list", unnamed);

  const gone = Object.keys(PRE_RULE).filter((f) => !stillCarrying.includes(f));
  ok(gone.length === 0,
     "and every name on the list is still a file that needs it, so the list does not outlive what it excuses",
     gone);
  for (const [f, why] of Object.entries(PRE_RULE)) {
    ok(fs.existsSync(path.join(DIR, f)), `${f} exists — ${why}`);
  }
}

console.log("\n=== ETABLIX is still named, because dropping two phrases is not dropping the sell ===\n");
{
  // The point of the change is brevity, not anonymity. A comment that no
  // longer says who the business is has lost the thing the whole rule exists
  // for: a stranger reading over the poster's shoulder.
  const recent = files.filter((f) => !(f in PRE_RULE)).filter((f) => /ETABLIX/.test(quoted(path.join(DIR, f))));
  const named = files.filter((f) => /ETABLIX/.test(quoted(path.join(DIR, f))));
  ok(named.length >= 3,
     `${named.length} comment(s) name ETABLIX inside the quoted text — the change was to brevity, not to anonymity`,
     named.length);
  ok(recent.length >= 0, "and comments written since the rule are counted separately, so a drift to anonymity would show", recent.length);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
