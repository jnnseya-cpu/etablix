/**
 * THE PUBLIC SITE MAY NOT CLAIM WHAT THE COMPANY DOES NOT HOLD.
 *
 * This exists because the homepage did. In a card headed "Accreditations —
 * stated honestly" it said Constructionline and SSIP registration were in
 * progress and an ISO 9001 / 45001 / 14001 roadmap was under way; neither is
 * true, and the company's own outstanding-items file records SSIP as blocked
 * and ISO as something to buy only when a specific bid demands it. In the card
 * beside it, the site said professional indemnity, public liability AND
 * EMPLOYERS' LIABILITY cover were in place. There is no employers' liability
 * policy — correctly, because the only employee is the director, who holds a
 * majority of the issued share capital and is therefore exempt under the
 * Employers' Liability (Compulsory Insurance) Act 1969.
 *
 * A procurement officer who asks for the employers' liability certificate gets
 * nothing, and the conversation is over — not because the company is
 * uninsurable but because the website said something that was not so. The
 * exemption, written out in full, is a perfectly good answer. The claim is not.
 *
 * So the rule is tested rather than remembered: on a public page, each of
 * these may be named as a requirement, a supplier's obligation or an
 * exemption, and may not be claimed as something ETABLIX holds.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const PUBLIC = path.join(ROOT, "frontend/public");

let pass = 0, fail = 0;
const ok = (c, m, saw) => {
  if (c) { pass++; console.log(`  ✓ ${m}`); }
  else { fail++; console.log(`  ✗ ${m}${saw !== undefined ? `\n      saw: ${String(saw).slice(0, 300)}` : ""}`); }
};

/** Every page a member of the public can reach, including the generated ones. */
const pages = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(html|txt|xml)$/.test(entry.name)) pages.push(full);
  }
})(PUBLIC);

/** Sentences, roughly — enough to judge whether a phrase is a claim. */
const sentences = (file) =>
  fs.readFileSync(file, "utf8")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/);

const rel = (f) => path.relative(ROOT, f);

console.log("\n=== no public page claims cover or a certification the company does not hold ===\n");

/**
 * Each rule: what must not be claimed, and the words that make an appearance
 * legitimate — a requirement placed on a supplier, a gate that would have to be
 * satisfied, or the exemption stated plainly.
 */
const RULES = [
  { what: "employers' liability", find: /employer'?s'? liability/i,
    allowed: /exempt|no employer|not carry|supplier|subcontractor|you hold|required|require|gate|certificate beats|checklist|attach|maintain insurance|evidence it on request/i },
  { what: "ISO certification", find: /\bISO\s?9001|\bISO\s?14001|\bISO\s?45001/i,
    allowed: /no ISO|holds no|does not hold|not certified|when a (specific )?(bid|requirement)|supplier|subcontractor|required|checklist|attach/i },
  // CONSTRUCTIONLINE GOLD IS HELD FROM 27 NOVEMBER 2026, AND IT CARRIES SSIP.
  // This rule used to permit only a denial, which was right until the day it
  // was not: the card then understated the business and a buyer screening on
  // SSIP excluded it on its own say-so. "Constructionline Gold" is the one
  // positive form allowed, because it is the product actually held — a page
  // claiming CHAS, SafeContractor or a bare "SSIP registered" still fails.
  // PAS 91 WAS WITHDRAWN IN APRIL 2023, and Constructionline's own Gold page
  // still markets Gold as going "above and beyond PAS 91 requirements". So the
  // words are in front of whoever writes the next capability statement, and
  // claiming compliance with a withdrawn standard tells a buyer the writer did
  // not check. The Common Assessment Standard is the live one and may be named.
  { what: "PAS 91, which was withdrawn in April 2023", find: /\bPAS\s?91\b/i,
    allowed: /withdrawn|superseded|replaced|no longer|never claim/i },
  { what: "SSIP or Constructionline registration", find: /\bSSIP\b|Constructionline|\bCHAS\b|SafeContractor/i,
    allowed: /Constructionline Gold|no SSIP|holds no|does not hold|not registered|supplier|subcontractor|required|require|checklist|attach|RIDDOR/i },
];

for (const file of pages) {
  for (const sentence of sentences(file)) {
    for (const rule of RULES) {
      if (!rule.find.test(sentence)) continue;
      ok(rule.allowed.test(sentence),
         `${rel(file)} — ${rule.what} appears as a requirement or an exemption, not as a claim`,
         sentence.trim());
    }
  }
}

console.log("\n=== and one former employer is named nowhere a customer reads ===\n");

