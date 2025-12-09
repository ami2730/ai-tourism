import {  RecommendationItemType } from "@prisma/client";
import { prisma } from "../../config/db.ts";

export class FavoriteService {
  static async add(userId: string, itemId: string, itemType: RecommendationItemType) {
    const exists = await prisma.favorite.findFirst({
      where: { userId, itemId, itemType }
    });

    if (exists) throw new Error("Already favorited");

    return prisma.favorite.create({
      data: { userId, itemId, itemType }
    });
  }

  static async remove(userId: string, itemId: string, itemType: RecommendationItemType) {
    const fav = await prisma.favorite.findFirst({
      where: { userId, itemId, itemType }
    });

    if (!fav) throw new Error("Favorite not found");

    await prisma.favorite.delete({ where: { id: fav.id } });
    return { deleted: true };
  }

  static async list(userId: string) {
    return prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
  }

  static async isFavorited(userId: string, itemId: string, itemType: RecommendationItemType) {
    const fav = await prisma.favorite.findFirst({
      where: { userId, itemId, itemType }
    });
    return { favorited: !!fav };
  }
}
