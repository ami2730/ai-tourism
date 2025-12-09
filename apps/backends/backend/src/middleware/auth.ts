import type { Request , Response ,NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt.ts";

export interface AuthRequest extends Request {
  user?:any;
}

export const auth = (req : AuthRequest , res:Response , next: NextFunction) => {

  const header = req.headers.authorization;
  if(!header || !header.startsWith("Bearer ")){
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = header.split(" ")[1];

  try {
    const payload = verifyAccessToken(token)
    req.user = {sub : payload.sub , role: payload.role , email : payload.role}
    next()
  } catch (error) {
    return res.status(401).json({message : "Invalid or expired access token "})
    
  }
}