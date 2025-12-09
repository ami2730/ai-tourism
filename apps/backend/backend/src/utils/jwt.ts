// src/utils/jwt.ts
import jwt from "jsonwebtoken";
import { env } from "../config/env.ts";

export interface AccessTokenPayload {
  sub: string;
  role: string;
  email?: string;
}


export interface RefreshTokenPayload {
  sub:string;
  tokenId:string;
}


export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN || "15m",
    algorithm: "HS256",
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.REFRESH_TOKEN_SECRET, {
    expiresIn: env.REFRESH_TOKEN_EXPIRES_IN || "30d",
    algorithm: "HS256",
  } as jwt.SignOptions);
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.REFRESH_TOKEN_SECRET) as RefreshTokenPayload
}
