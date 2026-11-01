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
  { what: "SSIP or Constructionline registration", find: /\bSSIP\b|Constructionline|\bCHAS\b|SafeContractor/i,
    allowed: /no SSIP|holds no|does not hold|not registered|supplier|subcontractor|required|require|checklist|attach|RIDDOR/i },
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
ok(/holds no ISO certification and no SSIP registration|no ISO certification and no SSIP/i.test(home),
   "and what it does not hold is named in the same breath");

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
