// backend/src/api/routes/user.routes.ts
import { Router } from "express";
import { UserController } from "../modules/users/user.controller.ts";
import { auth } from "../middleware/auth.ts";
import { permit } from "../middleware/roles.ts";
import { upload } from "../utils/upload.ts";

const router = Router();

// Admin: list users
router.get("/", auth, permit("ADMIN"), UserController.list);

// Get user by id (self or admin)
router.get("/:id", auth, UserController.getOne);

// Update own profile
router.put("/profile", auth, UserController.updateProfile);

// Upload avatar (multipart/form-data) field name: avatar
router.post("/profile/avatar", auth, upload.single("avatar"), UserController.uploadAvatar);

// Change password
router.put("/change-password", auth, UserController.changePassword);

// Admin update user (role, banned, email)
router.put("/:id", auth, permit("ADMIN"), UserController.updateUserAdmin);

// Delete user (self or admin)
router.delete("/:id", auth, UserController.deleteUser);

export default router;
