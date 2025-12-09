// backend/src/api/services/category.service.ts
import {prisma} from "../../config/db.ts";

export class CategoryService {
  static async create(data: { key: string; name: string }) {
    return prisma.category.create({
      data: {
        key: data.key,
        name: data.name,
      },
    });
  }

  static async update(id: string, data: Partial<{ key: string; name: string }>) {
    return prisma.category.update({
      where: { id },
      data,
    });
  }

  static async delete(id: string) {
    // Optional: Clean related places (only remove categoryId not delete the place)
    await prisma.place.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    });
    return prisma.category.delete({ where: { id } });
  }

  static async getOne(id: string) {
    return prisma.category.findUnique({
      where: { id },
      include: {
        places: true,
        events: true,
      },
    });
  }

  static async list() {
    return prisma.category.findMany({
      orderBy: { name: "asc" },
    });
  }

  static async attachPlace(placeId: string, categoryId: string) {
    return prisma.place.update({
      where: { id: placeId },
      data: { categoryId },
    });
  }
}
