// src/modules/auth/auth.controller.ts
import type { Request, Response } from "express";
import { AuthService } from "./auth.service.ts";


function setRefreshCookie(res: Response, refreshToken: string) {
  const cookieOptions: any = {
    httpOnly: true,
    sameSite: (process.env.COOKIE_SAMESITE as any) || "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000, 
  };
  // cookie domain optional
  if (process.env.COOKIE_DOMAIN)
    cookieOptions.domain = process.env.COOKIE_DOMAIN;
  res.cookie("refreshToken", refreshToken, cookieOptions);
}





export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name , role } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const user = await AuthService.register(email, password, name , role);
    // create session + tokens
    const { tokenId, refreshId } = await AuthService.createSession({
      userId: user.id,
      device: req.headers["user-agent"] as string,
      ip: req.ip,
    });
    const tokens = await AuthService.issueTokens(user, refreshId, refreshId); // tokenId and refreshId use same id here

    setRefreshCookie(res, tokens.refreshToken);

    return res.status(201).json({
      user: { id: user.id, email: user.email, role: user.role },
      accessToken: tokens.accessToken,
    });
  } catch (err: any) {
    return res
      .status(400)
      .json({ message: err.message || "Registration failed" });
  }
};





export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await AuthService.verifyCredentials(email, password);
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    // create DB refresh token row
    const { refreshId } = await AuthService.createSession({
      userId: user.id,
      device: req.headers["user-agent"] as string,
      ip: req.ip,
    });

    const tokens = await AuthService.issueTokens(user, refreshId, refreshId);

    setRefreshCookie(res, tokens.refreshToken);

    return res.json({
      user: { id: user.id, email: user.email, role: user.role },
      accessToken: tokens.accessToken,
    });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || "Login failed" });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) return res.status(401).json({ message: "No refresh token" });

    // rotate tokens
    const result = await AuthService.rotateRefreshToken(
      token,
      req.headers["user-agent"] as string,
      req.ip
    );

    // set new cookie
    setRefreshCookie(res, result.refreshToken);

    return res.json({
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
      },
      accessToken: result.accessToken,
    });
  } catch (err: any) {
    return res
      .status(401)
      .json({ message: err.message || "Refresh token invalid" });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) {
      res.clearCookie("refreshToken", { path: "/" });
      return res.status(204).send();
    }
    // decode to get tokenId
    const { verifyRefreshToken } = await import("../../utils/jwt.ts");
    try {
      const payload = verifyRefreshToken(token) as any;
      const tokenId = payload.tokenId;
      // revoke in DB
      await AuthService.revokeRefreshTokenById(tokenId);
    } catch (e) {
      // ignore verification errors
    }

    res.clearCookie("refreshToken", { path: "/" });
    return res.status(204).send();
  } catch (err: any) {
    return res.status(500).json({ message: "Logout failed" });
  }
};



// revoke all tokens for user
export const revokeAll = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.sub || req.body.userId;
    if (!userId) return res.status(400).json({ message: "userId required" });
    await AuthService.revokeAllForUser(userId);
    res.clearCookie("refreshToken", { path: "/" });
    return res.status(200).json({ message: "All sessions revoked" });
  } catch (err: any) {
    return res.status(500).json({ message: "Failed to revoke sessions" });
  }
};
