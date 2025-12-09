// src/modules/review/review.controller.ts
import type { Request, Response } from "express";
import { ReviewService } from "./review.service.ts";

export class ReviewController {
  // POST /api/reviews
  static async create(req: Request, res: Response) {
    try {
      const authUser = (req as any).user;
      if (!authUser) return res.status(401).json({ message: "Unauthorized" });

      const { itemType, itemId, rating, comment } = req.body;
      if (!itemType || !itemId || rating == null) return res.status(400).json({ message: "itemType, itemId and rating are required" });

      const review = await ReviewService.createReview({
        userId: authUser.sub,
        itemType,
        itemId,
        rating: Number(rating),
        comment
      });

      return res.status(201).json(review);
    } catch (err: any) {
      console.error("Review create error:", err);
      return res.status(400).json({ message: err.message || "Failed to create review" });
    }
  }

  // GET /api/reviews?itemType=&itemId=&page=&limit=&sort=
  static async list(req: Request, res: Response) {
    try {
      const { itemType, itemId, page = "1", limit = "20", sort = "new" } = req.query as any;
      if (!itemType || !itemId) return res.status(400).json({ message: "itemType and itemId required" });

      const data = await ReviewService.listReviews({
        itemType,
        itemId,
        page: Number(page),
        limit: Number(limit),
        sort
      });

      return res.json(data);
    } catch (err: any) {
      console.error("Review list error:", err);
      return res.status(500).json({ message: "Failed to list reviews" });
    }
  }

  // GET /api/reviews/:id
  static async getOne(req: Request, res: Response) {
    try {
      const review = await ReviewService.getReview(req.params.id);
      if (!review) return res.status(404).json({ message: "Not found" });
      return res.json(review);
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ message: "Failed to fetch review" });
    }
  }

  // PUT /api/reviews/:id
  static async update(req: Request, res: Response) {
    try {
      const authUser = (req as any).user;
      if (!authUser) return res.status(401).json({ message: "Unauthorized" });

      const { rating, comment } = req.body;
      const updated = await ReviewService.updateReview(authUser.sub, req.params.id, { rating, comment });
      return res.json(updated);
    } catch (err: any) {
      console.error("Review update error:", err);
      return res.status(400).json({ message: err.message || "Failed to update" });
    }
  }

  // DELETE /api/reviews/:id
  static async delete(req: Request, res: Response) {
    try {
      const authUser = (req as any).user;
      if (!authUser) return res.status(401).json({ message: "Unauthorized" });

      const isAdmin = authUser.role === "ADMIN";
      await ReviewService.deleteReview(authUser.sub, req.params.id, isAdmin);
      return res.json({ message: "Deleted" });
    } catch (err: any) {
      console.error("Review delete error:", err);
      return res.status(400).json({ message: err.message || "Failed to delete" });
    }
  }

  // POST /api/admin/reviews/:id/moderate  (admin only)
  static async moderate(req: Request, res: Response) {
    try {
      const authUser = (req as any).user;
      if (!authUser || authUser.role !== "ADMIN") return res.status(403).json({ message: "Forbidden" });

      const action = req.body.action as "APPROVE" | "REJECT" | "HIDE";
      const reason = req.body.reason as string | undefined;
      if (!action) return res.status(400).json({ message: "action required" });

      const updated = await ReviewService.moderateReview(authUser.sub, req.params.id, action, reason);
      return res.json(updated);
    } catch (err: any) {
      console.error("Moderation error:", err);
      return res.status(400).json({ message: err.message || "Failed to moderate" });
    }
  }
}
