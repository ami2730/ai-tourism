// backend/src/modules/chat/chat.controller.ts
import type{ Request, Response } from "express";
import { ChatService } from "./chat.service.ts";

export class ChatController {
  // POST /api/chat/message
  // body: { sessionId?: string, message: string, meta?: {} }
  static async message(req: Request, res: Response) {
    try {
      const user = (req as any).user; // may be undefined for anonymous
      const userId = user?.sub || null;
      const { sessionId, message, meta } = req.body;
      if (!message || typeof message !== "string") {
        return res.status(400).json({ message: "message is required" });
      }

      const result = await ChatService.handleMessage({
        sessionId,
        userId,
        message,
        meta,
      });

      return res.json(result);
    } catch (err: any) {
      console.error("ChatController.message error:", err);
      return res.status(500).json({ message: err.message || "Chat error" });
    }
  }

  // POST /api/chat/session
  // body: { title?: string }
  static async createSession(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const userId = user?.sub || null;
      const { title } = req.body;
      const session = await ChatService.createSession({ userId, title });
      return res.status(201).json(session);
    } catch (err: any) {
      console.error("ChatController.createSession error:", err);
      return res.status(500).json({ message: err.message || "Failed to create session" });
    }
  }

  // GET /api/chat/session/:id
  static async getSession(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const session = await ChatService.getSession(id);
      if (!session) return res.status(404).json({ message: "session not found" });
      return res.json(session);
    } catch (err: any) {
      console.error("ChatController.getSession error:", err);
      return res.status(500).json({ message: err.message || "Failed to fetch session" });
    }
  }

  // GET /api/chat/sessions
  static async listSessions(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: "Unauthorized" });
      const sessions = await ChatService.listSessions(user.sub);
      return res.json({ sessions });
    } catch (err: any) {
      console.error("ChatController.listSessions error:", err);
      return res.status(500).json({ message: err.message || "Failed to list sessions" });
    }
  }
}
