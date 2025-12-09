// backend/src/api/controllers/category.controller.ts
import type { Request, Response } from "express";
import { CategoryService } from "./category.service.ts";

export class CategoryController {
  static async create(req: Request, res: Response) {
    try {
      const { key, name } = req.body;
      const category = await CategoryService.create({ key, name });
      return res.status(201).json(category);
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ message: err.message || "Failed to create category" });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const updated = await CategoryService.update(id, req.body);
      return res.json(updated);
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ message: err.message || "Failed to update category" });
    }
  }

  static async remove(req: Request, res: Response) {
    try {
      const id = req.params.id;
      await CategoryService.delete(id);
      return res.json({ message: "Category deleted" });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ message: err.message || "Failed to delete category" });
    }
  }

  static async getOne(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const category = await CategoryService.getOne(id);
      if (!category) return res.status(404).json({ message: "Category not found" });
      return res.json(category);
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ message: "Failed to fetch category" });
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const categories = await CategoryService.list();
      return res.json(categories);
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ message: "Failed to list categories" });
    }
  }

  static async attachPlace(req: Request, res: Response) {
    try {
      const { placeId, categoryId } = req.body;
      const place = await CategoryService.attachPlace(placeId, categoryId);
      return res.json(place);
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ message: err.message || "Failed to attach place" });
    }
  }
}
