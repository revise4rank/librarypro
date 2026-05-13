import { env } from "../config/env";
import { requireDb } from "../lib/db";
import { AppError } from "../lib/errors";
import { getPlatformPlanConfig, listPlatformPlanConfigs } from "../lib/platform-plans";
import { BillingRepository } from "../repositories/billing.repository";
import { getPlatformIntegrationSettings } from "./platform-integrations.service";

function repository() {
  return new BillingRepository(requireDb());
}

type RazorpayOrderResponse = {
  id?: string;
  error?: {
    description?: string;
  };
};

function ensureRazorpayConfigured(settings: { razorpayKeyId: string; razorpayKeySecret: string }) {
  if (!settings.razorpayKeyId || !settings.razorpayKeySecret) {
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
  const integrations = await getPlatformIntegrationSettings();
  ensureRazorpayConfigured(integrations);
  const auth = Buffer.from(`${integrations.razorpayKeyId}:${integrations.razorpayKeySecret}`).toString("base64");
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
  const [billing, plans] = await Promise.all([repository().getOwnerSubscription(libraryId), listPlatformPlanConfigs()]);
  return {
    ...billing,
    availablePlans: plans.filter((plan) => plan.code !== "TRIAL_25"),
  };
}

export async function createSubscriptionRenewal(input: {
  libraryId: string;
  planCode: string;
}) {
  const db = requireDb();
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const plan = await getPlatformPlanConfig(input.planCode);
    if (plan.code === "TRIAL_25" || plan.amount <= 0 || !plan.isActive) {
      throw new AppError(400, "Choose an active paid platform plan.", "PAID_PLAN_REQUIRED");
    }
    const subscriptionId = await repository().ensureSubscription(client, {
      libraryId: input.libraryId,
      planCode: plan.code,
      planName: plan.name,
      amount: plan.amount,
      currency: plan.currency,
      durationMonths: plan.durationMonths,
    });

    const integrations = await getPlatformIntegrationSettings();
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
        keyId: integrations.razorpayKeyId,
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
