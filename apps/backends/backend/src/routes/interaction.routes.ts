// backend/src/modules/interaction/interaction.routes.ts
import { Router } from "express";
import { auth } from "../middleware/auth.ts";
import { InteractionController } from "../modules/interaction/interaction.controller.ts";

const router = Router();

router.post("/", InteractionController.record);  // auth optional
router.get("/", auth, InteractionController.list);

export default router;
