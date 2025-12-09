// backend/src/modules/ticket/ticket.controller.ts
// (Updated to use TicketService, added endpoint for getting QR code)
import type { Request, Response } from "express";
import { prisma } from "../../config/db.ts";
import { TicketService } from "./ticket.service.ts"; // Import new service

export class TicketController {
  // GET /api/tickets/:id
  static async getOne(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const ticket = await TicketService.findById(id); // Use service
      if (!ticket) return res.status(404).json({ message: "Ticket not found" });
      return res.json(ticket);
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ message: "Failed to get ticket" });
    }
  }

  // GET /api/tickets/:id/qr
  // (New endpoint: Serve QR code image for a ticket)
  static async getQr(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const ticket = await prisma.ticket.findUnique({ where: { id } });
      if (!ticket) return res.status(404).json({ message: "Ticket not found" });
      if (!ticket.qrToken) {
        // Generate on-the-fly if not present
        await TicketService.generateQrCode(ticket.id, ticket.qrToken);
        const refreshedTicket = await prisma.ticket.findUnique({ where: { id } });
        if (!refreshedTicket?.qrToken) return res.status(500).json({ message: "QR code not available" });

        // Send as image
        const buffer = Buffer.from(refreshedTicket.qrToken.split(",")[1], "base64"); // Extract base64 data
        res.setHeader("Content-Type", "image/png");
        return res.send(buffer);
      }

      // Send existing QR
      const buffer = Buffer.from(ticket.qrToken.split(",")[1], "base64");
      res.setHeader("Content-Type", "image/png");
      return res.send(buffer);
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ message: "Failed to get QR code" });
    }
  }

  // POST /api/tickets/validate
  // Body: { qrToken: string }
  static async validate(req: Request, res: Response) {
    try {
      const { qrToken } = req.body;
      if (!qrToken) return res.status(400).json({ message: "qrToken required" });

      const ticket = await prisma.ticket.findUnique({ where: { qrToken } });
      if (!ticket) return res.status(404).json({ message: "Ticket not found or invalid" });

      // check expiry & status
      if (ticket.status !== "CONFIRMED") return res.status(400).json({ message: `Ticket not valid (status=${ticket.status})` });

      // mark used
      await prisma.ticket.update({ where: { id: ticket.id }, data: { status: "USED", usedAt: new Date() } });

      return res.json({ message: "Ticket validated", ticketId: ticket.id, eventId: ticket.eventId, userId: ticket.userId });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ message: "Failed to validate ticket" });
    }
  }
}