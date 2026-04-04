import crypto from "node:crypto";
import type { PoolClient } from "pg";
import { env } from "../config/env";
import { requireDb } from "../lib/db";
import { AppError } from "../lib/errors";

export function verifyRazorpayWebhookSignature(rawBody: Buffer, signatureHeader?: string) {
  if (!signatureHeader) {
    throw new AppError(400, "Missing Razorpay signature", "MISSING_WEBHOOK_SIGNATURE");
  }

  const expected = crypto
    .createHmac("sha256", env.razorpayWebhookSecret)
    .update(rawBody)
    .digest("hex");

  const signature = signatureHeader.trim();
  if (
    expected.length !== signature.length ||
    !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  ) {
    throw new AppError(401, "Invalid Razorpay signature", "INVALID_WEBHOOK_SIGNATURE");
  }
}

type RazorpayWebhookEvent = {
  event: string;
  payload: Record<string, unknown>;
};

type EntitySnapshot = {
  eventId: string;
  subscriptionId?: string | null;
  orderId?: string | null;
  paymentId?: string | null;
  amount?: number | null;
  currency?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  paidAt?: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asIsoDate(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value * 1000).toISOString();
  }
  return asString(value);
}

function extractEntitySnapshot(event: RazorpayWebhookEvent): EntitySnapshot {
  const payload = asRecord(event.payload) ?? {};
  const subscriptionEntity = asRecord(asRecord(payload.subscription)?.entity);
  const paymentEntity = asRecord(asRecord(payload.payment)?.entity);
  const invoiceEntity = asRecord(asRecord(payload.invoice)?.entity);

  const subscriptionId =
    asString(subscriptionEntity?.id) ??
    asString(paymentEntity?.subscription_id) ??
    asString(invoiceEntity?.subscription_id);
  const paymentId = asString(paymentEntity?.id);
  const orderId =
    asString(paymentEntity?.order_id) ??
    asString(invoiceEntity?.order_id);
  const amountMinor =
    asNumber(paymentEntity?.amount) ??
    asNumber(subscriptionEntity?.charge_at) ??
    asNumber(invoiceEntity?.amount_paid) ??
    asNumber(invoiceEntity?.amount);
  const periodStart =
    asIsoDate(subscriptionEntity?.current_start) ??
    asIsoDate(subscriptionEntity?.start_at);
  const periodEnd =
    asIsoDate(subscriptionEntity?.current_end) ??
    asIsoDate(subscriptionEntity?.end_at) ??
    asIsoDate(invoiceEntity?.expire_by);
  const paidAt =
    asIsoDate(paymentEntity?.created_at) ??
    asIsoDate(invoiceEntity?.paid_at);

  const eventId =
    asString(paymentEntity?.id) ??
    asString(subscriptionEntity?.id) ??
    asString(invoiceEntity?.id) ??
    crypto.createHash("sha256").update(JSON.stringify(event)).digest("hex");

  return {
    eventId,
    subscriptionId,
    orderId,
    paymentId,
    amount: amountMinor !== null ? amountMinor / 100 : null,
    currency:
      asString(paymentEntity?.currency) ??
      asString(invoiceEntity?.currency) ??
      "INR",
    periodStart,
    periodEnd,
    paidAt,
  };
}

async function storeWebhookReceipt(
  client: PoolClient,
  event: RazorpayWebhookEvent,
  eventId: string,
) {
  const existing = await client.query<{ id: string; status: string }>(
    `
      SELECT id, status
      FROM webhook_events
      WHERE source = 'razorpay' AND event_id = $1
      LIMIT 1
    `,
    [eventId],
  );

  if (existing.rowCount && existing.rows[0].status === "PROCESSED") {
    return { duplicate: true, recordId: existing.rows[0].id };
  }

  const inserted = await client.query<{ id: string }>(
    `
      INSERT INTO webhook_events (source, event_id, event_type, payload, status)
      VALUES ('razorpay', $1, $2, $3::jsonb, 'RECEIVED')
      ON CONFLICT (source, event_id)
      DO UPDATE SET event_type = EXCLUDED.event_type, payload = EXCLUDED.payload
      RETURNING id
    `,
    [eventId, event.event, JSON.stringify(event.payload)],
  );

  return { duplicate: false, recordId: inserted.rows[0].id };
}

