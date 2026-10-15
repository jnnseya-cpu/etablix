/**
 * The two drafting endpoints, called for real.
 *
 *   node backend/test/draft-shapes.e2e.mjs        (needs the server + mock)
 *
 * WHY THIS EXISTS. The supplier prequalification draft failed in the browser
 * with:
 *
 *   etablix.com says
 *   response is not defined
 *
 * draftPrequal ended `model: response.model`, and there is no `response` in
 * that function — it destructures `{ text }` from untilComplete. So every
 * draft threw a ReferenceError AFTER the call had completed and the JSON had
 * been parsed: the assessor lost the work, and the call had already been paid
 * for. Nothing caught it because nothing had ever called the endpoint.
 *
 * That is the lesson this file is written around. Reading the function does
 * not reveal it — `response.model` looks like every other line in the file,
 * and the identifier is only undefined at the moment it runs. The endpoint has
 * to be called.
 *
 * The second assertion is the one that matters more. Repairing the fault the
 * obvious way, by capturing the model as draftScope did, would have started
 * sending the model identifier to every delivery and finance user, because
 * both routes return the draft object to the browser whole. draftScope was
 * already doing it. So these tests pin the shape in both directions: the draft
 * arrives, and it never carries the engine's name.
 */
const B = process.env.BASE || "http://localhost:3311";
let pass = 0, fail = 0;
const ok = (c, m, x) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m + (x !== undefined ? "  → " + JSON.stringify(x).slice(0, 300) : ""))); };
const J = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return { _raw: t.slice(0, 200) }; } };
const api = async (p, { json, token, method } = {}) => {
  const r = await fetch(B + p, {
    method: method || (json ? "POST" : "GET"),
    headers: { ...(json ? { "content-type": "application/json" } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: json ? JSON.stringify(json) : undefined,
  });
  return { status: r.status, body: await J(r) };
};

/* A model identifier, in the shapes these ever take. Deliberately broad: a
   future model named something else must not appear either. */
const MODEL_ID = /claude|anthropic|gpt-|gemini|sonnet|opus|haiku|llama|mistral/i;
const namesAModel = (o) => MODEL_ID.test(JSON.stringify(o ?? null));

/* The public registration form is behind the same anti-bot gate a visitor
   meets: a signed challenge, a proof-of-work, and a minimum fill time. This
   solves it the way a browser does rather than going round it — a test that
   disabled the gate would stop testing the thing people actually use, and
   would quietly bless a bypass. The work is about four thousand hashes. */
async function human() {
  const { token, powPrefix, minWaitMs } = (await api("/api/human-check")).body;
  const { createHash } = await import("node:crypto");
  let pow = 0;
  while (!createHash("sha256").update(`${token}:${pow}`).digest("hex").startsWith(powPrefix)) pow++;
  await new Promise((r) => setTimeout(r, minWaitMs + 400));  // the fill-time trap
  return { hct: token, pow: String(pow) };
}

console.log("\n=== the drafting endpoints return a draft, and never name the engine ===\n");

const login = await api("/api/auth/login", { json: { email: "admin@etablix.com", password: "etablix-admin-2026" } });
const T = login.body.token;
ok(login.status === 200 && T, "admin signs in");

// --- 1. the supplier prequalification draft: the endpoint that was broken
console.log("\n--- the supplier prequalification draft\n");
{
  const proof = await human();
  const reg = await api("/api/subcontractors", {
    json: {
      ...proof,
      legalName: "Northgate Welfare Hire Limited",
      tradingName: "Northgate Welfare",
      contact: "A Tester",
      email: "supplier@example.invalid",
      phone: "01925 000000",
      regNumber: "09876543",
      capabilities: ["Modular-building suppliers", "Camp and accommodation suppliers"],
      territories: "North West England and North Wales",
      largestContract: "A 14-month highways compound",
      mobilisation: "10 working days",
      statement: "Family business since 2004. Own fleet of welfare and office units, own transport, own service engineers.",
      confirmed: true,
    },
  });
  ok(reg.status === 200 || reg.status === 201, `a supplier registers (${reg.status})`, reg.body);
  const id = reg.body?.application?.id || reg.body?.id;
  ok(Boolean(id), "and the registration has an id", reg.body);

  if (id) {
    const d = await api(`/api/subcontractors/${id}/assessment/draft`, { method: "POST", token: T, json: {} });
    // THE REGRESSION. This returned 502 {"error":"response is not defined"}.
    ok(d.status === 200, `the assessment drafts without throwing (${d.status})`, d.body);
    ok(!/is not defined/.test(JSON.stringify(d.body)), "and no identifier is undefined at the moment it runs", d.body);

    const draft = d.body?.draft;
    ok(draft && typeof draft === "object", "a draft comes back", d.body);
    if (draft) {
      ok(draft.scores && typeof draft.scores === "object", "with the scores the page reads");
      ok(!("model" in draft), "and WITHOUT a model field — the browser gets this object whole", Object.keys(draft));
      ok(!namesAModel(draft), "nothing anywhere in the draft names the engine", draft);

      // THE THREE SUMMARY FIELDS DO THREE JOBS.
      // They were one paragraph that fused why the scores were low, what was
      // risky, and what to do — and on a registration with nothing evidenced
      // it was unreadable, which is the same as being absent.
      console.log("\n--- the summary is three fields, not one paragraph\n");
      ok(typeof draft.basis === "string" && draft.basis.length > 0, "basis says why the scores are what they are", draft.basis);
      ok(Array.isArray(draft.risks), "risks is a list the page can render as a list", draft.risks);
      ok(typeof draft.recommendation === "string", "recommendation says what the approver should do", draft.recommendation);

      // THE OUTSTANDING ITEMS ARE GROUPED BY THE CRITERION THEY BLOCK.
      // They were a flat array the page joined with a middle dot: two dozen
      // items in one run of text that an assessor cannot work through.
      console.log("\n--- the outstanding items are grouped and countable\n");
      const ev = draft.missingEvidence;
      ok(Array.isArray(ev) && ev.length > 0, "the evidence list is grouped", ev);
      ok(ev.every((g) => typeof g.criterion === "string" && g.criterion && Array.isArray(g.items) && g.items.length),
         "every group names the criterion it blocks and carries items", ev);
      ok(ev.every((g) => g.items.every((i) => typeof i === "string" && i.trim())),
         "and every item is a non-empty string");
      const total = ev.reduce((n, g) => n + g.items.length, 0);
      ok(draft.missingEvidenceCount === total,
         `the count agrees with the list (${draft.missingEvidenceCount} vs ${total}) — a heading that disagrees is worse than none`);
      ok(new Set(ev.flatMap((g) => g.items)).size === total, "and nothing is listed twice");
    }

    // --- the one-click request: pending, never a verdict
    console.log("\n--- requesting the information holds the application pending\n");
    {
      const before = (await api(`/api/subcontractors`, { token: T })).body;
      const items = (d.body?.draft?.missingEvidence || []).flatMap((g) => g.items);
      const rq = await api(`/api/subcontractors/${id}/assessment/request-information`, {
        method: "POST", token: T, json: { items, note: "Please attach the certificates." },
      });
      ok(rq.status === 200, `the request sends in one call (${rq.status})`, rq.body);
      ok(rq.body?.items === items.length, "every listed item is sent, none dropped");
      ok(typeof rq.body?.link === "string" && /\/pqq\?t=/.test(rq.body.link),
         "with a live link to re-submit against — a request with nowhere to reply is a thread of attachments", rq.body?.link);

      // The whole point. It must not be a decision.
      ok(rq.body?.status === "information_requested", "and the application is parked, not decided", rq.body?.status);
      const list = (await api(`/api/subcontractors`, { token: T })).body;
      const row = (Array.isArray(list) ? list : list?.applications || []).find((a) => a.id === id);
      ok(row?.status === "information_requested", "the stored status says the same", row?.status);
      ok(!["prequalified", "approved", "declined"].includes(row?.status),
         "it is neither prequalified, approved nor declined — only a person recording an assessment moves it on");
      ok(!row?.assessment, "and no assessment was recorded by the request itself", row?.assessment);
      void before;
    }

    // Nothing to send must refuse rather than email an empty list.
    {
      const empty = await api(`/api/subcontractors/${id}/assessment/request-information`, {
        method: "POST", token: T, json: { items: [] },
      });
      ok(empty.status === 400, `an empty request is refused rather than sent (${empty.status})`, empty.body);
    }
  }
}

// --- 2. the scope draft: the same shape, where the leak was already live
console.log("\n--- the scope-of-works draft\n");
{
  const d = await api("/api/engagements/draft-scope", {
    token: T,
    json: {
      title: "Welfare and site accommodation hire",
      project: "confidential",
      brief: "A 12-month compound for up to 120 operatives. Welfare, offices, drying rooms, canteen seating. Supplier to deliver, install, service and remove.",
    },
  });
  ok(d.status === 200, `the scope drafts (${d.status})`, d.body);
  const draft = d.body?.draft;
  ok(draft && typeof draft.scope === "string" && draft.scope.length > 0, "a scope comes back", d.body);
  if (draft) {
    ok(!("model" in draft), "and WITHOUT a model field — this one was leaking it", Object.keys(draft));
    ok(!namesAModel(draft), "nothing in the scope payload names the engine");
  }
}

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
