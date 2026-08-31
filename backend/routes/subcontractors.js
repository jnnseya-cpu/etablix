import { Router } from "express";
import { collection, insert, update } from "../lib/store.js";
import { requireAuth } from "../middleware/auth.js";
import { validateSubcontractorApplication } from "../../shared/validation.js";
import { APPLICATION_STATUS } from "../../shared/constants.js";

const router = Router();

/** POST /api/subcontractors — public: trade partner prequalification. */
router.post("/", (req, res) => {
  const { ok, errors, data } = validateSubcontractorApplication(req.body);
  if (!ok) return res.status(400).json({ error: errors[0], errors });
  const application = insert("subcontractors", { ...data, status: "submitted" });
  res.status(201).json({ id: application.id, message: "Application received." });
});

/** GET /api/subcontractors — internal: list applications, newest first. */
router.get("/", requireAuth, (req, res) => {
  const applications = [...collection("subcontractors")].sort(
    (a, b) => b.createdAt - a.createdAt
  );
  res.json({ applications });
});

/** PATCH /api/subcontractors/:id — internal: advance an application. */
router.patch("/:id", requireAuth, (req, res) => {
  const { status } = req.body || {};
  if (!APPLICATION_STATUS.includes(status)) {
    return res
      .status(400)
      .json({ error: `Status must be one of: ${APPLICATION_STATUS.join(", ")}` });
  }
  const application = update("subcontractors", req.params.id, { status });
  if (!application) return res.status(404).json({ error: "Application not found." });
  res.json({ application });
});

export default router;
