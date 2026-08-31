import { Router } from "express";
import { collection } from "../lib/store.js";
import { issueToken, verifyPassword } from "../lib/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { validateLogin } from "../../shared/validation.js";

const router = Router();

/** POST /api/auth/login — employee sign-in. */
router.post("/login", (req, res) => {
  const { ok, errors, data } = validateLogin(req.body);
  if (!ok) return res.status(400).json({ error: errors[0], errors });

  const user = collection("users").find((u) => u.email === data.email);
  if (!user || !verifyPassword(data.password, user.password)) {
    return res.status(401).json({ error: "Invalid email or password." });
  }
  if (user.active === false) {
    return res.status(401).json({ error: "This account has been deactivated. Contact your administrator." });
  }

  res.json({
    token: issueToken(user),
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

/** GET /api/auth/me — current session. */
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
