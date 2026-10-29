/**
 * THE BRIEF THAT WRITES A FIRST APPROACH, PINNED.
 *
 * WHY THIS TEST EXISTS. Four letters written to the old brief were delivered to
 * real inboxes at real companies and produced no replies at all. The failure
 * was not deliverability and not politeness — it was length and shape. The
 * brief allowed 200 words and the letters ran to 250; a supply chain manager
 * gives a cold email about five seconds, and in those five seconds the letters
 * read as every other supplier email that week.
 *
 * Two other faults were live in the same brief and were worse than the prose,
 * because they would have put something untrue in front of a customer:
 *
 *   1. It offered Prime Service Contractor. The policy in force insures a
 *      consultant and does not respond to holding works contracts, so a draft
 *      offering Model C promises what cannot lawfully be delivered.
 *   2. It said "Do not claim any insurance. None is held." True until
 *      26 October 2026 and false afterwards, so it forbade the single most
 *      useful fact the company has.
 *
 * A prompt is not documentation. It is the thing that runs.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
const src = fs.readFileSync(path.join(root, "backend", "lib", "ai.js"), "utf8");
const brief = src.slice(src.indexOf("You draft a FIRST APPROACH"), src.indexOf("Do not flatter"));

let pass = 0, fail = 0;
const ok = (c, m, saw) => {
  if (c) { pass++; console.log(`  ✓ ${m}`); }
  else { fail++; console.log(`  ✗ ${m}${saw !== undefined ? `\n      saw: ${saw}` : ""}`); }
};

console.log("\n=== it must not offer a model the insurance will not answer ===\n");
{
  ok(/Never offer Prime Service Contractor/.test(brief),
     "the approach brief forbids Prime Service Contractor outright");
  ok(/insures a consultant|does not respond to holding works contracts/i.test(brief),
     "  and says why, so it is not quietly reversed by someone tidying the prompt");

  const company = src.slice(src.indexOf("const COMPANY_BRIEF"), src.indexOf("const COMPANY_BRIEF") + 3000);
  ok(/must never be offered, quoted or implied to a prospect or client/.test(company),
     "the company brief that feeds EVERY agent carries the same constraint",
     company.slice(0, 80));
}

console.log("\n=== insurance: the truth, which changed on 26 October 2026 ===\n");
{
  ok(!/Do not claim any certification, accreditation or insurance\. None is held\./.test(src),
     "the old blanket 'none is held' is gone — it became false");
  ok(/5,000,000/.test(brief) || /£5,000,000/.test(brief),
     "the cover actually held may be stated");
  for (const [what, re] of [
    ["no ISO certification", /no ISO certification/i],
    ["no SSIP registration", /no SSIP registration/i],
    ["the employers' liability exemption", /Employers' Liability \(Compulsory Insurance\) Act 1969/],
  ]) ok(re.test(brief), `  and ${what} is still stated as the limit`);
}

console.log("\n=== length and shape, which is what cost the replies ===\n");
{
  const m = /UNDER (\d+) WORDS IN TOTAL/.exec(brief);
  ok(Boolean(m), "a hard word limit is set", m ? m[0] : "none found");
  ok(m && Number(m[1]) <= 150, "  and it is tight enough to be read", m ? m[1] : "—");

  ok(/answer themselves, from what they already know/i.test(brief),
     "the close is a question the recipient can answer unaided");
  ok(/never told that one word will do/i.test(brief),
     "  and the reader is never instructed how briefly to reply");

  // Short is necessary and not sufficient. The word limit alone produced a
  // draft with no greeting, no sender and an order rather than a request.
  for (const [what, re] of [
    ["a greeting", /OPEN WITH A GREETING/],
    ["who is writing", /SAY WHO IS WRITING/],
    ["one voice throughout", /ONE VOICE/],
    ["courtesy as a requirement", /COURTESY IS NOT PADDING/],
    ["a signature block", /CLOSE WITH A NAME AND A SIGNATURE BLOCK/],
  ]) ok(re.test(brief), `  and it requires ${what}`);

  /**
   * PROPRIETY, NOT STYLE. A bidder who emails a buyer privately during a live
   * procurement can be excluded for it. Clarifications belong on the portal,
   * where every bidder sees the answer.
   */
  ok(/A LIVE PROCUREMENT IS NOT A COLD-EMAIL TARGET/.test(brief),
     "a live procurement is not treated as a cold-email target");
  ok(/can be excluded for it/.test(brief),
     "  and the brief says why, so it is not softened later");
  ok(/never ask to be pointed at the right person|Never ask .*pointed at/i.test(brief),
     "  and asking for a referral is forbidden, because a favour from a stranger is not given",
     brief.slice(brief.indexOf("Close with"), brief.indexOf("Close with") + 160));
  ok(/Not congratulations/i.test(brief),
     "congratulations may not be the opening — it is what every other supplier sends");
  ok(/A SUBJECT LINE IS NOT A HEADLINE/.test(brief),
     "the subject line has its own rule");
}

console.log("\n=== the USP sentence is required, not optional ===\n");
{
  ok(/never hold your supply-chain money/i.test(brief),
     "the sentence that separates this from an intermediary is named in the brief");
  ok(/output specification|package boundaries/i.test(brief),
     "and so is the paper half of the work");
}

console.log("\n=== the limits that were already right are still there ===\n");
{
  for (const [what, re] of [
    ["inventing a fact or figure", /Do not invent a fact, a figure/],
    ["naming a client or scheme", /Do not name any client, scheme, employer or project/],
    ["stating a price", /Do not state or imply a price/],
    ["implying CDM Principal Contractor", /Principal Contractor or Principal Designer appointment under CDM/],
    ["saying anyone does the work badly", /does this work badly/],
  ]) ok(re.test(src), `${what} is still forbidden`);
}

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
