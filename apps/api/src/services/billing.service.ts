import crypto from "node:crypto";
import { env } from "../config/env";
import { requireDb } from "../lib/db";
import { BillingRepository } from "../repositories/billing.repository";

const PLAN_CATALOG = {
  STARTER_499: { code: "STARTER_499", name: "Starter 499", amount: 499, currency: "INR" },
  GROWTH_999: { code: "GROWTH_999", name: "Growth 999", amount: 999, currency: "INR" },
} as const;

function repository() {
  return new BillingRepository(requireDb());
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

    const razorpayOrderId = `order_librarypro_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
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
        name: "LibraryPro",
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
