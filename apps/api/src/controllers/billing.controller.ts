import type { Request, Response } from "express";
import { processRazorpayWebhook, verifyRazorpayWebhookSignature } from "../services/razorpay-webhook.service";

export async function razorpayWebhookController(req: Request, res: Response) {
  verifyRazorpayWebhookSignature(
    req.body as Buffer,
    typeof req.headers["x-razorpay-signature"] === "string"
      ? req.headers["x-razorpay-signature"]
      : undefined,
  );

  const parsedBody = JSON.parse((req.body as Buffer).toString("utf8")) as {
    event: string;
    payload: Record<string, unknown>;
  };
  const result = await processRazorpayWebhook(parsedBody);

  res.status(200).json({
    received: true,
    result,
  });
}
