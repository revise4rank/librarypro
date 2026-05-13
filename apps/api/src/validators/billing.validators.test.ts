import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { billingRenewBodySchema } from "./billing.validators";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-for-booklib";
process.env.INTERNAL_TENANT_HEADER_SECRET = "test-internal-tenant-secret-for-booklib";
process.env.RAZORPAY_WEBHOOK_SECRET = "test-razorpay-webhook-secret";

const { verifyRazorpayWebhookSignature } = await import("../services/razorpay-webhook.service");

const TEST_WEBHOOK_SECRET = "test-razorpay-webhook-secret";

test("billingRenewBodySchema requires an explicit plan code", () => {
  assert.throws(() => billingRenewBodySchema.parse({}), /Required|expected string/i);
});

test("billingRenewBodySchema accepts dynamic paid plan codes", () => {
  const parsed = billingRenewBodySchema.parse({ planCode: "CUSTOM_LIBRARY_PLAN_2026" });
  assert.equal(parsed.planCode, "CUSTOM_LIBRARY_PLAN_2026");
});

test("verifyRazorpayWebhookSignature accepts valid signature", async () => {
  const rawBody = Buffer.from(JSON.stringify({ event: "payment.captured", payload: {} }), "utf8");
  const signature = createHmac("sha256", TEST_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  await assert.doesNotReject(() => verifyRazorpayWebhookSignature(rawBody, signature));
});

test("verifyRazorpayWebhookSignature rejects invalid signature", async () => {
  const rawBody = Buffer.from(JSON.stringify({ event: "payment.captured", payload: {} }), "utf8");

  await assert.rejects(
    () => verifyRazorpayWebhookSignature(rawBody, "invalid-signature"),
    /Invalid Razorpay signature/,
  );
});
