/**
 * Client engagements — the customer half of the operating system.
 *
 *   invoice accepted → portal issued with the requirement checklist →
 *   client answers it once → client confirms the start → deposit invoice
 *   raised AUTOMATICALLY → funds clear → work → deliverable published in
 *   the portal → client approves / reviews / rejects → approval raises
 *   the balance invoice AUTOMATICALLY → closed.
 *
 * Two things about this file are deliberate.
 *
 * The invoices are minted through the document studio's own
 * createDocument, in the same INV-YYYY-NNN series as one raised by hand.
 * An automatic invoice that lived in its own table would be a second
 * ledger, and a second ledger is discovered during a dispute.
 *
 * Nothing here is a state a human types. The stage advances only as the
 * consequence of an act — issuing the portal, confirming the start,
 * clearing a payment, publishing a deliverable, taking a decision — so
 * the record of what happened and the record of where we are cannot
 * disagree.
 */

import { Router } from "express";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import { collection, insert, update, remove } from "../lib/store.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ROLES, ACCESS } from "../../shared/constants.js";
import { acceptDocuments, describeFiles, UPLOAD_DIR } from "../lib/uploads.js";
import { emit, emitDetached } from "../lib/comms.js";
import { createDocument, renderDocument, splitDiagnostic } from "./docs.js";
import { startPipelineRun } from "./agents.js";
import {
  STAGES, stage, stageIndex, MODELS, MODEL_IDS, model, deliverableOrNull,
  DELIVERABLES, deliverable, REQUIREMENT_PACKS, packFor, buildChecklist,
  checklistState, nextAction, DECISIONS, DECISION_IDS, nextPeriodLabel,
  depositTerms, balanceTerms, money, diagnosticInputs, handoverDate, DIAGNOSTIC_FIELD_MAP,
} from "../lib/clientflow.js";
import { diagnosticDates } from "../lib/workingdays.js";

const router = Router();
const finance = [requireAuth, requireRole(...ACCESS.DELIVERY_FINANCE)];
const admin = [requireAuth, requireRole(ROLES.ADMIN)];
const SITE_URL = (process.env.SITE_URL || "https://etablix.com").replace(/\/+$/, "");

const clampStr = (v, max = 300) => String(v ?? "").trim().slice(0, max);
const toNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
/** How a checklist state reads in an audit trail a person has to make sense of. */
const STATE_WORDS = { supplied: "supplied", not_held: "not held, with an explanation", outstanding: "reopened" };

const find = (id) => collection("clientEngagements").find((e) => e.id === id);
const byToken = (t) => collection("clientEngagements").find((e) => e.portalToken && e.portalToken === t);

/** Reference used in every email and on every invoice for this engagement. */
function reference(e) {
  return e.reference || `ENG-${new Date(e.createdAt || Date.now()).getFullYear()}-${String(e.seq || 1).padStart(3, "0")}`;
}

/** The public shape: derived state, never stored, so the two views agree. */
/**
 * The audit trail lives inside the engagement row, in a file that is
 * rewritten in full on every change, so it is capped. 400 entries is far more
 * than an engagement generates in 38 months, and the cap means a runaway
 * loop cannot bloat the store.
 */
const TRAIL_MAX = 400;
function trail(existing, entry) {
  const next = [...(existing || []), entry];
  return next.length > TRAIL_MAX ? next.slice(next.length - TRAIL_MAX) : next;
}

function decorate(e) {
  const chk = checklistState(e.checklist || []);
  const m = model(e.model);
  // deliverable() falls back to the first entry, which would label an
  // unclassified enquiry as a feasibility review and nobody would notice.
  const d = deliverableOrNull(e.deliverable);
  return {
    ...e,
    reference: reference(e),
    modelName: m.name,
    deliverableName: d ? d.name : "Not yet agreed",
    stageLabel: stage(e.stage).label,
    stageIndex: stageIndex(e.stage),
    checklistState: chk,
    next: nextAction(e),
    deposit: depositTerms(e),
    balance: balanceTerms(e),
    recurring: m.recurring,
  };
}

/** Strip anything the client should not see out of the portal payload. */
function forClient(e) {
  const full = decorate(e);
  const { portalToken, internalNotes, margin, ...safe } = full;
  return {
    ...safe,
    documents: (e.documents || []).map((d) => ({ id: d.id, number: d.number, kind: d.kind, label: d.label, amount: d.amount, issuedAt: d.issuedAt, paidAt: d.paidAt || null })),
  };
}

// ============================================================== internal

