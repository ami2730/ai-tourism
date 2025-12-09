// backend/src/modules/favorite/favorite.routes.ts
import { Router } from "express";
import { auth } from "../middleware/auth.ts";
import { FavoriteController } from "../modules/favorite/favorite.controller.ts";

const router = Router();

router.post("/", auth, FavoriteController.add);
router.delete("/", auth, FavoriteController.remove);
router.get("/", auth, FavoriteController.list);
router.get("/check", auth, FavoriteController.check);

export default router;
