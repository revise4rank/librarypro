import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { billingRenewBodySchema } from "./billing.validators";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-for-librarypro";
process.env.INTERNAL_TENANT_HEADER_SECRET = "test-internal-tenant-secret-for-librarypro";
process.env.RAZORPAY_WEBHOOK_SECRET = "test-razorpay-webhook-secret";

const { verifyRazorpayWebhookSignature } = await import("../services/razorpay-webhook.service");

const TEST_WEBHOOK_SECRET = "test-razorpay-webhook-secret";

test("billingRenewBodySchema defaults to growth plan", () => {
  const parsed = billingRenewBodySchema.parse({});
  assert.equal(parsed.planCode, "GROWTH_999");
});

test("billingRenewBodySchema accepts starter plan", () => {
  const parsed = billingRenewBodySchema.parse({ planCode: "STARTER_499" });
  assert.equal(parsed.planCode, "STARTER_499");
});

test("verifyRazorpayWebhookSignature accepts valid signature", () => {
  const rawBody = Buffer.from(JSON.stringify({ event: "payment.captured", payload: {} }), "utf8");
  const signature = createHmac("sha256", TEST_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  assert.doesNotThrow(() => verifyRazorpayWebhookSignature(rawBody, signature));
});

test("verifyRazorpayWebhookSignature rejects invalid signature", () => {
  const rawBody = Buffer.from(JSON.stringify({ event: "payment.captured", payload: {} }), "utf8");

  assert.throws(
    () => verifyRazorpayWebhookSignature(rawBody, "invalid-signature"),
    /Invalid Razorpay signature/,
  );
});
