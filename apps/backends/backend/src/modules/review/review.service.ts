// src/modules/review/review.service.ts
import { prisma } from "../../config/db.ts";
import { Prisma, ReviewStatus } from "@prisma/client";


type ItemType = "PLACE" | "EVENT";

export class ReviewService {
  // create review
  static async createReview(params: {
    userId: string;
    itemType: ItemType;
    itemId: string;
    rating: number;
    comment?: string;
  }) {
    const { userId, itemType, itemId, rating, comment } = params;

    // basic validation (1..5 rating)
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new Error("Rating must be an integer between 1 and 5");
    }

    // ensure item exists
    if (itemType === "EVENT") {
      const event = await prisma.event.findUnique({ where: { id: itemId } });
      if (!event) throw new Error("Event not found");

      // enforce user had a confirmed booking for this event
      const booking = await prisma.booking.findFirst({
        where: {
          eventId: itemId,
          userId,
          status: "CONFIRMED"
        }
      });
      if (!booking) {
        throw new Error("You must have a confirmed booking for this event to leave a review");
      }
    } else {
      // PLACE
      const place = await prisma.place.findUnique({ where: { id: itemId } });
      if (!place) throw new Error("Place not found");
    }

    // anti-abuse: simple duplicate text guard and rate limit per (user+item)
    const recent = await prisma.review.findFirst({
      where: {
        userId,
        OR: [
          { placeId: itemType === "PLACE" ? itemId : undefined },
          { eventId: itemType === "EVENT" ? itemId : undefined }
        ].filter(Boolean) as any
      },
      orderBy: { createdAt: "desc" }
    });

    if (recent && recent.comment && comment && recent.comment.trim() === comment.trim()) {
      throw new Error("Duplicate review content detected");
    }

    // decide initial status (simple heuristic: short comments may be PENDING)
    let status: ReviewStatus = "APPROVED";
    if (!comment || comment.trim().length < 10) status = "PENDING";

    // create review
    const review = await prisma.review.create({
      data: {
        rating,
        comment,
        userId,
        placeId: itemType === "PLACE" ? itemId : undefined,
        eventId: itemType === "EVENT" ? itemId : undefined,
        status
      }
    });

    // log interaction for ML
    try {
      await prisma.interaction.create({
        data: {
          userId,
          itemId,
          itemType: itemType === "PLACE" ? "PLACE" : "EVENT",
          type: "REVIEW",
          context: { rating }
        }
      });
    } catch (e) {
      console.warn("Failed to log interaction:", e);
    }

    // recalc avg rating asynchronously (but ensure it's quick)
    try {
      await ReviewService.recalculateAvgRating(itemType, itemId);
    } catch (e) {
      console.error("Failed to recalc avg rating:", e);
    }

    return review;
  }

  // list reviews for an item
  static async listReviews({
    itemType,
    itemId,
    page = 1,
    limit = 20,
    sort = "new" // new | top
  }: {
    itemType: ItemType;
    itemId: string;
    page?: number;
    limit?: number;
    sort?: "new" | "top";
  }) {
    const where: any = {
      status: "APPROVED",
      ...(itemType === "PLACE" ? { placeId: itemId } : {}),
      ...(itemType === "EVENT" ? { eventId: itemId } : {})
    };

    const orderBy = sort === "top" ? { rating: "desc" } : { createdAt: "desc" };
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take: limit,
        include: { user: { select: { id: true, email: true, profile: true } } }
      }),
      prisma.review.count({ where })
    ]);

    // get aggregated rating if needed
    const avg = await prisma.review.aggregate({
      where,
      _avg: { rating: true },
      _count: { _all: true }
    });

    return {
      items,
      total,
      page,
      limit,
      avgRating: avg._avg.rating ?? null,
      count: avg._count._all
    };
  }

  // get single review (admin can view non-approved too - this function returns raw)
  static async getReview(id: string) {
    return prisma.review.findUnique({
      where: { id },
      include: { user: { select: { id: true, profile: true, email: true } } }
    });
  }

  static async updateReview(userId: string, id: string, data: { rating?: number; comment?: string }) {
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) throw new Error("Review not found");
    if (review.userId !== userId) throw new Error("Forbidden");

    const updated = await prisma.review.update({
      where: { id },
      data: {
        rating: data.rating ?? review.rating,
        comment: data.comment ?? review.comment,
        status: "PENDING" // re-approve by admin after edit (policy)
      }
    });

    // recalc
    const itemType = updated.placeId ? "PLACE" : "EVENT";
    const itemId = updated.placeId ?? updated.eventId!;
    await ReviewService.recalculateAvgRating(itemType as ItemType, itemId);

    return updated;
  }

  static async deleteReview(userId: string, id: string, isAdmin = false) {
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) throw new Error("Review not found");
    if (!isAdmin && review.userId !== userId) throw new Error("Forbidden");

    await prisma.review.delete({ where: { id } });

    // recalc
    const itemType = review.placeId ? "PLACE" : "EVENT";
    const itemId = review.placeId ?? review.eventId!;
    await ReviewService.recalculateAvgRating(itemType as ItemType, itemId);

    return { ok: true };
  }

  // admin moderation
  static async moderateReview(adminId: string, id: string, action: "APPROVE" | "REJECT" | "HIDE", reason?: string) {
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) throw new Error("Review not found");

    const newStatus = action === "APPROVE" ? "APPROVED" : action === "REJECT" ? "REJECTED" : "HIDDEN";

    const updated = await prisma.review.update({
      where: { id },
      data: { status: newStatus }
    });

    // create moderation audit
    await prisma.moderation.create({
      data: {
        adminId,
        postId: null,
        mediaId: null,
        action: action.toLowerCase(),
        reason
      }
    });

    // recalc rating if needed
    const itemType = updated.placeId ? "PLACE" : "EVENT";
    const itemId = updated.placeId ?? updated.eventId!;
    await ReviewService.recalculateAvgRating(itemType as ItemType, itemId);

    return updated;
  }

  // recalc average rating for item
  static async recalculateAvgRating(itemType: ItemType, itemId: string) {
    const where =
      itemType === "PLACE"
        ? { placeId: itemId, status: { equals: "APPROVED" as ReviewStatus } }
        : { eventId: itemId, status: { equals: "APPROVED" as ReviewStatus } };
    const agg = await prisma.review.aggregate({
      where,
      _avg: { rating: true },
      _count: { _all: true }
    });

    const avg = agg._avg.rating ?? null;
    if (itemType === "PLACE") {
      await prisma.place.update({ where: { id: itemId }, data: { avgRating: avg } });
    } else {
      await prisma.event.update({ where: { id: itemId }, data: { avgRating: avg } });
    }
    return avg;
  }
}
