// backend/src/modules/payment/payment.service.ts
// (Fixed webhook extraction: use 'tx_ref' instead of 'trx_ref', handle flat payload, improved fallback lookups)
// (Also added optional signature verification if CHAPA_WEBHOOK_SECRET is set)
import axios from "axios";
import { prisma } from "../../config/db.ts";
import { env } from "../../config/env.ts";
import crypto from "crypto";
import { BookingService } from "../booking/booking.service.ts";
import { TicketService } from "../tickets/ticket.service.ts";

/**
 * env required:
 * CHAPA_SECRET_KEY (secret server key, starts CHASECK_...)
 * CHAPA_BASE_URL = "https://api.chapa.co/v1"
 * BACKEND_URL
 * CHAPA_CALLBACK_PATH or default /api/payments/webhook
 * (Optional) CHAPA_WEBHOOK_SECRET for signature verification
 */

export class PaymentService {
  static async initializeChapaPayment(params: {
    userId: string;
    bookingId: string;
    amount: number;
    currency?: string;
    description?: string;
    returnUrl?: string;
  }) {
    const { userId, bookingId, amount } = params;
    const currency = params.currency ?? "ETB";
    const description = params.description ?? `Payment for booking ${bookingId}`;

    // load user (to get email & profile)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    });

    if (!user) throw new Error("User not found");

    // create payment record (PENDING)
    const payment = await prisma.payment.create({
      data: {
        userId,
        amount,
        currency,
        provider: "CHAPA",
        status: "PENDING",
        metadata: { bookingId }
      }
    });

    // build exact chapa payload

    console.log("🔎 EMAIL SENT TO CHAPA:", user.email);
    const payload: any = {
      amount: String(amount),
      currency,
      email: "henabakos1@gmail.com",
      first_name: user.profile?.name || user.email.split("@")[0] || "Guest",
      last_name: "Booking",
      phone_number: user.profile?.phone || "0912345678",
      tx_ref: String(bookingId),
      callback_url: `${env.CHAPA_CALLBACK_PATH }`,
      return_url: params.returnUrl || `${env.FRONTEND_URL || env.BACKEND_URL}/payment-success`,
      "customization[title]": "Event Booking Payment",
      "customization[description]": description,
      "meta[bookingId]": bookingId,
      "meta[userId]": userId
    };

    try {
      const resp = await axios.post(
        "https://api.chapa.co/v1/transaction/initialize",
        payload,
        {
          headers: {
            Authorization: `Bearer ${env.CHAPA_SECRET_KEY}`,
            "Content-Type": "application/json"
          },
          timeout: 15000
        }
      );

      const data = resp.data;
      if (!data || data.status !== "success") {
        // update payment with provider response for debugging
        await prisma.payment.update({
          where: { id: payment.id },
          data: { metadata: { ...(payment.metadata as any), providerResponse: data }, status: "FAILED" }
        });
        throw new Error(data?.message || "Chapa initialization failed");
      }

      const providerData = data.data;
      const checkoutUrl = providerData.checkout_url || providerData.authorization_url || providerData.url;

      // store provider data & mark INITIATED
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          providerTransactionId: providerData?.id ?? providerData?.reference ?? null,
          status: "INITIATED",
          metadata: { ...(payment.metadata as any), providerData }
        }
      });

      return { payment, providerData, checkoutUrl };
    } catch (err: any) {
      // log and rethrow
      console.error("Chapa Init Error:", err.response?.data ?? err.message);
      // attach provider error to payment if possible
      try {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { metadata: { ...(payment.metadata as any), initError: err.response?.data ?? err.message } }
        });
      } catch (_) {}
      throw new Error("Failed to initialize payment with Chapa");
    }
  }

  // verify using chapa verify endpoint (provider-specific)
  static async verifyTransaction(ref: string) {
    const url = `${"https://api.chapa.co/v1"}/transaction/verify/${ref}`;
    const headers = { Authorization: `Bearer ${env.CHAPA_SECRET_KEY}` };
    const resp = await axios.get(url, { headers, timeout: 15000 });
    return resp.data;
  }

  // webhook handler
  static async handleChapaWebhook(rawBody: any, headers: any) {
    const payload = rawBody;

    // Verify signature if secret is provided (recommended for production)
    if (env.CHAPA_WEBHOOK_SECRET) {
      const signature = headers['x-chapa-signature'] || headers['chapa-signature'];
      if (!signature) {
        console.warn("Webhook: missing signature");
        return { ok: false, error: "Missing signature" };
      }
      const hash = crypto.createHmac('sha256', env.CHAPA_WEBHOOK_SECRET)
        .update(JSON.stringify(payload))
        .digest('hex');
      if (hash !== signature) {
        console.warn("Webhook: invalid signature");
        return { ok: false, error: "Invalid signature" };
      }
    }

    // Extract tx_ref and other IDs (handle flat or nested payloads)
    const txRef = payload?.tx_ref || payload?.trx_ref || payload?.data?.tx_ref || payload?.data?.trx_ref || payload?.data?.reference;
    const refId = payload?.ref_id || payload?.data?.ref_id || payload?.data?.id || payload?.data?.transactionId;
    const meta = payload?.meta || payload?.data?.meta || {};

    console.log("Webhook: Extracted", { txRef, refId, meta });

    // Find payment (prioritize metadata.bookingId from meta, then txRef as bookingId, then refId as providerTransactionId)
    let payment = null;
    const possibleBookingId = meta?.bookingId || txRef;
    if (possibleBookingId) {
      payment = await prisma.payment.findFirst({
        where: { metadata: { path: ["bookingId"], equals: String(possibleBookingId) } }
      }).catch(() => null);
    }
    if (!payment && refId) {
      payment = await prisma.payment.findFirst({
        where: { providerTransactionId: String(refId) }
      }).catch(() => null);
    }
    if (!payment && txRef) {
      payment = await prisma.payment.findFirst({
        where: { providerTransactionId: String(txRef) }
      }).catch(() => null);
    }

    if (!payment) {
      console.warn("Webhook: payment not found", { txRef, refId, meta });
      return { ok: false, error: "Payment not found" };
    }

    const statusStr = payload?.status || payload?.data?.status || "";
    const success = statusStr.toLowerCase().includes("success");

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: success ? "SUCCESS" : "FAILED",
        providerTransactionId: refId || txRef || payment.providerTransactionId || null,
        metadata: { ...(payment.metadata as any), webhookPayload: payload }
      }
    });

    if (success) {
      const bookingId = (payment.metadata as any)?.bookingId || meta?.bookingId || txRef;
      if (bookingId) {
        try {
          const confirmedBooking = await BookingService.confirmBooking(String(bookingId), payment.id);
          if (confirmedBooking) {
            // Fetch tickets related to the confirmed booking, since 'tickets' is not a property of confirmedBooking
            const tickets = await prisma.ticket.findMany({
              where: { bookingId: confirmedBooking.id }
            });
            for (const ticket of tickets) {
              await TicketService.generateQrCode(ticket.id, ticket.qrToken);
            }
          }
        } catch (e) {
          console.error("Webhook confirmBooking error", e);
        }
      }
    }

    return { ok: true, paymentId: payment.id, status: success ? "SUCCESS" : "FAILED" };
  }
}