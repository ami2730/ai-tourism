// backend/src/modules/interaction/interaction.service.ts
import { InteractionType, RecommendationItemType } from "@prisma/client";
import { prisma } from "../../config/db.ts";

export class InteractionService {
  static async record(params: {
    userId?: string;
    itemId: string;
    itemType: RecommendationItemType;
    type: InteractionType;
    context?: any;
  }) {
    return prisma.interaction.create({
      data: {
        userId: params.userId || null,
        itemId: params.itemId,
        itemType: params.itemType,
        type: params.type,
        context: params.context || {}
      }
    });
  }

  static async list(userId: string) {
    return prisma.interaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
  }
}
