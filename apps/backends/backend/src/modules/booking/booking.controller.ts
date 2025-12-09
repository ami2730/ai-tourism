// backend/src/modules/booking/booking.controller.ts
import type { Request, Response } from "express";
import { BookingService } from "./booking.service.ts";
import { PaymentService } from "../payment/payment.service.ts";
import { prisma } from "../../config/db.ts";
import { env } from "../../config/env.ts";

export class BookingController {
  static async initiate(req: Request, res: Response) {
    try {
      const authUser = (req as any).user;
      if (!authUser) return res.status(401).json({ message: "Unauthorized" });

      const { eventId, quantity } = req.body;
      if (!eventId || !quantity) return res.status(400).json({ message: "eventId and quantity required" });

      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event) return res.status(404).json({ message: "Event not found" });
      if (event.price == null) return res.status(400).json({ message: "Event has no price configured" });

      const q = Number(quantity);
      if (isNaN(q) || q <= 0) return res.status(400).json({ message: "invalid quantity" });

      const subTotal = event.price * q;
      const tax = 0;
      const fees = 0;
      const total = subTotal + tax + fees;

      // create booking
      const booking = await BookingService.createBooking({
        userId: authUser.sub,
        eventId,
        quantity: q,
        subTotal,
        tax,
        fees,
        total
      });

      // ensure user exists in DB (get email/profile)
      const user = await prisma.user.findUnique({ where: { id: authUser.sub }, include: { profile: true } });
      if (!user) {
        return res.status(500).json({ message: "Authenticated user not found in DB" });
      }

      // initiate payment (service will build chapa payload)
      const paymentInit = await PaymentService.initializeChapaPayment({
        userId: user.id,
        bookingId: booking.id,
        amount: total,
        currency: "ETB",
        description: `Payment for booking ${booking.id}`,
        returnUrl: `${env.FRONTEND_URL || env.BACKEND_URL}/payment-result`
      });

      return res.status(201).json({
        message: "Booking initiated",
        booking,
        checkoutUrl: paymentInit.checkoutUrl,
        providerData: paymentInit.providerData
      });
    } catch (err: any) {
      console.error("❌ Booking initiate error:", err);
      return res.status(500).json({ message: "Failed to initiate booking", error: err.message });
    }
  }

  static async getOne(req: Request, res: Response) {
    try {
      const bookingId = req.params.id;
      const booking = await BookingService.findById(bookingId);
      if (!booking) return res.status(404).json({ message: "Booking not found" });
      return res.json(booking);
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ message: "Failed to fetch booking" });
    }
  }

  static async cancel(req: Request, res: Response) {
    try {
      const bookingId = req.params.id;
      const authUser = (req as any).user;
      if (!authUser) return res.status(401).json({ message: "Unauthorized" });

      const booking = await BookingService.findById(bookingId);
      if (!booking) return res.status(404).json({ message: "Booking not found" });

      if (booking.user?.id !== authUser.sub && authUser.role !== "ADMIN") {
        return res.status(403).json({ message: "Forbidden" });
      }

      await BookingService.cancelBooking(bookingId);
      return res.json({ message: "Booking cancelled" });

    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ message: "Failed to cancel booking" });
    }
  }
}
