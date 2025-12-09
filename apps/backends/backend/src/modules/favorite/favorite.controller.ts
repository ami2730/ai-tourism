// backend/src/modules/favorite/favorite.controller.ts
import type { Response } from "express";
import { FavoriteService } from "./favorite.service.ts";
import type { AuthRequest } from "../../middleware/auth.ts";
import { RecommendationItemType } from "@prisma/client";

export class FavoriteController {
  static async add(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id;
      const { itemId, itemType } = req.body;

      const data = await FavoriteService.add(userId, itemId, itemType);
      res.status(201).json(data);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }

  static async remove(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id;
      const { itemId, itemType } = req.body;

      const data = await FavoriteService.remove(userId, itemId, itemType);
      res.json(data);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }

  static async list(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id;
      const data = await FavoriteService.list(userId);
      res.json(data);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }

  static async check(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id;
      const { itemId, itemType } = req.query;

      const data = await FavoriteService.isFavorited(
        userId,
        String(itemId),
        String(itemType) as RecommendationItemType
      );

      res.json(data);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }
}