/** GET /api/clients/catalogue — the models, deliverables and packs the desk offers. */
router.get("/catalogue", ...finance, (req, res) => {
  res.json({
    models: MODEL_IDS.map((id) => MODELS[id]),
    deliverables: DELIVERABLES,
    packs: Object.values(REQUIREMENT_PACKS).map((p) => ({ id: p.id, name: p.name, items: p.items.length, clockNote: p.clockNote })),
    stages: STAGES,
    decisions: Object.values(DECISIONS),
  });
});

/** GET /api/clients — every engagement, newest first. */
router.get("/", ...finance, (req, res) => {
  const engagements = [...collection("clientEngagements")].sort((a, b) => b.createdAt - a.createdAt).map(decorate);
  res.json({ engagements });
});

/** GET /api/clients/:id — one engagement in full, checklist included. */
router.get("/:id", ...finance, (req, res) => {
  const e = find(req.params.id);
  if (!e) return res.status(404).json({ error: "Engagement not found." });
  res.json({ engagement: decorate(e) });
});

/**
 * POST /api/clients — open an engagement.
 *
 * The checklist is built here, at creation, from the deliverable's pack.
 * Building it later would mean the client's list could be edited after
 * they had already answered part of it.
 */
router.post("/", ...finance, (req, res) => {
  const b = req.body || {};
  const client = clampStr(b.client, 160);
  const project = clampStr(b.project, 160);
  const deliverableId = clampStr(b.deliverable, 60);
  if (client.length < 2 || project.length < 2) {
    return res.status(400).json({ error: "Give the client and the project." });
  }
  if (!DELIVERABLES.some((d) => d.id === deliverableId)) {
    return res.status(400).json({ error: "Choose a deliverable from the catalogue." });
  }
  const d = deliverable(deliverableId);
  const m = model(b.model || d.model);
  const fee = toNum(b.fee);
  const monthlyFee = toNum(b.monthlyFee);
  if (m.kind === "fixed" && fee <= 0) return res.status(400).json({ error: "A Model A engagement needs an agreed fixed fee." });
  if (m.kind === "recurring" && monthlyFee <= 0) return res.status(400).json({ error: "A Model B or C engagement needs a monthly fee." });

  const year = new Date().getFullYear();
  const seq = collection("clientEngagements").filter((e) => new Date(e.createdAt).getFullYear() === year).length + 1;
  const row = insert("clientEngagements", {
    client,
    clientAddress: clampStr(b.clientAddress, 400),
    contactName: clampStr(b.contactName, 120),
    contactEmail: clampStr(b.contactEmail, 160).toLowerCase(),
    project,
    deliverable: d.id,
    model: m.id,
    fee,
    monthlyFee,
    mobilisationFee: toNum(b.mobilisationFee),
    platformFee: toNum(b.platformFee),
    advance: toNum(b.advance),
    vatMode: ["standard", "reverse", "none"].includes(b.vatMode) ? b.vatMode : "standard",
    clientRef: clampStr(b.clientRef, 80),
    construx: Boolean(b.construx),
    veryx: Boolean(b.veryx),
    internalNotes: clampStr(b.internalNotes, 2000),
    reference: `ENG-${year}-${String(seq).padStart(3, "0")}`,
    seq,
    stage: "agreed",
    checklist: buildChecklist(d.id),
    documents: [],
    deliverables: [],
    events: [{ at: Date.now(), by: req.user.name, what: "Engagement opened", detail: `${m.name} — ${d.name}` }],
    openedBy: req.user.name,
  });
  res.status(201).json({ engagement: decorate(row) });
});

/**
 * POST /api/clients/:id/terms — put commercial terms on an engagement that
 * arrived from the website with none.
 *
 * This is the one step that cannot be automated, and it is deliberately a
 * person's decision: the deliverable, the model and the fee. The website
 * publishes no price and the catalogue range is indicative, so nothing here
 * reads a number off a list. Once the terms are set the engagement behaves
 * exactly like one opened by hand.
 */
