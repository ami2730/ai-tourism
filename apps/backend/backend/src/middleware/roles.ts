import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./auth.ts";

export const permit = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (!allowedRoles.includes(user.role))
      return res.status(403).json({ message: "Forbidden" });
    next();
  };
};


