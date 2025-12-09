import { Router } from "express";
import { RecommendationController } from "../modules/recommendation/recommendation.controller.ts";

const router = Router();

router.get("/global", RecommendationController.global);

export default router;

