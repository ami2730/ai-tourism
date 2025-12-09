// backend/src/modules/blog/moderation.controller.ts
import type { Request, Response } from "express";
import { BlogService } from "./blog.service.ts";

export class ModerationController {
  // POST /api/blog/:id/moderate
  // body: { action: 'APPROVE'|'REJECT'|'HIDE', reason?: string }
  static async moderate(req: Request, res: Response) {
    try {
      const admin = (req as any).user;
      const postId = req.params.id;
      const { action, reason } = req.body;
      if (!["APPROVE", "REJECT", "HIDE"].includes(action)) return res.status(400).json({ message: "invalid action" });

      const result = await BlogService.moderatePost({ adminId: admin.sub, postId, action, reason });
      return res.json(result);
    } catch (err: any) {
      console.error("ModerationController.moderate error:", err);
      return res.status(500).json({ message: "Moderation failed" });
    }
  }
}
