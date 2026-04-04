import type { NextFunction, Request, Response } from "express";
import { requireDb } from "../lib/db";
import { AppError } from "../lib/errors";

const ALLOWLIST = [
  /^\/v1\/auth\//,
  /^\/v1\/billing\/subscription\/renew$/,
  /^\/v1\/billing\/subscription$/,
  /^\/v1\/billing\/razorpay\/webhook$/,
];

type SubscriptionSnapshot = {
  status: "TRIALING" | "ACTIVE" | "PAST_DUE" | "EXPIRED" | "CANCELLED";
  graceUntil?: string | null;
};

async function getTenantSubscription(_libraryId: string): Promise<SubscriptionSnapshot> {
  const result = await requireDb().query<{
    status: SubscriptionSnapshot["status"];
    grace_until: string | null;
  }>(
    `
    SELECT status::text, grace_until::text
    FROM subscriptions
    WHERE library_id = $1
    LIMIT 1
    `,
    [_libraryId],
  );

  return result.rows[0] ?? { status: "EXPIRED", graceUntil: null };
}

export async function subscriptionEnforcementMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    if (!req.tenant || !req.auth) {
      return next();
    }

    if (req.auth.role !== "LIBRARY_OWNER") {
      return next();
    }

    if (ALLOWLIST.some((pattern) => pattern.test(req.path))) {
      return next();
    }

    const subscription = await getTenantSubscription(req.tenant.libraryId);
    const graceActive =
      subscription.graceUntil && new Date(subscription.graceUntil).getTime() > Date.now();

    if (subscription.status === "ACTIVE" || subscription.status === "TRIALING" || graceActive) {
      return next();
    }

    throw new AppError(
      402,
      "Subscription expired. Renew your plan to continue using owner features.",
      "SUBSCRIPTION_REQUIRED",
    );
  } catch (error) {
    return next(error);
  }
}