router.post("/:id/terms", ...finance, (req, res) => {
  const e = find(req.params.id);
  if (!e) return res.status(404).json({ error: "Engagement not found." });
  if (!["enquiry", "agreed"].includes(e.stage)) {
    return res.status(400).json({ error: `Terms cannot be changed at the stage "${stage(e.stage).label}".` });
  }
  const b = req.body || {};
  const deliverableId = clampStr(b.deliverable, 60);
  if (!DELIVERABLES.some((d) => d.id === deliverableId)) {
    return res.status(400).json({ error: "Choose a deliverable from the catalogue." });
  }
  const d = deliverable(deliverableId);
  const m = model(b.model || d.model);
  const fee = toNum(b.fee);
  const monthlyFee = toNum(b.monthlyFee);
  if (m.kind === "fixed" && fee <= 0) return res.status(400).json({ error: "A Model A engagement needs an agreed fixed fee." });
  if (m.kind === "recurring" && monthlyFee <= 0) return res.status(400).json({ error: "A Model B or C engagement needs a monthly fee." });

  // The checklist follows the deliverable. It is only rebuilt while nothing
  // has been answered — replacing a list the client has already worked down
  // would throw their answers away.
  const answered = (e.checklist || []).some((i) => i.state !== "outstanding");
  const checklist = answered ? e.checklist : buildChecklist(deliverableId);
  if (answered && e.deliverable !== deliverableId) {
    return res.status(400).json({ error: "The client has already started answering the checklist for the current deliverable. Changing it now would discard their answers." });
  }

  const project = clampStr(b.project, 160) || e.project;
  update("clientEngagements", e.id, {
    deliverable: d.id, model: m.id, fee, monthlyFee,
    mobilisationFee: toNum(b.mobilisationFee), platformFee: toNum(b.platformFee), advance: toNum(b.advance),
    vatMode: ["standard", "reverse", "none"].includes(b.vatMode) ? b.vatMode : (e.vatMode || "standard"),
    clientRef: clampStr(b.clientRef, 80) || e.clientRef,
    client: clampStr(b.client, 160) || e.client,
    clientAddress: clampStr(b.clientAddress, 400) || e.clientAddress,
    contactName: clampStr(b.contactName, 120) || e.contactName,
    contactEmail: (clampStr(b.contactEmail, 160) || e.contactEmail || "").toLowerCase(),
    construx: b.construx === undefined ? Boolean(e.construx) : Boolean(b.construx),
    veryx: b.veryx === undefined ? Boolean(e.veryx) : Boolean(b.veryx),
    project, checklist,
    stage: "agreed",
    events: trail(e.events, { at: Date.now(), by: req.user.name, what: "Terms agreed",
      detail: `${m.name} — ${d.name}${m.kind === "fixed" ? ` — £${fee.toLocaleString()}` : ` — £${monthlyFee.toLocaleString()}/month`}` }),
  });
  res.json({ engagement: decorate(find(e.id)) });
});

/**
 * POST /api/clients/:id/issue-portal — the customer has agreed. Mint the
 * token, open the portal, send the link and the checklist in one act.
 * This is the "once we send the invoice and the customer agrees" step,
 * and it is one click because a second click is a step somebody forgets.
 */
router.post("/:id/issue-portal", ...finance, async (req, res) => {
  const e = find(req.params.id);
  if (!e) return res.status(404).json({ error: "Engagement not found." });
  // An engagement opened automatically from a website enquiry carries no
  // agreed terms. Issuing its portal would send a checklist and a payment
  // schedule to somebody who has not been quoted, so it is refused here
  // rather than guarded by everybody remembering.
  if (e.stage === "enquiry") {
    return res.status(400).json({
      error: "This came in from the website and has no agreed terms yet. Set the deliverable, the model and the fee first — nothing goes to the client until a person has priced it.",
    });
  }
  if (!e.contactEmail) return res.status(400).json({ error: "Add the client contact email before issuing the portal — the link has to go somewhere." });
  const token = e.portalToken || crypto.randomBytes(24).toString("hex");
  const pack = packFor(e.deliverable);
  const link = `${SITE_URL}/client-portal?t=${token}`;
  const chk = checklistState(e.checklist || []);

  update("clientEngagements", e.id, {
    portalToken: token,
    portalIssuedAt: Date.now(),
    portalIssuedBy: req.user.name,
    stage: e.stage === "agreed" ? "information" : e.stage,
    events: trail(e.events, { at: Date.now(), by: req.user.name, what: "Portal issued", detail: `Checklist of ${chk.total} items sent to ${e.contactEmail}` }),
  });

  emitDetached("client.portal.issued", {
    email: e.contactEmail,
    greeting: e.contactName ? e.contactName.split(" ")[0] : undefined,
    vars: { reference: reference(e), company: e.client, item: deliverable(e.deliverable).name },
    detailsText:
      `Your portal (keep this link to your project team):\n${link}\n\n` +
      `Engagement: ${deliverable(e.deliverable).name}\nProject: ${e.project}\n` +
      `Checklist: ${chk.total} items, ${chk.mandatoryTotal} of them required before we start.\n\n` +
      `${pack.clockNote}\n\n` +
      `Payment: ${depositTerms(e).label} — ${money(depositTerms(e).amount)} when you confirm the start; ` +
      `${balanceTerms(e).label.toLowerCase()}.`,
  });
  res.json({ engagement: decorate(find(e.id)), link });
});

