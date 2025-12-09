// src/api/routes/review.routes.ts
import { Router } from "express";
import { ReviewController } from "../modules/review/review.controller.ts";
import { auth } from "../middleware/auth.ts"; 
import { permit } from "../middleware/roles.ts";
const router = Router();

// public list and get
router.get("/", ReviewController.list);
router.get("/:id", ReviewController.getOne);

// authenticated actions
router.post("/", auth, ReviewController.create);
router.put("/:id", auth, ReviewController.update);
router.delete("/:id", auth, ReviewController.delete);

// admin moderate
router.post("/admin/:id/moderate", auth , permit("ADMIN"), ReviewController.moderate);

export default router;
