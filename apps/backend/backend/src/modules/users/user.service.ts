// backend/src/api/services/user.service.ts
import {prisma} from "../../config/db.ts";
import { Prisma } from "@prisma/client";

export type UserUpdateInput = {
  email?: string;
  role?: string;
  banned?: boolean;
};

export class UserService {
  static async listAll(page = 1, perPage = 25) {
    const skip = (page - 1) * perPage;
    const [data, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: perPage,
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          profile: true,
          // don't select password
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count(),
    ]);

    return { data, total, page, perPage };
  }

  static async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        profile: true,
        banned : true
      },
    });
  }

  static async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  static async updateProfile(userId: string, payload: Partial<Prisma.ProfileCreateInput>) {
    // use upsert so profile is created if missing
    const profile = await prisma.profile.upsert({
      where: { userId },
      create: { ...payload, user: { connect: { id: userId } } as any },
      update: { ...payload },
    });
    return profile;
  }

  static async updateAvatar(userId: string, avatarUrl: string) {
    // ensure profile exists
    return prisma.profile.upsert({
      where: { userId },
      create: { userId, avatar: avatarUrl, name: "" },
      update: { avatar: avatarUrl },
    });
  }

  static async updateUserAdmin(userId: string, data: UserUpdateInput) {
    // admin-level user update (role, email, banned)
    const allowed: any = {};
    if (data.email !== undefined) allowed.email = data.email;
    if (data.role !== undefined) allowed.role = data.role;
    if (data.banned !== undefined) allowed["banned"] = data.banned;

    return prisma.user.update({
      where: { id: userId },
      data: allowed,
      select: {
        id: true,
        email: true,
        role: true,
        banned: true,
        profile: true,
      },
    });
  }

  static async changePassword(userId: string, newHashedPassword: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { password: newHashedPassword },
      select: { id: true },
    });
  }

  static async deleteUser(userId: string) {
    // cascade delete not automatic — remove related rows explicitly if desired
    // simple approach: delete user (Prisma will error if FK constraints exist).
    await prisma.$transaction([
      prisma.refreshToken.deleteMany({ where: { userId } }),
      prisma.favorite.deleteMany({ where: { userId } }),
      prisma.ticket.deleteMany({ where: { userId } }),
      prisma.booking.deleteMany({ where: { userId } }),
      prisma.payment.deleteMany({ where: { userId } }),
      prisma.review.deleteMany({ where: { userId } }),
      prisma.interaction.deleteMany({ where: { userId } }),
      prisma.profile.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);
    return { success: true };
  }
}
