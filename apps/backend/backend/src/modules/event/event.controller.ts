// backend/src/api/controllers/event.controller.ts
import type { Request, Response } from "express";
import { EventService } from "./event.service.ts";
import { UploadService } from "../file-management/upload.service.ts";
import { distanceKm } from "../../utils/geo.ts";

export class EventController {
  static async create(req: Request, res: Response) {
    try {
      const body = req.body;
      const event = await EventService.createEvent({
        title: body.title,
        description: body.description,
        placeId: body.placeId,
        categoryId: body.categoryId,
        date: body.date,
        startTime: body.startTime,
        endTime: body.endTime,
        capacity: body.capacity ? Number(body.capacity) : undefined,
        price: body.price ? Number(body.price) : undefined,
      });
      return res.status(201).json(event);
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ message: err.message || "Failed to create event" });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const data = req.body;
      const updated = await EventService.updateEvent(id, {
        title: data.title,
        description: data.description,
        placeId: data.placeId,
        categoryId: data.categoryId,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        capacity: data.capacity ? Number(data.capacity) : undefined,
        price: data.price ? Number(data.price) : undefined,
      });
      return res.json(updated);
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ message: err.message || "Failed to update event" });
    }
  }

  static async remove(req: Request, res: Response) {
    try {
      const id = req.params.id;
      await EventService.deleteEvent(id);
      return res.json({ message: "Event deleted" });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ message: err.message || "Failed to delete event" });
    }
  }

  static async getOne(req: Request, res: Response) {
    try {
      const id = req.params.id;
      // increment view count
      EventService.incrementViewCount(id).catch(() => {});
      const event = await EventService.getEventById(id);
      if (!event) return res.status(404).json({ message: "Event not found" });
      return res.json(event);
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ message: "Failed to get event" });
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const page = Number(req.query.page || 1);
      const perPage = Number(req.query.perPage || 20);
      const q = req.query.q as string | undefined;
      const categoryId = req.query.categoryId as string | undefined;
      const dateFrom = req.query.dateFrom as string | undefined;
      const dateTo = req.query.dateTo as string | undefined;
      const priceMin = req.query.priceMin ? Number(req.query.priceMin) : undefined;
      const priceMax = req.query.priceMax ? Number(req.query.priceMax) : undefined;
      const minRating = req.query.minRating ? Number(req.query.minRating) : undefined;
      const sort = (req.query.sort as any) || "newest";

      const result = await EventService.listEvents({
        page,
        perPage,
        q,
        categoryId,
        dateFrom,
        dateTo,
        priceMin,
        priceMax,
        minRating,
        sort,
      });
      return res.json(result);
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ message: "Failed to list events" });
    }
  }

  static async nearby(req: Request, res: Response) {
    try {
      const lat = Number(req.query.lat);
      const lng = Number(req.query.lng);
      const radius = Number(req.query.radius || 10);
      if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ message: "lat and lng required" });

      const candidates = await EventService.findNearby(lat, lng, radius, 200);

      // compute distance using place coordinates if present
      const enriched = candidates
        .map((e) => {
          const place = (e as any).place;
          if (!place) return { event: e, distance_km: Infinity };
          const d = distanceKm(lat, lng, place.latitude, place.longitude);
          return { event: e, distance_km: d };
        })
        .filter((p) => p.distance_km <= radius)
        .sort((a, b) => a.distance_km - b.distance_km);

      return res.json({ data: enriched.slice(0, 100).map((x) => ({ ...x.event, distance_km: x.distance_km })), total: enriched.length });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ message: "Failed to fetch nearby events" });
    }
  }

  static async uploadImages(req: Request, res: Response) {
    try {
      const eventId = req.params.id;
      const files = req.files as Express.Multer.File[] | undefined;
      if (!files || files.length === 0) return res.status(400).json({ message: "Files required" });

      const results = [];
      for (const file of files) {
        const url = await UploadService.handle(file);
        const media = await EventService.addImage(eventId, url, file.mimetype.startsWith("video") ? "VIDEO" : "IMAGE", req.body.caption);
        results.push(media);
      }

      return res.status(201).json({ data: results });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ message: err.message || "Failed to upload images" });
    }
  }
}
