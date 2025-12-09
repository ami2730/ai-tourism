// backend/src/api/controllers/place.controller.ts
import type { Request, Response } from "express";
import { PlaceService } from "./place.service.ts";
import { UploadService } from "../file-management/upload.service.ts";
import { distanceKm } from "../../utils/geo.ts";

export class PlaceController {
  static async create(req: Request, res: Response) {
    try {
      const body = req.body;
      // Admin-only route uses permit middleware
      const place = await PlaceService.createPlace({
        name: body.name,
        description: body.description,
        categoryId: body.categoryId,
        latitude: Number(body.latitude),
        longitude: Number(body.longitude),
        address: body.address,
      });
      return res.status(201).json(place);
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ message: err.message || "Failed to create place" });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const placeId = req.params.id;
      const data = req.body;
      const updated = await PlaceService.updatePlace(placeId, {
        name: data.name,
        description: data.description,
        categoryId: data.categoryId,
        latitude: data.latitude ? Number(data.latitude) : undefined,
        longitude: data.longitude ? Number(data.longitude) : undefined,
        address: data.address,
      });
      return res.json(updated);
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ message: err.message || "Failed to update place" });
    }
  }

  static async remove(req: Request, res: Response) {
    try {
      const placeId = req.params.id;
      await PlaceService.deletePlace(placeId);
      return res.json({ message: "Place deleted" });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ message: err.message || "Failed to delete place" });
    }
  }

  static async getOne(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const place = await PlaceService.getPlaceById(id);
      if (!place) return res.status(404).json({ message: "Place not found" });
      return res.json(place);
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ message: "Failed to get place" });
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const page = Number(req.query.page || 1);
      const perPage = Number(req.query.perPage || 20);
      const q = req.query.q as string | undefined;
      const categoryId = req.query.categoryId as string | undefined;
      const sort = (req.query.sort as any) || "newest";

      const result = await PlaceService.listPlaces({ page, perPage, categoryId, q, sort });
      return res.json(result);
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ message: "Failed to list places" });
    }
  }

  static async search(req: Request, res: Response) {
    // alias to list with q param
    return this.list(req, res);
  }

  static async nearby(req: Request, res: Response) {
    try {
      const lat = Number(req.query.lat);
      const lng = Number(req.query.lng);
      const radius = Number(req.query.radius || 10);
      if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ message: "lat and lng required" });

      const candidates = await PlaceService.findNearby(lat, lng, radius, 200);

      // compute distance and filter
      const enriched = candidates
        .map((p) => {
          const d = distanceKm(lat, lng, p.latitude, p.longitude);
          return { ...p, distance_km: d };
        })
        .filter((p) => p.distance_km <= radius)
        .sort((a, b) => a.distance_km - b.distance_km);

      return res.json({ data: enriched.slice(0, 100), total: enriched.length });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ message: "Failed to fetch nearby places" });
    }
  }

  static async uploadImage(req: Request, res: Response) {
    try {
      const placeId = req.params.id;
      const file = req.file;
      if (!file) return res.status(400).json({ message: "File required" });

      const url = await UploadService.handle(file);
      const media = await PlaceService.addImage(placeId, url, file.mimetype.startsWith("video") ? "VIDEO" : "IMAGE", req.body.caption);
      return res.status(201).json(media);
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ message: err.message || "Failed to upload image" });
    }
  }
}
