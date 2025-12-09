// backend/src/api/routes/ticket.routes.ts
import { Router } from "express";
import { TicketController } from "../modules/tickets/ticket.controller.ts";
import { auth } from "../middleware/auth.ts";

const router = Router();

router.get("/:id", auth, TicketController.getOne);
router.post("/validate", TicketController.validate); // public, or protect to admin/validator device

export default router;
