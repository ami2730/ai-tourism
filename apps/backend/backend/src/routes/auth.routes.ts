// src/routes/auth.routes.ts
import { Router } from "express";
import {
  register,
  login,
  refresh,
  logout,
  revokeAll,
} from "../modules/auth/auth.controller.ts";
import { auth as authMiddleware } from "../middleware/auth.ts"; // ensures req.user exists for revokeAll

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);

// revoke all sessions for current user
router.post("/revoke-all", authMiddleware, revokeAll);

export default router;
