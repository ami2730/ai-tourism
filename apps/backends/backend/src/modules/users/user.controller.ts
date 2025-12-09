// backend/src/api/controllers/user.controller.ts
import  type { Request, Response } from "express";
import { UserService } from "./user.service.ts";
import { UploadService } from "../file-management/upload.service.ts";
import { prisma } from "../../config/db.ts";
import bcrypt from "bcrypt";


const SALT_ROUNDS = 12;

export class UserController {
  // GET /api/users?page=1&perPage=25   (admin only)
  static async list(req: Request, res: Response) {
    try {
      const page = Math.max(1, Number(req.query.page || 1));
      const perPage = Math.max(1, Math.min(100, Number(req.query.perPage || 25)));
      const result = await UserService.listAll(page, perPage);
      return res.json(result);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Failed to list users" });
    }
  }

  // GET /api/users/:id  (admin or self)
  static async getOne(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const requester = (req as any).user;
      if (!requester) return res.status(401).json({ message: "Unauthorized" });

      // allow self or admin
      if (requester.sub !== id && requester.role !== "ADMIN") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const user = await UserService.findById(id);
      if (!user) return res.status(404).json({ message: "User not found" });
      return res.json(user);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Failed to get user" });
    }
  }

  // PUT /api/users/profile   (auth)
  static async updateProfile(req: Request, res: Response) {
    try {
      const requester = (req as any).user;
      if (!requester) return res.status(401).json({ message: "Unauthorized" });

      const payload = {
        name: req.body.name,
        gender: req.body.gender,
        phone: req.body.phone,
        country: req.body.country,
        locale: req.body.locale,
      };

      const profile = await UserService.updateProfile(requester.sub, payload);
      return res.json({ message: "Profile updated", profile });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ message: err.message || "Failed to update profile" });
    }
  }

  // POST /api/users/profile/avatar  (auth, multipart form-data file field "avatar")
  static async uploadAvatar(req: Request, res: Response) {
    try {
      const requester = (req as any).user;
      if (!requester) return res.status(401).json({ message: "Unauthorized" });

      const file = req.file;
      if (!file) return res.status(400).json({ message: "File is required" });

      const url = await UploadService.handle(file);
      const profile = await UserService.updateAvatar(requester.sub, url);

      return res.json({ message: "Avatar updated", profile });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ message: err.message || "Failed to upload avatar" });
    }
  }

  // PUT /api/users/change-password  (auth)
  static async changePassword(req: Request, res: Response) {
    try {
          const requester = (req as any).user;
          if (!requester) return res.status(401).json({ message: "Unauthorized" });

          const { oldPassword, newPassword } = req.body;
          if (!oldPassword || !newPassword) return res.status(400).json({ message: "oldPassword and newPassword required" });

          // load user with password for verification
          const user = await prisma.user.findUnique({ where: { id: requester.sub } });
          if (!user) return res.status(404).json({ message: "User not found" });

          const ok = await bcrypt.compare(oldPassword, user.password);
          if (!ok) return res.status(400).json({ message: "Incorrect current password" });

          const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
          await UserService.changePassword(requester.sub, hashed);
          return res.json({ message: "Password changed" });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ message: err.message || "Failed to change password" });
    }
  }

  // PUT /api/users/:id    (admin only) update email / role / banned
  static async updateUserAdmin(req: Request, res: Response) {
    try {
      const userId = req.params.id;
      const payload: any = {};
      if (req.body.email !== undefined) payload.email = req.body.email;
      if (req.body.role !== undefined) payload.role = req.body.role;
      if (req.body.banned !== undefined) payload.banned = req.body.banned;

      const updated = await UserService.updateUserAdmin(userId, payload);
      return res.json({ message: "User updated", user: updated });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ message: err.message || "Failed to update user" });
    }
  }

  // DELETE /api/users/:id  (admin or self)
  static async deleteUser(req: Request, res: Response) {
    try {
      const userId = req.params.id;
      const requester = (req as any).user;
      if (!requester) return res.status(401).json({ message: "Unauthorized" });

      // allow only admin or self deletion
      if (requester.sub !== userId && requester.role !== "ADMIN") {
        return res.status(403).json({ message: "Forbidden" });
      }

      await UserService.deleteUser(userId);
      return res.json({ message: "User deleted" });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ message: err.message || "Failed to delete user" });
    }
  }
}
