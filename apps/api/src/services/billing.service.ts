import { env } from "../config/env";
import { requireDb } from "../lib/db";
import { AppError } from "../lib/errors";
import { BillingRepository } from "../repositories/billing.repository";

const PLAN_CATALOG = {
  STARTER_499: { code: "STARTER_499", name: "Starter 499", amount: 499, currency: "INR" },
  GROWTH_999: { code: "GROWTH_999", name: "Growth 999", amount: 999, currency: "INR" },
} as const;

function repository() {
  return new BillingRepository(requireDb());
}

type RazorpayOrderResponse = {
  id?: string;
  error?: {
    description?: string;
  };
};

function ensureRazorpayConfigured() {
  if (!env.razorpayKeyId || !env.razorpayKeySecret) {
    throw new AppError(503, "Razorpay is not configured yet", "RAZORPAY_NOT_CONFIGURED");
  }
}

async function createRazorpayOrder(input: {
  libraryId: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  planName: string;
}) {
  ensureRazorpayConfigured();
  const auth = Buffer.from(`${env.razorpayKeyId}:${env.razorpayKeySecret}`).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      authorization: `Basic ${auth}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      amount: input.amount * 100,
      currency: input.currency,
      receipt: `booklib_${input.subscriptionId.slice(0, 24)}`,
      notes: {
        libraryId: input.libraryId,
        subscriptionId: input.subscriptionId,
        planName: input.planName,
      },
    }),
  });
  const payload = (await response.json()) as RazorpayOrderResponse;
  if (!response.ok || !payload.id) {
    throw new AppError(502, payload.error?.description ?? "Razorpay order could not be created", "RAZORPAY_ORDER_FAILED");
  }

  return payload.id;
}

export async function getBillingSubscription(libraryId: string) {
  return repository().getOwnerSubscription(libraryId);
}

export async function createSubscriptionRenewal(input: {
  libraryId: string;
  planCode: keyof typeof PLAN_CATALOG;
}) {
  const db = requireDb();
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const plan = PLAN_CATALOG[input.planCode];
    const subscriptionId = await repository().ensureSubscription(client, {
      libraryId: input.libraryId,
      planCode: plan.code,
      planName: plan.name,
      amount: plan.amount,
      currency: plan.currency,
    });

    const razorpayOrderId = await createRazorpayOrder({
      libraryId: input.libraryId,
      subscriptionId,
      amount: plan.amount,
      currency: plan.currency,
      planName: plan.name,
    });
    const paymentId = await repository().createRenewalPayment(client, {
      libraryId: input.libraryId,
      subscriptionId,
      amount: plan.amount,
      currency: plan.currency,
      razorpayOrderId,
    });

    await client.query("COMMIT");

    return {
      subscriptionId,
      paymentId,
      razorpayOrderId,
      plan,
      checkout: {
        keyId: env.razorpayKeyId,
        amount: plan.amount * 100,
        currency: plan.currency,
        description: `${plan.name} renewal`,
        name: "BookLib",
        theme: {
          color: "#d2723d",
        },
        redirectUrl: `${env.webAppUrl}/owner/billing`,
        notes: {
          libraryId: input.libraryId,
          subscriptionId,
          paymentId,
        },
      },
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
