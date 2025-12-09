// backend/src/api/routes/place.routes.ts
import { Router } from "express";
import { PlaceController } from "../modules/places/place.controller.ts";
import { auth } from "../middleware/auth.ts";
import { permit } from "../middleware/roles.ts";
import { upload } from "../utils/upload.ts";

const router = Router();

// Public
router.get("/", PlaceController.list);           // list + search
router.get("/search", PlaceController.search);
router.get("/nearby", PlaceController.nearby);
router.get("/:id", PlaceController.getOne);

// Admin (create / update / delete / upload)
router.post("/", auth, permit("ADMIN"), PlaceController.create);
router.put("/:id", auth, permit("ADMIN"), PlaceController.update);
router.delete("/:id", auth, permit("ADMIN"), PlaceController.remove);

// upload image for place
router.post("/:id/images", auth, permit("ADMIN"), upload.single("file"), PlaceController.uploadImage);

export default router;
