import type { Request, Response } from "express";
import { prisma } from "../../config/db.ts";

export class RecommendationController {
  static async global(req: Request, res: Response) {
    try {
      const popularEvents = await prisma.event.findMany({
        include: { 
          reviews: { where: { status: "APPROVED" } }
        },
        orderBy: [
          { bookingCount: "desc" },
          { viewCount: "desc" }
        ],
        take: 10,
      });

      const popularPlaces = await prisma.place.findMany({
        include: { 
          reviews: { where: { status: "APPROVED" } }
        },
        orderBy: [
          { bookingCount: "desc" },
          { viewCount: "desc" }
        ],
        take: 10,
      });

      const trendingEvents = await prisma.event.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          }
        },
        orderBy: { viewCount: "desc" },
        take: 10,
      });

      return res.json({
        message: "Global recommendations",
        popularEvents,
        popularPlaces,
        trendingEvents
      });
    } catch (err: any) {
      console.error("Global recommendation error:", err);
      return res.status(500).json({ message: "Failed to get global recommendations" });
    }
  }
}