/**
 * The standing instruction is absolute: that company is never named as a
 * reference — not in a tender, not on a CV, not on LinkedIn, not in
 * conversation. It was on two public pages, in the director's background,
 * where a prospect reads it as exactly the credential the rule exists to stop
 * being used. The substance is kept and the name is not.
 */
for (const file of pages) {
  ok(!/vernova/i.test(fs.readFileSync(file, "utf8")),
     `${rel(file)} does not name that former employer`);
}

console.log("\n=== and the position it does hold is stated, with the figures ===\n");

const home = fs.readFileSync(path.join(PUBLIC, "index.html"), "utf8");
ok(/professional indemnity and public liability/i.test(home),
   "the homepage names the two policies that are actually in force");
ok(/£5,000,000|£5m/i.test(home), "with their limits, rather than 'limits on request'");
ok(/Employers'? Liability \(Compulsory Insurance\) Act 1969/.test(home),
   "and the employers' liability exemption is written out in full, by the Act that gives it");
ok(/no employers'? liability/i.test(home),
   "said plainly rather than left for a procurement team to discover");
ok(/Central Digital Platform/i.test(home),
   "the one registration the company does hold is named");
ok(/Constructionline Gold/.test(home) && /Common Assessment Standard/.test(home) && /\bSSIP\b/.test(home),
   "the accreditation actually held is named, with the standard it carries — a card that understates the business fails a buyer screening on SSIP just as surely as an overstatement fails a reader");
ok(/no ISO 9001, 14001 or 45001 certification/i.test(home),
   "and what is still NOT held is named in the same breath, by number");
ok(/certifies to no ISO standard/i.test(home),
   "with the one overclaim this makes available refused on the page itself: Gold assesses quality and environmental arrangements, it does not certify to an ISO standard");

// THE ONE NEW WAY TO LIE, NOW THAT SOMETHING IS HELD.
// Constructionline Gold assesses the themes ISO 9001/14001/45001 cover. The
// short step from "assessed" to "equivalent" is the overclaim a procurement
// officer can disprove in one question, so no page may take it.
{
  const EQUIV = /(equivalent|equal|as good as|in lieu of|same as)[^.]{0,40}ISO|ISO[^.]{0,40}(equivalent|or equivalent)/i;
  const offenders = pages.filter((f) => EQUIV.test(fs.readFileSync(f, "utf8"))).map(rel);
  ok(offenders.length === 0,
     "no page offers Constructionline Gold, CAS or SSIP as an ISO equivalent",
     offenders);
}

console.log("\n=== the data controller is the company, never a trading name ===\n");
//
// The privacy notice said "Data controller: ETABLIX, a Groupe Nseya brand"
// until 17 November 2026. A trading name is not a legal person and cannot
// control personal data, and it is the same failure as a trading name that
// does not resolve at Companies House: a reader checking the ICO register for
// "ETABLIX" finds nothing. UK GDPR Article 13(1)(a) asks for the identity of
// the controller, and the identity is the registered company.
{
  const privacyPath = path.join(PUBLIC, "policies/privacy.html");
  const privacy = fs.readFileSync(privacyPath, "utf8");
  const body = privacy.slice(privacy.indexOf("policy-body"));

  const controllerLines = body.split(/\n/).filter((l) => /data controller/i.test(l));
  ok(controllerLines.length > 0, "the privacy notice states who the controller is", controllerLines.length);
  ok(controllerLines.every((l) => /JNN GLOBAL LTD/.test(l)),
     "EVERY STATEMENT OF THE CONTROLLER NAMES JNN GLOBAL LTD — a trading name is not a legal person and cannot control personal data",
     controllerLines.find((l) => !/JNN GLOBAL LTD/.test(l)));
  ok(!controllerLines.some((l) => /controller:\s*ETABLIX|controller is ETABLIX/i.test(l)),
     "and none of them names a trading name as the controller, which is the sentence this guard exists to stop coming back",
     controllerLines.find((l) => /controller:\s*ETABLIX/i.test(l)));
  ok(/company (number )?15405437/i.test(body),
     "with the company number, so a reader can check it at Companies House");
  ok(/Information Commissioner's Office under reference/i.test(body) && /C2089949/.test(body),
     "AND THE ICO REGISTRATION REFERENCE, so the same reader can check it on the regulator's own register",
     /C2089949/.test(body));
}
{
  // Not sprayed across the site. The company number belongs in every footer;
  // the registration reference belongs where somebody looking for it goes.
  const carrying = pages.filter((f) => /C2089949/.test(fs.readFileSync(f, "utf8"))).map(rel);
  ok(carrying.length === 1 && carrying[0].endsWith("policies/privacy.html"),
     "the ICO reference appears on the privacy notice and nowhere else — repeating it on twenty footers makes neither it nor the company number easier to find",
     carrying);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
