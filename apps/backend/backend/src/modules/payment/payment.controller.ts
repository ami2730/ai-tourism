
import type { Request, Response } from "express";
import { PaymentService } from "./payment.service.ts";
import { env } from "../../config/env.ts";

export class PaymentController {
  // POST /api/payments/webhook
  static async webhook(req: Request, res: Response) {
    console.log("🔥 Webhook HIT!", req.body);
    try {
      const payload = req.body; // Assuming raw body is parsed as JSON
      const headers = req.headers;
      const result = await PaymentService.handleChapaWebhook(payload, headers);
      if (!result.ok) {
        return res.status(400).json({ message: result.error || "Webhook processing failed" });
      }
      return res.status(200).send("OK");
    } catch (err: any) {
      console.error("Webhook handling error:", err);
      return res.status(400).json({ message: err.message || "Webhook error" });
    }
  }

  // POST /api/payments/init  -> server initialization (optional)
  static async init(req: Request, res: Response) {
    try {
      const payload = req.body; // expects { userId, bookingId, amount, currency?, description?, returnUrl? }
      const result = await PaymentService.initializeChapaPayment(payload);
      return res.status(201).json(result);
    } catch (err: any) {
      console.error("Init error:", err);
      return res.status(500).json({ message: err.message || "Failed to initialize payment" });
    }
  }

  // GET /api/payments/verify/:ref
  static async verify(req: Request, res: Response) {
    try {
      const ref = req.params.ref;
      if (!ref) return res.status(400).json({ message: "missing ref" });
      const data = await PaymentService.verifyTransaction(ref);
      return res.json(data);
    } catch (err: any) {
      console.error("Verify error:", err);
      return res.status(500).json({ message: err.message || "Verify failed" });
    }
  }

  // GET /api/payments/callback
  static async callback(req: Request, res: Response) {
    try {
      const { trx_ref, ref_id, status } = req.query;
      const ref = String(ref_id || trx_ref || "");
      if (!ref) return res.status(400).send("missing ref");
      // verify and redirect
      await PaymentService.verifyTransaction(ref);
      return res.redirect(`${env.FRONTEND_URL || env.BACKEND_URL}/payment-result?ref=${encodeURIComponent(ref)}&status=${encodeURIComponent(String(status || ""))}`);
    } catch (err: any) {
      console.error("Callback error:", err);
      return res.status(500).send("Error verifying transaction");
    }
  }
}