// backend/src/modules/blog/blog.service.ts
import { prisma } from "../../config/db.ts";
import crypto from "crypto";

export class BlogService {
  static async createPost({ authorId, title, body, category, tags = [] }: any) {
    const post = await prisma.blogPost.create({
      data: {
        authorId,
        title,
        body,
        category,
        tags,
      },
    });
    return post;
  }

  static async listPosts({ q, page = 1, limit = 20 }: { q?: string; page?: number; limit?: number }) {
    const where: any = { status: "APPROVED" }; // public only
    if (q && q.length) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { body: { contains: q, mode: "insensitive" } },
        { tags: { has: q } }
      ];
    }

    const posts = await prisma.blogPost.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: { author: { select: { id: true, email: true, profile: true } }, media: true, comments: true },
    });

    const total = await prisma.blogPost.count({ where });

    return { items: posts, page, limit, total };
  }

  static async getPostById(id: string) {
    return prisma.blogPost.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, email: true, profile: true } },
        media: true,
        comments: { orderBy: { createdAt: "asc" } },
      },
    });
  }

  static async updatePost({ id, userId, data }: { id: string; userId: string; data: any }) {
    // Only author or admin can update
    const post = await prisma.blogPost.findUnique({ where: { id } });
    if (!post) return null;
    // check author or admin role (assumes user role check done earlier; here we only check author)
    if (post.authorId !== userId) {
      // you could also allow ADMIN via a separate role-check middleware
      return null;
    }
    const updated = await prisma.blogPost.update({
      where: { id },
      data: {
        title: data.title ?? post.title,
        body: data.body ?? post.body,
        category: data.category ?? post.category,
        tags: Array.isArray(data.tags) ? data.tags : post.tags,
        status: data.status ?? post.status,
      },
    });
    return updated;
  }

  static async deletePost(id: string) {
    // Soft-delete or hard delete? We'll hard-delete here.
    // You may want to change to soft-delete (archive).
    return prisma.blogPost.delete({ where: { id } });
  }

  static async addMediaToPost({ postId, url, type = "image", publicId }: any) {
    const media = await prisma.blogMedia.create({
      data: {
        postId,
        url,
        type: type === "video" ? "VIDEO" : "IMAGE",
      },
    });
    return media;
  }

  // Comments
  static async createComment({ postId, userId, content }: any) {
    return prisma.comment.create({
      data: { postId, userId, content },
      include: { user: { select: { id: true, email: true, profile: true } } }
    });
  }

  static async listComments({ postId }: { postId: string }) {
    return prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, email: true, profile: true } } }
    });
  }

  // Moderation
  static async moderatePost({ adminId, postId, action, reason }: any) {
    // create moderation record and update post status accordingly
    const actionStr = action.toUpperCase();
    const status = actionStr === "APPROVE" ? "APPROVED" : actionStr === "REJECT" ? "REJECTED" : "PENDING";
    const moderation = await prisma.moderation.create({
      data: {
        adminId,
        postId,
        action,
        reason,
      },
    });

    const updated = await prisma.blogPost.update({
      where: { id: postId },
      data: { status }
    });

    return { moderation, post: updated };
  }
}
