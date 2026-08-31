/**
 * Communications console API — catalogue, deliveries, in-app feed,
 * template preview and send-test-to-me.
 */

import { Router } from "express";
import { collection, update } from "../lib/store.js";
import { verifyToken } from "../lib/auth.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ROLES } from "../../shared/constants.js";
import { CATEGORIES, EVENTS, SAMPLE_VARS } from "../lib/catalog.js";
import { emit, renderEvent } from "../lib/comms.js";

const router = Router();

/**
 * GET /api/comms/preview/:code — branded HTML email preview.
 * Opens in a browser tab, so it authenticates via ?token= like file
 * downloads do.
 */
router.get("/preview/:code", (req, res) => {
  const payload = verifyToken(req.query.token);
  if (!payload) return res.status(401).send("Authentication required.");
  if (!EVENTS[req.params.code]) return res.status(404).send("Unknown event.");
  const { html } = renderEvent(req.params.code, SAMPLE_VARS, { greeting: payload.name });
  res.type("html").send(html);
});

router.use(requireAuth);

/** GET /api/comms/catalog — categories, events and headline stats. */
router.get("/catalog", (req, res) => {
  const events = Object.values(EVENTS);
  const deliveries = collection("deliveries");
  const channelCount = (ch) => events.filter((e) => e.channels.includes(ch)).length;
  const sentOn = (ch) => deliveries.filter((d) => d.channel === ch && d.status === "sent").length;
  res.json({
    categories: CATEGORIES,
    stats: {
      events: events.length,
      categories: CATEGORIES.length,
      mandatory: events.filter((e) => e.mandatory).length,
      delivered: deliveries.length,
      channels: {
        email: { events: channelCount("email"), sent: sentOn("email") },
        inapp: { events: channelCount("inapp"), sent: deliveries.filter((d) => d.channel === "inapp").length },
        sms: { events: channelCount("sms"), sent: sentOn("sms") },
        push: { events: channelCount("push"), sent: sentOn("push") },
      },
    },
  });
});

/** GET /api/comms/deliveries — newest first. */
router.get("/deliveries", (req, res) => {
  const deliveries = [...collection("deliveries")].sort((a, b) => b.createdAt - a.createdAt).slice(0, 40);
  res.json({ deliveries });
});

/** GET /api/comms/notifications — in-app feed + unread count for me. */
router.get("/notifications", (req, res) => {
  const me = collection("users").find((u) => u.id === req.user.sub);
  const readAt = me?.notifsReadAt || 0;
  const notifications = [...collection("notifications")].sort((a, b) => b.createdAt - a.createdAt).slice(0, 30);
  res.json({
    notifications,
    unread: notifications.filter((n) => n.createdAt > readAt).length,
  });
});

/** POST /api/comms/notifications/read — mark my feed as read. */
router.post("/notifications/read", (req, res) => {
  update("users", req.user.sub, { notifsReadAt: Date.now() });
  res.json({ ok: true });
});

/** POST /api/comms/test — admin: fire an event to myself across its channels. */
router.post("/test", requireRole(ROLES.ADMIN), async (req, res) => {
  const code = String(req.body.code || "");
  if (!EVENTS[code]) return res.status(404).json({ error: "Unknown event." });
  const results = await emit(code, {
    email: req.user.email,
    greeting: req.user.name,
    vars: SAMPLE_VARS,
    test: true,
  });
  res.json({ results });
});

export default router;
