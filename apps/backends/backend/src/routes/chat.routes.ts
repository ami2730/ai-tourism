// backend/src/modules/chat/chat.routes.ts
import { Router } from "express";
import { ChatController } from "../modules/chat/chat.controller.ts";
import { auth } from "../middleware/auth.ts";

const router = Router();

// send a message (start or continue a conversation)
router.post("/message", ChatController.message);

// create a session (optional - message endpoint will create if missing)
router.post("/session", auth ,ChatController.createSession);

// get session with latest messages
router.get("/session/:id",auth ,  ChatController.getSession);

// list user sessions
router.get("/sessions", ChatController.listSessions);

export default router;
