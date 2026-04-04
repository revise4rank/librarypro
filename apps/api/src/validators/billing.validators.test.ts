import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { env } from "../config/env";
import { billingRenewBodySchema } from "./billing.validators";
import { verifyRazorpayWebhookSignature } from "../services/razorpay-webhook.service";

test("billingRenewBodySchema defaults to growth plan", () => {
  const parsed = billingRenewBodySchema.parse({});
  assert.equal(parsed.planCode, "GROWTH_999");
});

test("billingRenewBodySchema accepts starter plan", () => {
  const parsed = billingRenewBodySchema.parse({ planCode: "STARTER_499" });
  assert.equal(parsed.planCode, "STARTER_499");
});

test("verifyRazorpayWebhookSignature accepts valid signature", () => {
  assert.ok(env.razorpayWebhookSecret, "RAZORPAY_WEBHOOK_SECRET must be present for this test");

  const rawBody = Buffer.from(JSON.stringify({ event: "payment.captured", payload: {} }), "utf8");
  const signature = createHmac("sha256", env.razorpayWebhookSecret)
    .update(rawBody)
    .digest("hex");

  assert.doesNotThrow(() => verifyRazorpayWebhookSignature(rawBody, signature));
});

test("verifyRazorpayWebhookSignature rejects invalid signature", () => {
  assert.ok(env.razorpayWebhookSecret, "RAZORPAY_WEBHOOK_SECRET must be present for this test");

  const rawBody = Buffer.from(JSON.stringify({ event: "payment.captured", payload: {} }), "utf8");

  assert.throws(
    () => verifyRazorpayWebhookSignature(rawBody, "invalid-signature"),
    /Invalid Razorpay signature/,
  );
});