/** POST /api/clients/:id/remind — nudge, naming exactly what is outstanding. */
router.post("/:id/remind", ...finance, async (req, res) => {
  const e = find(req.params.id);
  if (!e) return res.status(404).json({ error: "Engagement not found." });
  if (!e.portalToken) return res.status(400).json({ error: "The portal has not been issued yet." });
  const chk = checklistState(e.checklist || []);
  if (chk.canStart) return res.status(400).json({ error: "Nothing mandatory is outstanding — there is nothing to chase." });
  const outstanding = chk.outstandingItems.filter((i) => i.mandatory);
  emitDetached("client.portal.reminder", {
    email: e.contactEmail,
    greeting: e.contactName ? e.contactName.split(" ")[0] : undefined,
    vars: { reference: reference(e), value: String(outstanding.length), item: outstanding.map((i) => i.title).join("; ") },
    detailsText: `Your portal:\n${SITE_URL}/client-portal?t=${e.portalToken}\n\nOutstanding:\n${outstanding.map((i) => "• " + i.title).join("\n")}`,
  });
  update("clientEngagements", e.id, {
    events: trail(e.events, { at: Date.now(), by: req.user.name, what: "Reminder sent", detail: `${outstanding.length} mandatory items` }),
  });
  res.json({ sent: outstanding.length });
});

/** POST /api/clients/:id/payment-received — a deposit or balance has cleared. */
router.post("/:id/payment-received", ...finance, async (req, res) => {
  const e = find(req.params.id);
  if (!e) return res.status(404).json({ error: "Engagement not found." });
  const kind = req.body?.kind === "balance" ? "balance" : "deposit";
  const docs = e.documents || [];
  const target = [...docs].reverse().find((d) => d.kind === kind && !d.paidAt);
  if (!target) return res.status(400).json({ error: `There is no unpaid ${kind} invoice on this engagement.` });

  const updatedDocs = docs.map((d) => (d.id === target.id ? { ...d, paidAt: Date.now(), paidBy: req.user.name } : d));
  const m = model(e.model);
  // A deposit starts the work. A balance closes a fixed engagement and
  // rolls a recurring one back into delivery for the next month.
  const nextStage = kind === "deposit" ? "in_progress" : m.recurring ? "in_progress" : "closed";

  update("clientEngagements", e.id, {
    documents: updatedDocs,
    stage: nextStage,
    events: trail(e.events, { at: Date.now(), by: req.user.name, what: `${kind === "deposit" ? "Deposit" : "Balance"} received`, detail: `${target.number} — ${money(target.amount)}` }),
  });

  if (kind === "deposit") {
    emitDetached("client.deposit.received", {
      email: e.contactEmail,
      greeting: e.contactName ? e.contactName.split(" ")[0] : undefined,
      vars: { reference: reference(e), item: target.number, value: money(target.amount) },
    });
  } else if (!m.recurring) {
    emitDetached("client.engagement.closed", {
      email: e.contactEmail,
      greeting: e.contactName ? e.contactName.split(" ")[0] : undefined,
      vars: { reference: reference(e) },
      detailsText: `Your portal stays open:\n${SITE_URL}/client-portal?t=${e.portalToken}`,
    });
  }
  res.json({ engagement: decorate(find(e.id)) });
});

/**
 * POST /api/clients/:id/deliverable — publish work to the portal for the
 * client's decision. Multipart: the deliverable files. `documentId` links
 * a document already in the studio instead of re-uploading it.
 */
