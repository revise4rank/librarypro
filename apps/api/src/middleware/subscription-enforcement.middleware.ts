import type { NextFunction, Request, Response } from "express";
import { requireDb } from "../lib/db";
import { AppError } from "../lib/errors";
import { type EntitlementFeature, getLibraryEntitlements } from "../lib/platform-plans";

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

const FEATURE_GATES: Array<{ pattern: RegExp; methods?: string[]; feature: EntitlementFeature }> = [
  { pattern: /^\/v1\/owner\/public-profile$/, methods: ["POST", "PATCH"], feature: "website_builder" },
  { pattern: /^\/v1\/owner\/public-profile\/uploads$/, methods: ["POST"], feature: "listing" },
  { pattern: /^\/v1\/owner\/admins(?:\/|$)/, methods: ["POST", "DELETE", "PATCH"], feature: "admin_creation" },
  { pattern: /^\/v1\/owner\/coupons(?:\/|$)/, methods: ["POST", "PATCH"], feature: "coupons" },
  { pattern: /^\/v1\/owner\/offers$/, methods: ["POST"], feature: "offers" },
  { pattern: /^\/v1\/owner\/reports\/export$/, methods: ["GET"], feature: "reports_export" },
  { pattern: /^\/v1\/owner\/campaigns\/due-recovery$/, methods: ["POST"], feature: "ads" },
];

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

  const row = result.rows[0];
  return row ? { status: row.status, graceUntil: row.grace_until } : { status: "EXPIRED", graceUntil: null };
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

    const gate = FEATURE_GATES.find((candidate) => {
      const methodMatches = !candidate.methods || candidate.methods.includes(req.method);
      return methodMatches && candidate.pattern.test(req.path);
    });
    if (gate) {
      const entitlements = await getLibraryEntitlements(req.tenant.libraryId);
      if (!entitlements.features[gate.feature]) {
        throw new AppError(
          403,
          `This feature is not available on ${entitlements.plan.name}. Upgrade your plan to continue.`,
          "PLAN_FEATURE_REQUIRED",
        );
      }
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
