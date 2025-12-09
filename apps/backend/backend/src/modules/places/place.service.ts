// backend/src/api/services/place.service.ts
import {prisma} from "../../config/db.ts";
import { Prisma } from "@prisma/client";

export type PlaceCreateInput = {
  name: string;
  description?: string;
  categoryId?: string;
  latitude: number;
  longitude: number;
  address?: string;
};

export class PlaceService {
  static async createPlace(data: PlaceCreateInput) {
    const place = await prisma.place.create({
      data: {
        name: data.name,
        description: data.description,
        categoryId: data.categoryId,
        latitude: data.latitude,
        longitude: data.longitude,
        address: data.address,
      },
    });
    return place;
  }

  static async updatePlace(placeId: string, data: Partial<PlaceCreateInput>) {
    const update: any = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.description !== undefined) update.description = data.description;
    if (data.categoryId !== undefined) update.categoryId = data.categoryId;
    if (data.latitude !== undefined) update.latitude = data.latitude;
    if (data.longitude !== undefined) update.longitude = data.longitude;
    if (data.address !== undefined) update.address = data.address;

    return prisma.place.update({
      where: { id: placeId },
      data: update,
    });
  }

  static async deletePlace(placeId: string) {
    // delete related media first (if not cascade) — safe approach
    await prisma.media.deleteMany({ where: { placeId } });
    // delete place
    return prisma.place.delete({ where: { id: placeId } });
  }

  static async getPlaceById(id: string) {
    return prisma.place.findUnique({
      where: { id },
      include: {
        images: true,
        reviews: { orderBy: { createdAt: "desc" } },
        category: true,
        events: true,
        tags: { include: { tag: true } },
      },
    });
  }

  static async listPlaces(opts: {
    page?: number;
    perPage?: number;
    categoryId?: string;
    q?: string;
    sort?: "popular" | "rating" | "newest";
  }) {
    const page = Math.max(1, opts.page || 1);
    const perPage = Math.max(1, Math.min(100, opts.perPage || 20));
    const skip = (page - 1) * perPage;
    const where: any = {};

    if (opts.categoryId) where.categoryId = opts.categoryId;
    if (opts.q) {
      where.OR = [
        { name: { contains: opts.q, mode: "insensitive" } },
        { description: { contains: opts.q, mode: "insensitive" } },
        { address: { contains: opts.q, mode: "insensitive" } },
      ];
    }

    // sort
    const orderBy: Prisma.PlaceOrderByWithRelationInput[] = [];
    if (opts.sort === "popular") orderBy.push({ bookingCount: "desc" });
    else if (opts.sort === "rating") orderBy.push({ avgRating: "desc" });
    else orderBy.push({ createdAt: "desc" });

    const [data, total] = await Promise.all([
      prisma.place.findMany({
        where,
        include: { images: true, category: true },
        orderBy,
        skip,
        take: perPage,
      }),
      prisma.place.count({ where }),
    ]);

    return { data, total, page, perPage };
  }

  // find nearby places within radiusKm sorted by distance
  static async findNearby(lat: number, lng: number, radiusKm = 10, limit = 50) {
    // simple bounding box to limit DB scan
    const latDelta = radiusKm / 111.12; // approx degrees per km
    const lngDelta = radiusKm / (111.12 * Math.cos((lat * Math.PI) / 180));
    const minLat = lat - latDelta;
    const maxLat = lat + latDelta;
    const minLng = lng - lngDelta;
    const maxLng = lng + lngDelta;

    const candidates = await prisma.place.findMany({
      where: {
        latitude: { gte: minLat, lte: maxLat },
        longitude: { gte: minLng, lte: maxLng },
      },
      include: { images: true, category: true },
      take: limit,
    });

    // compute actual distance using Haversine (use helper in controller)
    return candidates;
  }

  static async addImage(placeId: string, url: string, type: string = "IMAGE", caption?: string) {
    return prisma.media.create({
      data: {
        url,
        type: type as "IMAGE" | "VIDEO",
        caption,
        placeId,
      },
    });
  }

  // Add a tag mapping
  static async addTag(placeId: string, tagName: string) {
    // ensure tag exists
    const tag = await prisma.tag.upsert({
      where: { name: tagName },
      update: {},
      create: { name: tagName },
    });

    return prisma.placeTag.upsert({
      where: {
        placeId_tagId: {
          placeId,
          tagId: tag.id,
        },
      } as any,
      update: {},
      create: {
        placeId,
        tagId: tag.id,
      },
    });
  }
}