router.post("/:id/deliverable", ...finance, acceptDocuments, async (req, res) => {
  const e = find(req.params.id);
  if (!e) return res.status(404).json({ error: "Engagement not found." });
  if (!["in_progress", "decision", "deposit"].includes(e.stage)) {
    return res.status(400).json({ error: `Nothing can be issued at the stage "${stage(e.stage).label}".` });
  }
  const label = clampStr(req.body?.label, 160) || (model(e.model).recurring ? nextPeriodLabel(e) : deliverable(e.deliverable).name);
  const summary = clampStr(req.body?.summary, 3000);
  const sections = String(req.body?.sections || "")
    .split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 40);
  const files = describeFiles(req.files || []);
  let linkedId = clampStr(req.body?.documentId, 40);

  // A completed diagnostic becomes the report here, in one act, rather than
  // being copied by hand into the document studio and then published. The
  // report carries the run's own handover and due dates, so a slipped
  // handover cannot move a date the client was already given.
  const runId = clampStr(req.body?.runId, 40);
  if (runId && !linkedId) {
    const run = collection("agentTasks").find((r) => r.id === runId);
    if (!run) return res.status(404).json({ error: "That run does not exist." });
    if (run.status === "running") return res.status(400).json({ error: "That run has not finished yet." });
    if (!run.output) return res.status(400).json({ error: "That run produced no output to issue." });
    const { data } = splitDiagnostic(run.output);
    const dates = diagnosticDates(String(run.inputs?.handover || "").slice(0, 10));
    const doc = createDocument({
      template: "diagnostic",
      issuedBy: req.user.name,
      data: {
        ...data,
        client: e.client,
        project: e.project,
        handover: String(run.inputs?.handover || "").slice(0, 10),
        dueDate: dates?.due || "",
        promisedDays: dates?.days || null,
        datesAssured: dates?.assured || false,
      },
    });
    linkedId = doc.id;
  }

  const linked = linkedId ? collection("documents").find((d) => d.id === linkedId) : null;
  if (!files.length && !linked) {
    return res.status(400).json({ error: "Attach the deliverable, or link a document from the studio. A decision needs something to decide on." });
  }

  const item = {
    id: crypto.randomBytes(8).toString("hex"),
    kind: model(e.model).recurring ? "period" : "deliverable",
    label,
    summary,
    sections,
    files,
    documentId: linked ? linked.id : null,
    documentNumber: linked ? linked.number : null,
    issuedAt: Date.now(),
    issuedBy: req.user.name,
    revision: (e.deliverables || []).filter((d) => d.label === label).length + 1,
    decision: null,
  };
  update("clientEngagements", e.id, {
    deliverables: [...(e.deliverables || []), item],
    stage: "decision",
    events: trail(e.events, { at: Date.now(), by: req.user.name, what: "Deliverable issued", detail: `${label} (rev ${item.revision})` }),
  });

  emitDetached("client.deliverable.issued", {
    email: e.contactEmail,
    greeting: e.contactName ? e.contactName.split(" ")[0] : undefined,
    vars: { reference: reference(e), item: label },
    detailsText:
      `Your portal:\n${SITE_URL}/client-portal?t=${e.portalToken}\n\n` +
      (summary ? `In summary:\n${summary}\n\n` : "") +
      (sections.length ? `Sections you can comment against:\n${sections.map((s) => "• " + s).join("\n")}\n\n` : "") +
      `Approving raises ${balanceTerms(e).label.toLowerCase()} — ${money(balanceTerms(e).amount)} — automatically.`,
  });
  res.status(201).json({ engagement: decorate(find(e.id)) });
});

/**
 * POST /api/clients/:id/run-diagnostic — run the diagnostic on the pack the
 * client already supplied through the portal.
 *
 * This is the join that makes the process one process. Without it the client
 * uploads a pack to the portal and somebody downloads it and uploads it again
 * to the agent, which is two processes with a person in between — and the
 * person is where the version drift comes from.
 *
 * The handover date is read from the record: the day the last mandatory item
 * was settled. The ten working days run from there, whoever starts the run
 * and whenever they get round to it.
 */
