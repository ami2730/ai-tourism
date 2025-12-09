
import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env.ts"; // adjust path

/**
 * Accept either:
 * - `x-api-key: <ML_SECRET>`
 * - `Authorization: Bearer <ML_SECRET>`
 */
export function isAuthenticatedWithApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.header("x-api-key");
  const auth = req.header("authorization") || req.header("Authorization");

  // Prefer x-api-key if present
  const tokenFromApiKey = apiKey?.trim();

  // Support Bearer token as a fallback
  let tokenFromAuth: string | undefined;
  if (auth) {
    const parts = String(auth).split(" ");
    if (parts.length === 2) {
      tokenFromAuth = parts[1];
    }
  }

  const token = tokenFromApiKey || tokenFromAuth;

  if (!token) {
    return res.status(401).json({ error: "missing authorization" });
  }

  if (!env.ML_SECRET || token !== env.ML_SECRET) {
    return res.status(401).json({ error: "invalid api key" });
  }

  next();
}
