/**
 * THE APPOINTMENT IS A FACT THE PLATFORM HOLDS, NOT A THING PEOPLE REMEMBER.
 *
 * Two separate failures are pinned here, and they are different in kind.
 *
 * The first is a misstatement. Seven deliverables write text that names a
 * contracting party — an Employer's Requirements clause, an interface matrix
 * row, a payment mechanism. Which party is correct depends entirely on the
 * delivery model the engagement was signed under, and nothing used to tell the
 * agent which one that was. "ETABLIX contracts the suppliers" under an
 * Advisory appointment is not a style error: it is a material misstatement of
 * the commercial arrangement, in a document the client issues to the market.
 *
 * The second is an offer the company cannot stand behind. Model C — Prime
 * Service Contractor — is designed, priced and gated in this system, which is
 * precisely what made it quotable and openable from a screen. The
 * professional indemnity policy in force insures a consultant and does not
 * respond to holding works contracts, so a Model C quotation or engagement
 * offers something that cannot be performed. Every control over that is keyed
 * off one flag, and these tests exist so the flag cannot quietly stop being
 * read.
 *
 * The public pages are tested too. A page that offers the model is an offer
 * however carefully the internal routes refuse it.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");

const {
  DELIVERY_MODELS, OFFERABLE_MODELS, DELIVERY_INVARIANTS, DELIVERY_MODEL_FIELD,
  deliveryModel, deliveryModelByCode, deliveryModelLabel, deliveryBrief,
} = await import("../../shared/constants.js");
const { MODELS, offerableModels } = await import("../lib/clientflow.js");

let pass = 0, fail = 0;
const ok = (c, m, saw) => {
  if (c) { pass++; console.log(`  ✓ ${m}`); }
  else { fail++; console.log(`  ✗ ${m}${saw !== undefined ? `\n      saw: ${saw}` : ""}`); }
};
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

console.log("\n=== three models, and only two of them are for sale ===\n");

ok(DELIVERY_MODELS.length === 3, "all three are recorded — the one we cannot sell is designed, not deleted",
   DELIVERY_MODELS.map((m) => m.code).join(","));
ok(OFFERABLE_MODELS.length === 2 && OFFERABLE_MODELS.every((m) => m.code !== "C"),
   "exactly two are offerable today, and neither is C", OFFERABLE_MODELS.map((m) => m.code).join(","));

const prime = deliveryModel("prime");
ok(prime && prime.offerable === false, "Model C is flagged not offerable", prime && prime.offerable);
ok(prime && /insures a consultant/i.test(prime.notOfferableBecause || ""),
   "and the reason travels with the flag, so no screen has to carry it", prime && prime.notOfferableBecause);

ok(deliveryModelByCode("c") === prime && deliveryModelByCode("A") === deliveryModel("advisory"),
   "the commercial side's A/B/C resolves to the same three records — one set of facts, not two");

console.log("\n=== the invariants hold under every model ===\n");

const inv = DELIVERY_INVARIANTS.join(" ");
ok(/Principal Contractor/i.test(inv) && /Never ETABLIX|holds neither/i.test(inv),
   "CDM Principal Contractor and Principal Designer are never ETABLIX, under any model");
ok(/release decision/i.test(inv), "the release decision is the client's");
ok(/isolations|permits/i.test(inv), "operational authority on a live site is the client's or the operator's");
ok(/never holds the client's supply-chain money/i.test(inv),
   "under A and B we never hold the client's supply-chain money");

console.log("\n=== the money side and the responsibility side cannot drift ===\n");

for (const m of Object.values(MODELS)) {
  const d = deliveryModelByCode(m.id);
  ok(Boolean(d) && m.offerable === d.offerable && m.holdsSupplierContracts === d.holdsSupplierContracts,
     `Model ${m.id} carries the shared record's facts rather than its own copy`,
     `${m.offerable} / ${m.holdsSupplierContracts}`);
}
ok(offerableModels().length === 2 && !offerableModels().some((m) => m.id === "C"),
   "the commercial side offers A and B only", offerableModels().map((m) => m.id).join(","));

console.log("\n=== the appointment reaches the agent as facts ===\n");

const a = deliveryBrief("advisory");
ok(/Model A — Advisory/.test(a) && /supplier contracts are held by the client/i.test(a),
   "under Advisory the agent is told the client holds the contracts");
ok(/enquiry and the evaluation are run by the client/i.test(a),
   "and that the client runs the enquiry");

const b = deliveryBrief("integrator");
ok(/supplier contracts are held by the client/i.test(b) && /enquiry and the evaluation are run by ETABLIX/i.test(b),
   "under Management Integrator the client still holds the contracts and ETABLIX runs the enquiry");
ok(/suppliers are paid by the client/i.test(b),
   "and the client still pays the suppliers — we never hold their money");

const none = deliveryBrief("");
ok(/No delivery model has been recorded/i.test(none) && /write nothing that\s*\nstates who holds/i.test(none),
   "with no model recorded the agent is forbidden from stating who contracts at all");
ok(/leave it open|decision the client must take/i.test(none),
   "and told to leave it as an open client decision — a visible gap, not a guess");

for (const brief of [a, b, none]) {
  ok(/Principal Contractor/i.test(brief), "every appointment clause carries the CDM invariant with it");
}

console.log("\n=== the deliverables that name a contracting party ask which model ===\n");

for (const id of ["site-requirements", "village-requirements", "tender-pack",
                  "procurement", "interface-register", "mobilisation-review",
                  // A bid response is an offer to a buyer, so it is the single
                  // worst place for the wrong model. It used to ask for the
                  // intended model as free text in the same box as everything
                  // else — which is a second answer that can disagree with the
                  // engagement, and a box somebody can type "Model C" into.
                  "bid-response"]) {
  const mod = await import(`../lib/pipelines/${id}.js`);
  const f = (mod.FIELDS || []).find((x) => x.name === DELIVERY_MODEL_FIELD.name);
  ok(Boolean(f), `${id} asks which delivery model the appointment is under`);
}

ok(DELIVERY_MODEL_FIELD.required !== true,
   "the field is not required — a required select would silently default to Advisory");
ok(DELIVERY_MODEL_FIELD.options.includes("") && !DELIVERY_MODEL_FIELD.options.includes("prime"),
   "it offers blank and the offerable models only, never Prime",
   DELIVERY_MODEL_FIELD.options.join(","));

console.log("\n=== an agent that carries the field gets the clause, one that does not is untouched ===\n");

const ai = read("backend/lib/ai.js");
ok(/carriesModel/.test(ai) && /\$\{brief\.system\}\$\{appointment\}/.test(ai),
   "runAgent appends the appointment to the system prompt on both the pipeline and single-call paths");
ok((ai.match(/\$\{brief\.system\}\$\{appointment\}/g) || []).length === 2,
   "both paths, not one — a single-call agent would otherwise write with no appointment",
   (ai.match(/\$\{brief\.system\}\$\{appointment\}/g) || []).length);

console.log("\n=== Model C cannot be quoted or contracted from a screen ===\n");

const docs = read("backend/routes/docs.js");
ok(/OFFERABLE_MODELS\.map\(deliveryModelLabel\)/.test(docs),
   "the fee quotation's delivery-model options come from the offerable list");
ok(!/Model C — Prime Service Contractor"\]/.test(docs) && !/"Model C/.test(docs),
   "no hard-coded Model C option is left in the document templates");
ok(/function deliveryModelBreach/.test(docs) && /deliveryModelBreach\(data\)/.test(docs),
   "and the route refuses one posted directly, because a dropdown is not a control");

const clients = read("backend/routes/clients.js");
ok(/m\.offerable === false/.test(clients) && /not open for appointment/i.test(clients),
   "opening an engagement under a model that is not offerable is refused at the route");
ok(/appointmentInput/.test(clients),
   "and the model travels from the signed engagement into every run started from it");

console.log("\n=== the public pages do not offer what the policy will not answer ===\n");

for (const page of ["frontend/public/index.html", "frontend/public/what-we-offer.html",
                    "frontend/public/how-it-works.html", "frontend/public/llms.txt",
                    "frontend/public/policies/terms.html"]) {
  const html = read(page);
  if (!/Prime Service Contractor/i.test(html)) continue;
  ok(/not open (for appointment|today)|NOT OPEN FOR APPOINTMENT/i.test(html),
     `${page} says plainly that the model is not open for appointment`);
  ok(/insures a consultant/i.test(html),
     `${page} gives the reason rather than leaving it to be asked about`);
}

const offer = read("frontend/public/what-we-offer.html");
ok(!/Choose Prime Service Contractor when/i.test(offer),
   "the page no longer tells a reader when to choose it — that sentence was the offer");

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
