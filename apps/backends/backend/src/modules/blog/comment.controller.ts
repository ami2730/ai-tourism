// backend/src/modules/blog/comment.controller.ts
import type { Request, Response } from "express";
import { BlogService } from "./blog.service.ts";

export class CommentController {
  static async create(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const postId = req.params.id;
      const { content } = req.body;
      if (!content || typeof content !== "string") return res.status(400).json({ message: "content required" });

      const comment = await BlogService.createComment({ postId, userId: user.sub, content });
      return res.status(201).json(comment);
    } catch (err: any) {
      console.error("CommentController.create error:", err);
      return res.status(500).json({ message: "Failed to add comment" });
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const postId = req.params.id;
      const comments = await BlogService.listComments({ postId });
      return res.json(comments);
    } catch (err: any) {
      console.error("CommentController.list error:", err);
      return res.status(500).json({ message: "Failed to fetch comments" });
    }
  }
}
