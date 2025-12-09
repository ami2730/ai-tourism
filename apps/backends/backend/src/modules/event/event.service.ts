// backend/src/api/services/event.service.ts
import {prisma} from "../../config/db.ts";
import { Prisma } from "@prisma/client";

export type EventCreateInput = {
  title: string;
  description?: string;
  placeId?: string;
  categoryId?: string;
  date: string; // ISO
  startTime?: string; // ISO
  endTime?: string; // ISO
  capacity?: number;
  price?: number;
};

export class EventService {
  static async createEvent(data: EventCreateInput) {
    const event = await prisma.event.create({
      data: {
        title: data.title,
        description: data.description,
        placeId: data.placeId,
        categoryId: data.categoryId,
        date: new Date(data.date),
        startTime: data.startTime ? new Date(data.startTime) : undefined,
        endTime: data.endTime ? new Date(data.endTime) : undefined,
        capacity: data.capacity ?? null,
        price: data.price ?? 0,
      },
    });
    return event;
  }

  static async updateEvent(eventId: string, data: Partial<EventCreateInput>) {
    const update: any = {};
    if (data.title !== undefined) update.title = data.title;
    if (data.description !== undefined) update.description = data.description;
    if (data.placeId !== undefined) update.placeId = data.placeId;
    if (data.categoryId !== undefined) update.categoryId = data.categoryId;
    if (data.date !== undefined) update.date = new Date(data.date);
    if (data.startTime !== undefined) update.startTime = new Date(data.startTime);
    if (data.endTime !== undefined) update.endTime = new Date(data.endTime);
    if (data.capacity !== undefined) update.capacity = data.capacity;
    if (data.price !== undefined) update.price = data.price;

    return prisma.event.update({
      where: { id: eventId },
      data: update,
    });
  }

  static async deleteEvent(eventId: string) {
    // delete related media first (safe)
    await prisma.media.deleteMany({ where: { eventId } });
    // delete bookings & tickets if you want — careful with history
    await prisma.booking.deleteMany({ where: { eventId } });
    await prisma.ticket.deleteMany({ where: { eventId } });
    return prisma.event.delete({ where: { id: eventId } });
  }

  static async getEventById(id: string) {
    return prisma.event.findUnique({
      where: { id },
      include: {
        images: true,
        reviews: { orderBy: { createdAt: "desc" } },
        place: true,
        category: true,
      },
    });
  }

  static async listEvents(opts: {
    page?: number;
    perPage?: number;
    q?: string;
    categoryId?: string;
    dateFrom?: string; // ISO
    dateTo?: string; // ISO
    priceMin?: number;
    priceMax?: number;
    minRating?: number;
    sort?: "trending" | "price_asc" | "price_desc" | "rating" | "newest";
  }) {
    const page = Math.max(1, opts.page || 1);
    const perPage = Math.max(1, Math.min(100, opts.perPage || 20));
    const skip = (page - 1) * perPage;
    const where: any = {};

    if (opts.categoryId) where.categoryId = opts.categoryId;
    if (opts.q) {
      where.OR = [
        { title: { contains: opts.q, mode: "insensitive" } },
        { description: { contains: opts.q, mode: "insensitive" } },
      ];
    }
    if (opts.dateFrom || opts.dateTo) {
      where.date = {};
      if (opts.dateFrom) where.date.gte = new Date(opts.dateFrom);
      if (opts.dateTo) where.date.lte = new Date(opts.dateTo);
    }
    if (opts.priceMin !== undefined || opts.priceMax !== undefined) {
      where.price = {};
      if (opts.priceMin !== undefined) where.price.gte = opts.priceMin;
      if (opts.priceMax !== undefined) where.price.lte = opts.priceMax;
    }
    if (opts.minRating !== undefined) {
      where.avgRating = { gte: opts.minRating };
    }

    // orderBy rules
    const orderBy: Prisma.EventOrderByWithRelationInput[] = [];
    if (opts.sort === "trending") {
      // trending: combination of bookingCount and viewCount (desc)
      orderBy.push({ bookingCount: "desc" }, { viewCount: "desc" });
    } else if (opts.sort === "price_asc") orderBy.push({ price: "asc" });
    else if (opts.sort === "price_desc") orderBy.push({ price: "desc" });
    else if (opts.sort === "rating") orderBy.push({ avgRating: "desc" });
    else orderBy.push({ date: "asc" }); // upcoming first

    const [data, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: { images: true, place: true, category: true },
        orderBy,
        skip,
        take: perPage,
      }),
      prisma.event.count({ where }),
    ]);

    return { data, total, page, perPage };
  }

  static async findNearby(lat: number, lng: number, radiusKm = 10, limit = 100) {
    // approximate bounding box
    const latDelta = radiusKm / 111.12;
    const lngDelta = radiusKm / (111.12 * Math.cos((lat * Math.PI) / 180));
    const minLat = lat - latDelta;
    const maxLat = lat + latDelta;
    const minLng = lng - lngDelta;
    const maxLng = lng + lngDelta;

    // we search events tied to places within bounding box OR events with their own lat/lng (if you store per-event coords)
    // This assumes events are tied to place coordinates. We'll join via place relation.
    const candidates = await prisma.event.findMany({
      where: {
        OR: [
          {
            place: {
              latitude: { gte: minLat, lte: maxLat },
              longitude: { gte: minLng, lte: maxLng },
            },
          },
          {
            // If event itself stores lat/lng (schema contains only place lat/lng, but if you use event lat/lng uncomment)
            // latitude: { gte: minLat, lte: maxLat },
            // longitude: { gte: minLng, lte: maxLng },
          },
        ],
      },
      include: { images: true, place: true, category: true },
      take: limit,
    });

    return candidates;
  }

  static async addImage(eventId: string, url: string, type: string = "IMAGE", caption?: string) {
    return prisma.media.create({
      data: {
        url,
        type: type as "IMAGE" | "VIDEO",
        caption,
        eventId,
      },
    });
  }

  // helpers to increment counters (used by controller or other modules)
  static async incrementViewCount(eventId: string) {
    return prisma.event.update({
      where: { id: eventId },
      data: { viewCount: { increment: 1 } },
    });
  }

  static async incrementBookingCount(eventId: string, by = 1) {
    return prisma.event.update({
      where: { id: eventId },
      data: { bookingCount: { increment: by } },
    });
  }
}
