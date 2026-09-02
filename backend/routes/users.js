/**
 * Employee account management — admin only. There is deliberately no
 * public sign-up: an administrator creates each employee account, hands
 * over the initial password, and can change roles or deactivate access
 * at any time. Deactivated accounts cannot sign in.
 */

import { Router } from "express";
import { collection, insert, update } from "../lib/store.js";
import { hashPassword } from "../lib/auth.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ROLES } from "../../shared/constants.js";
import { POSITIONS } from "../lib/organisation.js";

const router = Router();
router.use(requireAuth, requireRole(ROLES.ADMIN));

const VALID_ROLES = Object.values(ROLES);

const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  position: u.position || "",
  active: u.active !== false,
  createdAt: u.createdAt || null,
});

/** GET /api/users — list all employee accounts. */
router.get("/", (req, res) => {
  res.json({ users: collection("users").map(publicUser), roles: VALID_ROLES, positions: POSITIONS });
});

/** POST /api/users — create an employee account. */
router.post("/", (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const role = String(req.body.role || "").trim();
  const password = String(req.body.password || "");

  if (name.length < 2) return res.status(400).json({ error: "Enter the employee's full name." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Enter a valid work email address." });
  if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: "Choose a valid role." });
  if (password.length < 10) return res.status(400).json({ error: "Initial password must be at least 10 characters." });
  if (collection("users").some((u) => u.email === email)) {
    return res.status(409).json({ error: "An account with that email already exists." });
  }

  const position = String(req.body.position || "").trim().slice(0, 120);
  const user = insert("users", { name, email, role, position, active: true, password: hashPassword(password) });
  res.status(201).json({ user: publicUser(user) });
});

/** PATCH /api/users/:id — change role, reset password, or (de)activate. */
router.patch("/:id", (req, res) => {
  const target = collection("users").find((u) => u.id === req.params.id);
  if (!target) return res.status(404).json({ error: "Account not found." });

  const patch = {};

  if (req.body.role !== undefined) {
    if (!VALID_ROLES.includes(req.body.role)) return res.status(400).json({ error: "Choose a valid role." });
    patch.role = req.body.role;
  }
  if (req.body.password !== undefined) {
    if (String(req.body.password).length < 10) return res.status(400).json({ error: "New password must be at least 10 characters." });
    patch.password = hashPassword(String(req.body.password));
  }
  if (req.body.active !== undefined) {
    patch.active = Boolean(req.body.active);
  }
  if (req.body.position !== undefined) {
    patch.position = String(req.body.position).trim().slice(0, 120);
  }

  // Guardrails: never lock the business out of its own system.
  if (target.id === req.user.sub && (patch.active === false || (patch.role && patch.role !== ROLES.ADMIN))) {
    return res.status(400).json({ error: "You cannot deactivate or demote your own account." });
  }
  const isLastAdmin =
    target.role === ROLES.ADMIN &&
    collection("users").filter((u) => u.role === ROLES.ADMIN && u.active !== false).length === 1;
  if (isLastAdmin && (patch.active === false || (patch.role && patch.role !== ROLES.ADMIN))) {
    return res.status(400).json({ error: "At least one active administrator must remain." });
  }

  const user = update("users", target.id, patch);
  res.json({ user: publicUser(user) });
});

export default router;