async function markWebhookProcessed(client: PoolClient, recordId: string, status = "PROCESSED") {
  await client.query(
    `
      UPDATE webhook_events
      SET status = $2,
          processed_at = NOW()
      WHERE id = $1
    `,
    [recordId, status],
  );
}

async function updateSubscriptionState(
  client: PoolClient,
  snapshot: EntitySnapshot,
  status: "ACTIVE" | "PAST_DUE" | "CANCELLED",
) {
  if (!snapshot.subscriptionId) return 0;

  const graceUntil = status === "PAST_DUE"
    ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const result = await client.query(
    `
      UPDATE subscriptions
      SET status = $2::subscription_status,
          current_period_start = COALESCE($3::timestamptz, current_period_start),
          current_period_end = COALESCE($4::timestamptz, current_period_end),
          renews_at = COALESCE($4::timestamptz, renews_at),
          last_payment_at = COALESCE($5::timestamptz, last_payment_at),
          cancelled_at = CASE WHEN $2::subscription_status = 'CANCELLED' THEN NOW() ELSE cancelled_at END,
          grace_until = CASE WHEN $2::subscription_status = 'PAST_DUE' THEN COALESCE($6::timestamptz, grace_until) ELSE NULL END,
          updated_at = NOW()
      WHERE razorpay_subscription_id = $1
    `,
    [
      snapshot.subscriptionId,
      status,
      snapshot.periodStart,
      snapshot.periodEnd,
      snapshot.paidAt,
      graceUntil,
    ],
  );

  return result.rowCount ?? 0;
}

async function updatePlatformPayment(
  client: PoolClient,
  snapshot: EntitySnapshot,
  status: "PAID" | "FAILED",
) {
  if (!snapshot.paymentId && !snapshot.orderId) return 0;

  const result = await client.query(
    `
      UPDATE platform_payments
      SET status = $3::payment_status,
          razorpay_payment_id = COALESCE($1, razorpay_payment_id),
          razorpay_order_id = COALESCE($2, razorpay_order_id),
          amount = COALESCE($4::numeric, amount),
          currency = COALESCE($5, currency),
          paid_at = CASE WHEN $3::payment_status = 'PAID' THEN COALESCE($6::timestamptz, NOW()) ELSE paid_at END
      WHERE razorpay_payment_id = COALESCE($1, razorpay_payment_id)
         OR razorpay_order_id = COALESCE($2, razorpay_order_id)
    `,
    [
      snapshot.paymentId,
      snapshot.orderId,
      status,
      snapshot.amount,
      snapshot.currency,
      snapshot.paidAt,
    ],
  );

  return result.rowCount ?? 0;
}

export async function processRazorpayWebhook(event: RazorpayWebhookEvent) {
  const db = requireDb();
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const snapshot = extractEntitySnapshot(event);
    const receipt = await storeWebhookReceipt(client, event, snapshot.eventId);

    if (receipt.duplicate) {
      await client.query("COMMIT");
      return { ok: true, duplicate: true, action: "IGNORED_ALREADY_PROCESSED" };
    }

    let action = "IGNORED";
    let touchedSubscriptions = 0;
    let touchedPayments = 0;

    switch (event.event) {
      case "subscription.activated":
      case "subscription.charged":
        touchedSubscriptions = await updateSubscriptionState(client, snapshot, "ACTIVE");
        action = "SUBSCRIPTION_ACTIVATED";
        break;
      case "payment.captured":
        touchedPayments = await updatePlatformPayment(client, snapshot, "PAID");
        if (snapshot.subscriptionId) {
          touchedSubscriptions = await updateSubscriptionState(client, snapshot, "ACTIVE");
        }
        action = "PAYMENT_CAPTURED";
        break;
      case "subscription.halted":
      case "payment.failed":
        touchedPayments = await updatePlatformPayment(client, snapshot, "FAILED");
        if (snapshot.subscriptionId) {
          touchedSubscriptions = await updateSubscriptionState(client, snapshot, "PAST_DUE");
        }
        action = "SUBSCRIPTION_PAST_DUE";
        break;
      case "subscription.cancelled":
        touchedSubscriptions = await updateSubscriptionState(client, snapshot, "CANCELLED");
        action = "SUBSCRIPTION_CANCELLED";
        break;
      default:
        action = "IGNORED";
        break;
    }

    await markWebhookProcessed(client, receipt.recordId);
    await client.query("COMMIT");

    return {
      ok: true,
      action,
      touchedSubscriptions,
      touchedPayments,
      eventId: snapshot.eventId,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