router.post("/:id/run-diagnostic", ...finance, async (req, res) => {
  const e = find(req.params.id);
  if (!e) return res.status(404).json({ error: "Engagement not found." });
  if (deliverable(e.deliverable).pack !== "feasibility") {
    return res.status(400).json({ error: "The diagnostic runs on a feasibility engagement. This one is a " + deliverable(e.deliverable).name + "." });
  }
  const chk = checklistState(e.checklist || []);
  if (!chk.canStart) {
    return res.status(400).json({ error: `${chk.mandatoryOutstanding} mandatory item(s) are still unanswered. The clock has not started.` });
  }
  const handover = handoverDate(e);
  if (!handover) return res.status(400).json({ error: "The handover date cannot be read from the checklist. Every mandatory item must carry the date it was answered." });

  // The client's own files, read straight from where the portal stored them.
  const files = [];
  for (const item of e.checklist || []) {
    for (const f of item.files || []) {
      const full = path.join(UPLOAD_DIR, path.basename(f.stored));
      if (fs.existsSync(full)) files.push({ originalname: f.name, path: full, mimetype: f.type });
    }
  }

  try {
    const run = await startPipelineRun({
      agentId: "diagnostic",
      title: `${e.project} — Site Systems Diagnostic`,
      runBy: req.user.name,
      engagementId: e.id,
      inputs: { client: e.client, project: e.project, handover, ...diagnosticInputs(e) },
      files,
    });
    const dates = diagnosticDates(handover);
    update("clientEngagements", e.id, {
      diagnosticRunId: run.id,
      handoverDate: handover,
      reportDueDate: dates?.due || null,
      events: trail(e.events, { at: Date.now(), by: req.user.name, what: "Diagnostic started",
        detail: `${files.length} client document(s) · handover ${handover} · report due ${dates?.due || "—"}` }),
    });
    res.status(202).json({ runId: run.id, files: files.length, handover, due: dates?.due || null, engagement: decorate(find(e.id)) });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

/** DELETE /api/clients/:id — admin only. */
router.delete("/:id", ...admin, (req, res) => {
  const row = remove("clientEngagements", req.params.id);
  if (!row) return res.status(404).json({ error: "Engagement not found." });
  res.json({ deleted: true });
});

// ================================================================ portal

const portal = (req, res) => {
  const e = byToken(req.params.token);
  if (!e) {
    res.status(404).json({ error: "This portal link is not valid. Contact contact@etablix.com and quote your project name." });
    return null;
  }
  return e;
};

/** GET /api/clients/portal/:token — everything the client's portal renders. */
router.get("/portal/:token", (req, res) => {
  const e = portal(req, res);
  if (!e) return;
  const pack = packFor(e.deliverable);
  res.json({
    engagement: forClient(e),
    pack: { id: pack.id, name: pack.name, clockNote: pack.clockNote },
    stages: STAGES,
    decisions: Object.values(DECISIONS),
    platforms: {
      construx: { inScope: Boolean(e.construx), url: "/construx" },
      veryx: { inScope: Boolean(e.veryx), url: "/veryx" },
    },
  });
});

/**
 * POST /api/clients/portal/:token/checklist/:itemId — answer one line.
 *
 * "not_held" is a first-class answer, not a failure state. A client who
 * has told us a thing does not exist has answered the question, and
 * chasing them for it again is exactly the repetition this is built to
 * remove.
 */
router.post("/portal/:token/checklist/:itemId", acceptDocuments, async (req, res) => {
  const e = portal(req, res);
  if (!e) return;
  if (["closed"].includes(e.stage)) return res.status(400).json({ error: "This engagement is closed." });
  const list = e.checklist || [];
  const idx = list.findIndex((i) => i.id === req.params.itemId);
  if (idx < 0) return res.status(404).json({ error: "That item is not on your checklist." });

  const item = list[idx];
  const state = ["supplied", "not_held", "outstanding"].includes(req.body?.state) ? req.body.state : item.state;
  const note = clampStr(req.body?.note, 2000);
  // A client who cannot see the file they sent will send it again. Appending
  // blindly meant the same document was then counted twice: twice in the pack
  // the diagnostic reads, twice in the evidence a finding is drawn from, and
  // twice on the record the client is shown. A re-sent document REPLACES the
  // one it supersedes, matched on the name and the size the client's own
  // machine gave it.
  const incoming = describeFiles(req.files || []);
  // Matched on the NAME alone, not the name and size. The common case is not
  // an identical re-send, it is a corrected one: the client sends
  // programme.pdf again because the first was wrong or because they could not
  // see it. Sending a document of the same name against the same line means
  // "this is the programme" — the latest is the one that counts, and the
  // earlier one must not stay behind to be read a second time.
  const superseded = new Set(incoming.map((f) => f.name.toLowerCase()));
  const kept = (item.files || []).filter((f) => !superseded.has(String(f.name).toLowerCase()));
  const replaced = (item.files || []).length - kept.length;
  const files = [...kept, ...incoming];

  if (state === "not_held" && !note) {
    return res.status(400).json({ error: "Tell us in a line why it does not exist or is not held. An absence we know about is a finding; an absence we do not is a hole." });
  }
  if (state === "supplied" && item.accepts === "file" && !files.length) {
    return res.status(400).json({ error: "This item needs a document attached." });
  }
  if (state === "supplied" && !files.length && !note) {
    return res.status(400).json({ error: "Attach the document, or answer in the note box." });
  }

  const updated = [...list];
  updated[idx] = { ...item, state, note, files, updatedAt: Date.now() };
  const before = checklistState(list);
  const after = checklistState(updated);

  update("clientEngagements", e.id, {
    checklist: updated,
    events: trail(e.events, { at: Date.now(), by: e.contactName || e.client, what: "Checklist updated",
      detail: `${item.title} — ${STATE_WORDS[state]}` + (replaced ? ` (${replaced} document${replaced === 1 ? "" : "s"} replaced by a newer copy of the same name)` : "") }),
  });

  // The moment the last mandatory item lands, the desk is told — the
  // clock on a diagnostic starts here and nobody should have to notice.
  if (!before.canStart && after.canStart) {
    emitDetached("client.information.complete", {
      vars: { company: e.client, reference: reference(e) },
      detailsText: `${e.project}\n${deliverable(e.deliverable).name}\n\nNot held (${after.notHeldItems.length}):\n${after.notHeldItems.map((i) => `• ${i.title} — ${i.note}`).join("\n") || "none"}`,
    });
  }
  res.json({ engagement: forClient(find(e.id)) });
});

/**
 * POST /api/clients/portal/:token/start — the client's instruction to
 * proceed. This raises the deposit invoice automatically: the same act,
 * one click, no email in between.
 */
router.post("/portal/:token/start", async (req, res) => {
  const e = portal(req, res);
  if (!e) return;
  if (!["information", "ready"].includes(e.stage)) {
    return res.status(400).json({ error: "The start has already been confirmed on this engagement." });
  }
  const chk = checklistState(e.checklist || []);
  if (!chk.canStart) {
    return res.status(400).json({
      error: `${chk.mandatoryOutstanding} required item${chk.mandatoryOutstanding === 1 ? " is" : "s are"} still unanswered. Supply it, or mark it as not held with a note.`,
      outstanding: chk.outstandingItems.filter((i) => i.mandatory),
    });
  }
  const by = clampStr(req.body?.name, 120) || e.contactName || e.client;
  if (!req.body?.authorised) {
    return res.status(400).json({ error: "Confirm that you are authorised to instruct the start." });
  }

  const terms = depositTerms(e);
  const d = deliverable(e.deliverable);
  const m = model(e.model);
  const doc = createDocument({
    template: "invoice",
    issuedBy: "ETABLIX — raised automatically on the client's instruction to start",
    data: {
      client: e.client,
      clientAddress: e.clientAddress,
      clientRef: e.clientRef,
      project: `${e.project} — ${reference(e)}`,
      vatMode: e.vatMode,
      lines: [{ description: `${terms.label} — ${d.name}`, qty: 1, rate: terms.amount }],
      notes:
        `${terms.narrative}\n\nBasis: ${terms.basis}.\n` +
        `Instructed by ${by} in the client portal on ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.\n` +
        `${m.kind === "fixed" ? `Balance: ${balanceTerms(e).label} — ${money(balanceTerms(e).amount)}, raised on your approval of the deliverable and not before.` : `Thereafter: ${balanceTerms(e).label}.`}`,
    },
  });

  const record = { id: doc.id, number: doc.number, kind: "deposit", label: terms.label, amount: terms.amount, issuedAt: Date.now(), paidAt: null };
  update("clientEngagements", e.id, {
    stage: "deposit",
    startConfirmedAt: Date.now(),
    startConfirmedBy: by,
    documents: [...(e.documents || []), record],
    events: trail(e.events, { at: Date.now(), by, what: "Start confirmed by the client", detail: `${doc.number} raised automatically — ${money(terms.amount)}` }),
  });

  emitDetached("client.deposit.requested", {
    email: e.contactEmail,
    greeting: e.contactName ? e.contactName.split(" ")[0] : undefined,
    vars: { reference: reference(e), item: doc.number, value: money(terms.amount), outcome: terms.basis },
    detailsText: `Your portal:\n${SITE_URL}/client-portal?t=${e.portalToken}\n\n${terms.narrative}`,
  });
  emitDetached("client.start.confirmed", {
    vars: { company: e.client, reference: reference(e), actor: by, item: doc.number, value: money(terms.amount) },
  });
  res.json({ engagement: forClient(find(e.id)), invoice: { number: doc.number, amount: terms.amount } });
});

/**
 * POST /api/clients/portal/:token/decision — approve, review, reject.
 *
 * Approval and the balance invoice are one act. There is no state in
 * which the client has approved and somebody still has to remember to
 * invoice: that gap is where a month of cash goes.
 */
router.post("/portal/:token/decision", async (req, res) => {
  const e = portal(req, res);
  if (!e) return;
  if (e.stage !== "decision") return res.status(400).json({ error: "There is nothing awaiting your decision." });
  const list = e.deliverables || [];
  const idx = list.length - 1;
  const item = list[idx];
  if (!item || item.decision) return res.status(400).json({ error: "That deliverable has already been decided." });

  const choice = DECISION_IDS.includes(req.body?.decision) ? req.body.decision : null;
  if (!choice) return res.status(400).json({ error: "Choose approve, review with comments, or reject." });
  const spec = DECISIONS[choice];
  const by = clampStr(req.body?.name, 120) || e.contactName || e.client;

  // Comments arrive as [{section, comment}] so a round of review is
  // answerable line by line rather than as a mood.
  const comments = Array.isArray(req.body?.comments)
    ? req.body.comments
        .map((c) => ({ section: clampStr(c?.section, 160), comment: clampStr(c?.comment, 2000) }))
        .filter((c) => c.comment)
        .slice(0, 60)
    : [];
  if (spec.requiresComment && !comments.length) {
    return res.status(400).json({ error: "Add at least one comment against a section. A comment against a section can be answered; a comment against the whole document cannot." });
  }

  const decision = { decision: choice, by, at: Date.now(), comments };
  const updated = [...list];
  updated[idx] = { ...item, decision };

  const patch = {
    deliverables: updated,
    events: trail(e.events, { at: Date.now(), by, what: `Client decision: ${spec.label}`, detail: `${item.label} rev ${item.revision}${comments.length ? ` — ${comments.length} comment(s)` : ""}` }),
  };

  let invoice = null;
  if (choice === "approved") {
    const terms = balanceTerms(e);
    const m = model(e.model);
    const doc = createDocument({
      template: "invoice",
      issuedBy: "ETABLIX — raised automatically on the client's approval",
      data: {
        client: e.client,
        clientAddress: e.clientAddress,
        clientRef: e.clientRef,
        project: `${e.project} — ${reference(e)}`,
        vatMode: e.vatMode,
        lines: [{ description: `${terms.label} — ${item.label}`, qty: 1, rate: terms.amount }],
        notes:
          `${terms.narrative}\n\nBasis: ${terms.basis}.\n` +
          `Approved by ${by} in the client portal on ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.` +
          (m.recurring ? "" : " The deliverable is yours to keep whatever you decide to do next."),
      },
    });
    invoice = { number: doc.number, amount: terms.amount };
    patch.documents = [...(e.documents || []), { id: doc.id, number: doc.number, kind: "balance", label: terms.label, amount: terms.amount, issuedAt: Date.now(), paidAt: null }];
    patch.stage = "balance";
    patch.events.push({ at: Date.now(), by: "ETABLIX", what: "Balance invoice raised automatically", detail: `${doc.number} — ${money(terms.amount)}` });
  } else {
    // Review and rejection both put the work back with us. The
    // difference is what we owe the client back: a revision, or an
    // explanation of how it missed the requirement.
    patch.stage = "in_progress";
  }
  update("clientEngagements", e.id, patch);

  if (invoice) {
    emitDetached("client.balance.requested", {
      email: e.contactEmail,
      greeting: e.contactName ? e.contactName.split(" ")[0] : undefined,
      vars: { reference: reference(e), item: invoice.number, value: money(invoice.amount), outcome: item.label },
      detailsText: `Your portal:\n${SITE_URL}/client-portal?t=${e.portalToken}`,
    });
  }
  emitDetached("client.decision.recorded", {
    vars: {
      company: e.client, reference: reference(e), actor: by, item: `${item.label} rev ${item.revision}`, outcome: spec.label,
      value: invoice ? `Invoice ${invoice.number} for ${money(invoice.amount)} was raised automatically.` : `${comments.length} comment(s) to answer.`,
    },
    detailsText: comments.length ? comments.map((c) => `[${c.section || "General"}] ${c.comment}`).join("\n\n") : undefined,
  });
  res.json({ engagement: forClient(find(e.id)), invoice });
});

/** GET /api/clients/portal/:token/files/:stored — a file the client sent or was sent. */
router.get("/portal/:token/files/:stored", (req, res) => {
  const e = portal(req, res);
  if (!e) return;
  const stored = path.basename(req.params.stored);
  const meta = [
    ...(e.checklist || []).flatMap((i) => i.files || []),
    ...(e.deliverables || []).flatMap((d) => d.files || []),
  ].find((f) => f.stored === stored);
  const file = path.join(UPLOAD_DIR, stored);
  if (!meta || !fs.existsSync(file)) return res.status(404).json({ error: "File not found." });
  res.download(file, meta.name);
});

/** GET /api/clients/portal/:token/documents/:docId — render an invoice for the client. */
router.get("/portal/:token/documents/:docId", (req, res) => {
  const e = byToken(req.params.token);
  if (!e) return res.status(404).send("This portal link is not valid.");
  const ref = (e.documents || []).find((d) => d.id === req.params.docId);
  const linked = (e.deliverables || []).some((d) => d.documentId === req.params.docId);
  if (!ref && !linked) return res.status(404).send("That document is not on this engagement.");
  const doc = collection("documents").find((d) => d.id === req.params.docId);
  if (!doc) return res.status(404).send("Document not found.");
  res.send(renderDocument(doc));
});

export default router;
