import { Router } from "express";

import authRoutes from "./auth.routes.ts";
import userRoutes from "./user.routes.ts";
import placeRoutes from "./place.routes.ts";
import eventRoutes from "./event.routes.ts";
import reviewRoutes from "./review.routes.ts";
import bookingRoutes from "./booking.routes.ts";
import recommendationRoutes from "./recommendation.routes.ts";
import fileRoures from "./file.routes.ts"
import categoryRoutes from "./category.routes.ts";
import ticketRoutes from "./ticket.routes.ts"
import paymentRoutes from "./payment.routes.ts";
import favoriteRoute from "./favorite.routes.ts"
import interactionRoutes from "./interaction.routes.ts"
import MlRoutes from "./ml.routes.ts"
import chatRoutes from "./chat.routes.ts"
import blogRoutes from "./blog.routes.ts"


const router = Router();

// --------------------------
// API Route Groups
// --------------------------
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/places", placeRoutes);
router.use("/events", eventRoutes);
router.use("/reviews", reviewRoutes);
router.use("/bookings", bookingRoutes);
router.use("/recommendations", recommendationRoutes);
router.use("/upload" , fileRoures);
router.use("/categories", categoryRoutes);
router.use("/tickets", ticketRoutes);
router.use("/payments", paymentRoutes);
router.use("favorites" , favoriteRoute)
router.use("interactions" , interactionRoutes);
router.use("/ml" , MlRoutes);
router.use("/chat" , chatRoutes);
router.use("/blog" , blogRoutes);

export default router;
