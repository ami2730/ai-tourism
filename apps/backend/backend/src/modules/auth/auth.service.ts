// src/modules/auth/auth.service.ts
import {prisma} from "../../config/db.ts";
import { Role } from "@prisma/client";
import { hashPassword, comparePassword } from "../../utils/password.ts";
import { signAccessToken, signRefreshToken } from "../../utils/jwt.ts";
import crypto from "crypto";

type CreateSessionOptions = {
  userId: string;
  device?: string;
  ip?: string;
};

export class AuthService {
  static async register(email: string, password: string, name?: string , role?: string) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new Error("Email already in use");

    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        role: (role as Role) || Role.TOURIST,
        password: hashed,
        profile: { create: { name: name || "" } },
      },
    });

    return user;
  }

  static async verifyCredentials(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    const ok = await comparePassword(password, user.password);
    if (!ok) return null;
    return user;
  }

  // create refresh token DB record and return signed token and record id
  static async createSession({ userId, device, ip }: CreateSessionOptions) {
    // create a random tokenId that identifies the refresh DB row
    const tokenId = crypto.randomBytes(32).toString("hex");

    // create DB refresh row with placeholder hash; we'll hash the actual JWT before saving
    const rt = await prisma.refreshToken.create({
      data: {
        userId,
        device: device || null,
        ip: ip || null,
        tokenHash: "", // temporary empty hash, will be updated later
        revoked: false, // explicitly set to false
      },
    });
    return { tokenId, refreshId: rt.id };
  }

  static async issueTokens(user: any, refreshId: string, tokenId: string) {
    const accessToken = signAccessToken({
      sub: user.id,
      role: user.role,
      email: user.email,
    });
    const refreshJwt = signRefreshToken({ sub: user.id, tokenId });

    // hash refreshJwt before storing
    const hashed = await hashPassword(refreshJwt);

    // update DB row with hashed token
    await prisma.refreshToken.update({
      where: { id: refreshId },
      data: { tokenHash: hashed },
    });

    return { accessToken, refreshToken: refreshJwt };
  }

  // Rotate refresh token: verify provided refresh token, mark old token revoked and create new one
  static async rotateRefreshToken(
    existingRefreshToken: string,
    device?: string,
    ip?: string
  ) {
    // verify and get token payload
    const { verifyRefreshToken } = await import("../../utils/jwt");
    let payload;
    try {
      payload = verifyRefreshToken(existingRefreshToken);
    } catch (err) {
      throw new Error("Invalid refresh token");
    }

    const { tokenId, sub } = payload as any;

    // find DB refresh row
    const existing = await prisma.refreshToken.findFirst({
      where: { id: tokenId, userId: sub },
    });
    if (!existing || existing.revoked)
      throw new Error("Refresh token invalid or revoked");

    // compare hash
    const isMatch = await comparePassword(
      existingRefreshToken,
      existing.tokenHash || ""
    );
    if (!isMatch) {
      // possible theft — revoke the row
      await prisma.refreshToken.update({
        where: { id: existing.id },
        data: { revoked: true },
      });
      throw new Error("Refresh token mismatch");
    }

    // create new DB refresh row and revoke old
    const newTokenData: any = {
      userId: sub,
      device: device || null,
      ip: ip || null,
      replacedById: existing.id,
      tokenHash: "temporary-placeholder",
      revoked: false,
    };

    const now = new Date();
    newTokenData.createdAt = now;
    newTokenData.updatedAt = now;

    const newTokenRow = await prisma.refreshToken.create({
      data: newTokenData,
    });

    await prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revoked: true, replacedById: newTokenRow.id },
    });

    // issue new tokens
    const user = await prisma.user.findUnique({ where: { id: sub } });
    if (!user) throw new Error("User not found");

    const newTokenId = newTokenRow.id;
    const accessToken = signAccessToken({
      sub: user.id,
      role: user.role,
      email: user.email,
    });
    const refreshJwt = signRefreshToken({ sub: user.id, tokenId: newTokenId });

    const hashed = await hashPassword(refreshJwt);
    await prisma.refreshToken.update({
      where: { id: newTokenRow.id },
      data: { tokenHash: hashed },
    });

    return { accessToken, refreshToken: refreshJwt, user };
  }

  static async revokeRefreshTokenById(id: string) {
    return prisma.refreshToken.update({
      where: { id },
      data: { revoked: true },
    });
  }

  static async revokeAllForUser(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId },
      data: { revoked: true },
    });
  }
}
