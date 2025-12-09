// backend/src/api/routes/event.routes.ts
import { Router } from "express";
import { EventController } from "../modules/event/event.controller.ts";
import { auth } from "../middleware/auth.ts";
import { permit } from "../middleware/roles.ts";
import { upload } from "../utils/upload.ts";

const router = Router();

// public
router.get("/", EventController.list); 
router.get("/nearby", EventController.nearby);
router.get("/:id", EventController.getOne);

// admin CRUD
router.post("/", auth, permit("ADMIN"), EventController.create);
router.put("/:id", auth, permit("ADMIN"), EventController.update);
router.delete("/:id", auth, permit("ADMIN"), EventController.remove);

// upload multiple images (admin)
router.post("/:id/images", auth, permit("ADMIN"), upload.array("images", 10), EventController.uploadImages);

export default router;
