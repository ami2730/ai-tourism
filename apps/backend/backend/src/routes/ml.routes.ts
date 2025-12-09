// backend/src/api/routes/ml.routes.ts
import type { Request, Response } from "express"
import {Router} from "express"
import { prisma } from "../config/db.ts"; 
import { isAuthenticatedWithApiKey } from "../middleware/mlAuth.ts"; 

const router = Router();

// --- helper: unify place & event into 'items' ---
async function buildItems({ page = 1, pageSize = 100 } : { page?: number, pageSize?: number }) {
  // Note: we fetch pages for places and events then merge client-side
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  const places = await prisma.place.findMany({
    skip,
    take,
    include: { 
      images: true, 
      category: true, 
      tags: { include: { tag: true } } 
    }
  });
  

  const events = await prisma.event.findMany({
    skip,
    take,
    include: { images: true, category: true , place: true}
  });

  const unified = [
    ...places.map(p => ({
      itemId: p.id,
      itemType: "PLACE",
      title: p.name,
      description: p.description || "",
      category: p.category?.key || p.categoryId || null,
      tags: p.tags.map(t => t.tag?.name || "").filter(Boolean).join(","),
      city: (p.address || "").split(",").slice(-1).join("").trim() || null,
      price: 0,
      latitude: p.latitude,
      longitude: p.longitude,
      images: (p.images || []).map(m => m.url),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    })),
    ...events.map(e => ({
      itemId: e.id,
      itemType: "EVENT",
      title: e.title,
      description: e.description || "",
      category: e.category?.key || e.categoryId || null,
      tags: (e.images || []).length ? "" : "", // optional: fill from event tags if you maintain them
      city: e.place ? null : null,
      price: e.price ?? 0,
      images: (e.images || []).map(m => m.url),
      date: e.date,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt
    }))
  ];

  return unified;
}

// GET /ml/items?page=1&pageSize=200
router.get("/items", isAuthenticatedWithApiKey, async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 200);
    // For simplicity we fetch both sources for the same range - in production use separate cursors
    const items = await buildItems({ page, pageSize });
    return res.json({ status: "ok", count: items.length, items });
  } catch (err) {
    console.error("ml/items error", err);
    return res.status(500).json({ status: "error", message: "failed to export items" });
  }
});

// GET /ml/interactions?page=1&pageSize=1000
router.get("/interactions", isAuthenticatedWithApiKey, async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 1000);
    const skip = (page - 1) * pageSize;

    // Pull favorites, bookings, reviews, interactions logs and union them
    // Favorites
    const favs = await prisma.favorite.findMany({
      skip,
      take: pageSize,
    });

    // Bookings (successful/pending)
    const bookings = await prisma.booking.findMany({
      skip,
      take: pageSize,
    });

    // Reviews
    const reviews = await prisma.review.findMany({
      skip,
      take: pageSize,
    });

    // Generic interactions (if you have a separate log table)
    const interactions = await prisma.interaction.findMany({
      skip,
      take: pageSize,
    });

    // Normalize rows
    const rows: Array<any> = [];

    favs.forEach(f => rows.push({
      userId: f.userId,
      itemId: f.itemId,
      interaction: "favorite",
      timestamp: f.createdAt
    }));

    bookings.forEach(b => rows.push({
      userId: b.userId,
      itemId: b.eventId,
      interaction: "book",
      timestamp: b.createdAt
    }));

    reviews.forEach(r => rows.push({
      userId: r.userId,
      itemId: r.placeId || r.eventId,
      interaction: "review",
      timestamp: r.createdAt
    }));

    interactions.forEach(i => rows.push({
      userId: i.userId,
      itemId: i.itemId,
      interaction: i.type?.toLowerCase() || "view",

      timestamp: i.createdAt ?? (
        typeof i.context === "object" && i.context !== null && "timestamp" in i.context
          ? (i.context as any).timestamp
          : new Date()
      )
    }));

    // optionally sort
    rows.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return res.json({ status: "ok", count: rows.length, interactions: rows });
  } catch (err) {
    console.error("ml/interactions error", err);
    return res.status(500).json({ status: "error", message: "failed to export interactions" });
  }
});

// GET /ml/users?page=1&pageSize=1000
router.get("/users", isAuthenticatedWithApiKey, async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 1000);
    const skip = (page - 1) * pageSize;

    const users = await prisma.user.findMany({
      skip,
      take: pageSize,
      include: { profile: true }
    });

    const out = users.map(u => ({
      userId: u.id,
      email: u.email,
      role: u.role,
      country: u.profile?.country || null,
      createdAt: u.createdAt
    }));

    return res.json({ status: "ok", count: out.length, users: out });
  } catch (err) {
    console.error("ml/users error", err);
    return res.status(500).json({ status: "error", message: "failed to export users" });
  }
});

export default router;
