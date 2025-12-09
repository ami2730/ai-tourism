// backend/src/api/routes/category.routes.ts
import { Router } from "express";
import { CategoryController } from "../modules/category/category.controller.ts";
import { auth } from "../middleware/auth.ts";
import { permit } from "../middleware/roles.ts";

const router = Router();

// PUBLIC
router.get("/", CategoryController.list);
router.get("/:id", CategoryController.getOne);

// ADMIN
router.post("/", auth, permit("ADMIN"), CategoryController.create);
router.put("/:id", auth, permit("ADMIN"), CategoryController.update);
router.delete("/:id", auth, permit("ADMIN"), CategoryController.remove);

// Attach a place to a category (ADMIN)
router.post("/attach", auth, permit("ADMIN"), CategoryController.attachPlace);

export default router;
