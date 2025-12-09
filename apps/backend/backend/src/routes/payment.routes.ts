import { Router } from "express";
import { PaymentController } from "../modules/payment/payment.controller.ts";

const router = Router();

// Chapa webhook
router.post("/webhook", PaymentController.webhook);

// Payment return redirect
router.get("/return", PaymentController.callback);

// Manual verify via /verify/:ref
router.get("/verify/:ref", PaymentController.verify);

// Direct initialization (optional)
router.post("/init", PaymentController.init);

export default router;
