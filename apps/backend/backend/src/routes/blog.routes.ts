// backend/src/modules/blog/blog.routes.ts
import { Router } from "express";
import { BlogController } from "../modules/blog/blog.controller.ts";
import { CommentController } from "../modules/blog/comment.controller.ts";
import { ModerationController } from "../modules/blog/moderation.controller.ts";
import { auth } from "../middleware/auth.ts";
import { permit } from "../middleware/roles.ts";
import { createPostValidators } from "../modules/blog/blog.validators.ts";
import { upload } from "../utils/upload.ts";
const router = Router();

// Posts
router.post("/", auth, createPostValidators, BlogController.create);
router.get("/", BlogController.list);
router.get("/:id", BlogController.getOne);
router.patch("/:id", auth, BlogController.update);
router.delete("/:id", auth, permit("ADMIN"), BlogController.remove);

// Media upload (attached to a post)
router.post(
    "/:id/media",
    auth,
    permit("ADMIN"),
    upload.single("file"), 
    BlogController.uploadMedia
  );
  

// Comments
router.post("/:id/comments", auth, CommentController.create);
router.get("/:id/comments", CommentController.list);

// Moderation - admin
router.post("/:id/moderate", auth, permit("ADMIN"), ModerationController.moderate);

export default router;
