// backend/src/modules/blog/blog.controller.ts
import type { Request, Response } from "express";
import { BlogService } from "./blog.service.ts";
import { validationResult } from "express-validator";
import { UploadService } from "../../modules/file-management/upload.service.ts";

export class BlogController {
  static async create(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const user = (req as any).user;
      const { title, body: content, category, tags } = req.body;
      const post = await BlogService.createPost({
        authorId: user.sub,
        title,
        body: content,
        category,
        tags: Array.isArray(tags) ? tags : (typeof tags === "string" && tags.length ? tags.split(",").map((t:string)=>t.trim()) : [])
      });
      return res.status(201).json(post);
    } catch (err: any) {
      console.error("BlogController.create error:", err);
      return res.status(500).json({ message: err.message || "Create post failed" });
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const q = req.query.q as string | undefined;
      const page = Number(req.query.page || 1);
      const limit = Math.min(Number(req.query.limit || 20), 100);
      const posts = await BlogService.listPosts({ q, page, limit });
      return res.json(posts);
    } catch (err: any) {
      console.error("BlogController.list error:", err);
      return res.status(500).json({ message: "Failed to list posts" });
    }
  }

  static async getOne(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const post = await BlogService.getPostById(id);
      if (!post) return res.status(404).json({ message: "Post not found" });
      return res.json(post);
    } catch (err: any) {
      console.error("BlogController.getOne error:", err);
      return res.status(500).json({ message: "Failed to fetch post" });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const id = req.params.id;
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const post = await BlogService.updatePost({ id, userId: user.sub, data: req.body });
      if (!post) return res.status(403).json({ message: "Forbidden or not found" });
      return res.json(post);
    } catch (err: any) {
      console.error("BlogController.update error:", err);
      return res.status(500).json({ message: "Update failed" });
    }
  }

  static async remove(req: Request, res: Response) {
    try {
      const id = req.params.id;
      await BlogService.deletePost(id);
      return res.json({ message: "Deleted" });
    } catch (err: any) {
      console.error("BlogController.remove error:", err);
      return res.status(500).json({ message: "Delete failed" });
    }
  }

  // POST /api/blog/:id/media
  static async uploadMedia(req: Request, res: Response) {
    try {
      const postId = req.params.id;
  
      if (!req.file) {
        return res.status(400).json({ message: "File required" });
      }
  
      // 🚀 Upload via your file management pipeline
      const url = await UploadService.handle(req.file);
  
      // Detect type automatically
      const isVideo = req.file.mimetype.startsWith("video");
  
      // Save media in DB
      const media = await BlogService.addMediaToPost({
        postId,
        url,
        type: isVideo ? "VIDEO" : "IMAGE",
      });
  
      return res.status(201).json(media);
    } catch (err: any) {
      console.error("BlogController.uploadMedia error:", err);
      return res.status(500).json({ message: err.message || "Upload failed" });
    }
  }
}
