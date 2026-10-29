/**
 * THE BRIEF THAT WRITES A FIRST APPROACH, PINNED BY SUBSTANCE RATHER THAN PROSE.
 *
 * An earlier version of this file asserted on headings — "OPEN WITH A GREETING",
 * "ONE VOICE", "CLOSE WITH A NAME AND A SIGNATURE BLOCK". Rewriting the brief
 * broke twenty assertions at once without a single rule having changed, which
 * is a test telling you about its own wording rather than about the thing it
 * guards. Where a rule can be checked by what it requires rather than by how it
 * is phrased, it is checked that way here.
 *
 * What is guarded, and why each one earned a test:
 *
 *   LENGTH — letters at 250 words reached real inboxes and drew no replies.
 *   IDENTITY — the first attempt at brevity produced an anonymous instruction.
 *   NAMING — three forms of this company's names reached three readers in a
 *     fortnight, and one did not resolve at Companies House.
 *   INSURANCE — the brief once said none was held, which became false on
 *     26 October 2026 and forbade the most useful fact the company has.
 *   MODEL C — the policy insures a consultant, so offering it promises what
 *     cannot lawfully be delivered.
 *   PROPRIETY — a bidder seeking a private answer on scope can be excluded.
 *   SIZE — at two thousand words the provider declined every call made with it.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
const src = fs.readFileSync(path.join(root, "backend", "lib", "ai.js"), "utf8");
const brief = src.slice(src.indexOf("You draft a FIRST APPROACH"), src.indexOf("`,", src.indexOf("You draft a FIRST APPROACH")));

let pass = 0, fail = 0;
const ok = (c, m, saw) => {
  if (c) { pass++; console.log(`  ✓ ${m}`); }
  else { fail++; console.log(`  ✗ ${m}${saw !== undefined ? `\n      saw: ${saw}` : ""}`); }
};

console.log("\n=== it stays small enough to be a request to write a letter ===\n");
{
  const words = brief.split(/\s+/).filter(Boolean).length;
  ok(words < 900, `the brief is ${words} words`, words);
  ok(brief.length < 6000, `and ${brief.length} characters`, brief.length);

  // Reasons belong in the comment above the function, which is never sent.
  const fn = src.slice(src.indexOf("THE BRIEF IS SHORT ON PURPOSE"), src.indexOf("export async function draftApproach"));
  ok(fn.length > 500, "the reasoning for each rule is kept in a comment instead", fn.length);
  ok(!/produced this|came out like this|for example, this draft/i.test(brief),
     "and no worked example of a previous output is quoted in the brief");
  const quoted = [...brief.matchAll(/\n\s{4,}"[^"]{60,}/g)];
  ok(quoted.length === 0, "nor any long quoted passage", quoted.map((m) => m[0].slice(0, 50)).join(" | "));
}

console.log("\n=== length and shape of the letter it asks for ===\n");
{
  const m = /Under (\d+) words/i.exec(brief);
  ok(Boolean(m) && Number(m[1]) <= 150, "a tight word limit is set for the letter", m ? m[0] : "none");
  ok(/six words or fewer/i.test(brief), "the subject line is capped");
  ok(/answer from what they already know/i.test(brief),
     "the closing question is answerable unaided");
  ok(/never say how briefly to reply/i.test(brief),
     "and the reader is not told how briefly to answer");
  ok(/Not congratulations/i.test(brief), "congratulations may not open it");
}

console.log("\n=== the letter identifies who sent it ===\n");
{
  ok(/A greeting/i.test(brief), "it opens with a greeting");
  ok(/I am Justin Nseya, director of ETABLIX, part of JNN GLOBAL LTD, company 15405437/.test(brief),
     "the introduction is given as fixed wording, not described");
  ok(/Director, ETABLIX, part of JNN GLOBAL LTD \(company 15405437\)/.test(brief),
     "and so is the signature block");
  ok(/contact@etablix\.com/.test(brief) && /\+44 7493 216101/.test(brief),
     "with a real address and telephone number in it");

  // The brief must not contain the placeholders it forbids.
  const own = [...brief.matchAll(/\[(director|company|name|insert)[^\]]*\]/gi)].map((m) => m[0]);
  ok(own.length === 0, "and the brief carries no placeholder of its own", own.join(", "));
  ok(/Leave a bracket, a placeholder, a TBC or a blank/i.test(brief),
     "placeholders are forbidden in the output");
}

console.log("\n=== the company's voice, which is not the comment rule ===\n");
{
  ok(/the company acts, the signatory introduces and asks/i.test(brief),
     "the work is the company's voice and the signature is the person's");
  ok(/we never hold your money|we never hold your supply-chain money/i.test(brief),
     "the contracting position belongs to the company");
  ok(/reads as a sole trader/i.test(brief),
     "and the reason is given, so it is not reverted to match the LinkedIn rule");
}

console.log("\n=== naming the company ===\n");
{
  ok(/"ETABLIX, part of JNN GLOBAL LTD, company 15405437" at first mention/.test(brief),
     "the full name is required at first mention");
  ok(/Never a shortened or varied form of the legal name/.test(brief),
     "and no variant is permitted");
}

console.log("\n=== what may and may not be claimed ===\n");
{
  ok(/£5,000,000/.test(brief), "the cover actually held may be stated");
  ok(/no ISO certification/i.test(brief) && /no SSIP registration/i.test(brief),
     "and the two that are not held are named");
  ok(/Employers' Liability \(Compulsory Insurance\) Act 1969/.test(brief),
     "with the employers' liability exemption written out rather than left blank");
  ok(!/Do not claim any certification, accreditation or insurance\. None is held\./.test(src),
     "the old blanket denial is gone — it became false on 26 October 2026");

  ok(/Offer Prime Service Contractor/.test(brief) && /policy insures a consultant/i.test(brief),
     "Model C is forbidden, with the reason");
  const company = src.slice(src.indexOf("const COMPANY_BRIEF"), src.indexOf("const COMPANY_BRIEF") + 3000);
  ok(/must never be offered, quoted or implied to a prospect or client/.test(company),
     "and the brief feeding every other agent carries the same constraint");
}

console.log("\n=== a live procurement has one proper route ===\n");
{
  ok(/contact published on the notice/i.test(brief),
     "writing to the published contact is allowed");
  ok(/scope or evaluation/i.test(brief),
     "and what is improper is named: scope or evaluation, answered privately");
  ok(/every bidder sees the answer/.test(brief), "with the portal as the shared channel");
  ok(/would advantage this bidder over another/.test(brief),
     "and a test for the ambiguous case");
}

console.log("\n=== the limits that were always right ===\n");
{
  for (const [what, re] of [
    ["inventing a fact or figure", /Invent a fact, figure, statistic/],
    ["naming a client or scheme", /Name any client, scheme, employer or project/],
    ["stating a price", /State or imply a price/],
    ["implying CDM Principal Contractor", /Principal Contractor or Principal Designer appointment under CDM/],
    ["saying anyone does the work badly", /does this work badly/],
    ["asserting a role from a headline", /Assert a role for a named organisation/],
    ["describing how the letter was produced", /Describe how this letter was produced/],
  ]) ok(re.test(brief), `${what} is forbidden`);

  ok(/WRITE TO THE STAGE/.test(brief), "and the three stages are still written to differently");
  for (const stage of ["open", "confirmed", "early"]) {
    ok(new RegExp(`^- ${stage}:`, "m").test(brief), `  ${stage} has its own instruction`);
  }
}

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
