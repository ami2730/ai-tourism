// backend/src/modules/booking/booking.service.ts
// (No changes needed here, but confirming for completeness)
import { prisma } from "../../config/db.ts";
import crypto from "crypto";

export class BookingService {
  static async createBooking(data: {
    userId: string;
    eventId: string;
    quantity: number;
    subTotal: number;
    tax: number;
    fees: number;
    total: number;
  }) {
    return prisma.booking.create({
      data: {
        userId: data.userId,
        eventId: data.eventId,
        quantity: data.quantity,
        subTotal: data.subTotal,
        tax: data.tax,
        fees: data.fees,
        total: data.total,
        status: "PENDING"
      }
    });
  }

  static async findById(id: string) {
    return prisma.booking.findUnique({
      where: { id },
      include: {
        event: true,
        tickets: true,
        user: { select: { id: true, email: true, profile: true } }
      }
    });
  }

  static async cancelBooking(id: string) {
    return prisma.booking.update({
      where: { id },
      data: { status: "CANCELLED" }
    });
  }

  // Confirm booking: update status, create tickets atomically and increment event bookingCount
  static async confirmBooking(bookingId: string, paymentId?: string) {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return null;
    if (booking.status === "CONFIRMED") return booking; // idempotent

    // transaction: update booking, create tickets, update event bookingCount
    const created = await prisma.$transaction(async (tx) => {
      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: "CONFIRMED",
          transactionId: paymentId ?? undefined
        }
      });

      const tickets = [];
      for (let i = 0; i < booking.quantity; i++) {
        const t = await tx.ticket.create({
          data: {
            bookingId,
            eventId: booking.eventId,
            userId: booking.userId,
            status: "CONFIRMED",
            qrToken: crypto.randomUUID()
          }
        });
        tickets.push(t);
      }

      await tx.event.update({
        where: { id: booking.eventId },
        data: { bookingCount: { increment: booking.quantity } }
      });

      // return updated booking with tickets
      return tx.booking.findUnique({
        where: { id: bookingId },
        include: { tickets: true, event: true, user: true }
      });
    });

    return created;
  }
}