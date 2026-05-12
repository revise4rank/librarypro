import { requireDb } from "./db";
import { AppError } from "./errors";

export const entitlementFeatures = [
  "listing",
  "seat_management",
  "scanner_download",
  "subdomain",
  "website_builder",
  "ads",
  "admin_creation",
  "offers",
  "coupons",
  "reports_export",
] as const;

export type EntitlementFeature = (typeof entitlementFeatures)[number];
export type PlanCode = "TRIAL_25" | "STARTER_449_2M" | "GROWTH_999_6M";
export type PaidPlanCode = Exclude<PlanCode, "TRIAL_25">;

export type PlatformPlanConfig = {
  code: PlanCode;
  name: string;
  amount: number;
  currency: string;
  durationMonths: number;
  seatLimit: number | null;
  referralBonus: number;
  features: Record<EntitlementFeature, boolean>;
  isActive: boolean;
  sortOrder: number;
};

const fullFeatures = Object.fromEntries(entitlementFeatures.map((feature) => [feature, true])) as Record<
  EntitlementFeature,
  boolean
>;

const trialFeatures = {
  ...fullFeatures,
  subdomain: false,
  website_builder: false,
  ads: false,
  admin_creation: false,
  offers: false,
  coupons: false,
  reports_export: false,
} satisfies Record<EntitlementFeature, boolean>;

export const defaultPlatformPlans = {
  TRIAL_25: {
    code: "TRIAL_25",
    name: "Trial 25 Seats",
    amount: 0,
    currency: "INR",
    durationMonths: 0,
    seatLimit: 25,
    referralBonus: 0,
    features: trialFeatures,
    isActive: true,
    sortOrder: 10,
  },
  STARTER_449_2M: {
    code: "STARTER_449_2M",
    name: "Starter 449 - 2 Months",
    amount: 449,
    currency: "INR",
    durationMonths: 2,
    seatLimit: 100,
    referralBonus: 100,
    features: { ...fullFeatures, ads: false },
    isActive: true,
    sortOrder: 20,
  },
  GROWTH_999_6M: {
    code: "GROWTH_999_6M",
    name: "Growth 999 - 6 Months",
    amount: 999,
    currency: "INR",
    durationMonths: 6,
    seatLimit: null,
    referralBonus: 300,
    features: fullFeatures,
    isActive: true,
    sortOrder: 30,
  },
} as const satisfies Record<PlanCode, PlatformPlanConfig>;

export const paidPlanCodes = ["STARTER_449_2M", "GROWTH_999_6M"] as const;

type DbPlanRow = {
  plan_code: string;
  plan_name: string;
  amount: string;
  currency: string;
  duration_months: number;
  seat_limit: number | null;
  referral_bonus: string;
  features: Record<string, unknown> | null;
  is_active: boolean;
  sort_order: number;
};

type DbSubscriptionRow = {
  status: "TRIALING" | "ACTIVE" | "PAST_DUE" | "EXPIRED" | "CANCELLED";
  plan_code: string | null;
  grace_until: string | null;
};

function normalizePlanCode(planCode?: string | null): PlanCode {
  if (planCode === "STARTER_449_2M" || planCode === "GROWTH_999_6M" || planCode === "TRIAL_25") {
    return planCode;
  }
  if (planCode === "STARTER_499") return "STARTER_449_2M";
  if (planCode === "GROWTH_999") return "GROWTH_999_6M";
  return "TRIAL_25";
}

function normalizeFeatures(features: Record<string, unknown> | null | undefined, fallback: PlatformPlanConfig) {
  return Object.fromEntries(
    entitlementFeatures.map((feature) => [feature, Boolean(features?.[feature] ?? fallback.features[feature])]),
  ) as Record<EntitlementFeature, boolean>;
}

function rowToPlan(row: DbPlanRow): PlatformPlanConfig {
  const code = normalizePlanCode(row.plan_code);
  const fallback = defaultPlatformPlans[code];
  return {
    code,
    name: row.plan_name,
    amount: Number(row.amount),
    currency: row.currency,
    durationMonths: row.duration_months,
    seatLimit: row.seat_limit,
    referralBonus: Number(row.referral_bonus),
    features: normalizeFeatures(row.features, fallback),
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}

export function getDefaultPlatformPlan(planCode?: string | null) {
  return defaultPlatformPlans[normalizePlanCode(planCode)];
}

export async function listPlatformPlanConfigs() {
  try {
    const result = await requireDb().query<DbPlanRow>(
      `
      SELECT
        plan_code,
        plan_name,
        amount::text,
        currency,
        duration_months,
        seat_limit,
        referral_bonus::text,
        features,
        is_active,
        sort_order
      FROM platform_plan_configs
      WHERE is_active = TRUE
      ORDER BY sort_order, amount
      `,
    );
    return result.rows.map(rowToPlan);
  } catch (error) {
    if ((error as { code?: string }).code !== "42P01") throw error;
    return Object.values(defaultPlatformPlans);
  }
}

export async function getPlatformPlanConfig(planCode?: string | null) {
  const normalizedCode = normalizePlanCode(planCode);
  try {
    const result = await requireDb().query<DbPlanRow>(
      `
      SELECT
        plan_code,
        plan_name,
        amount::text,
        currency,
        duration_months,
        seat_limit,
        referral_bonus::text,
        features,
        is_active,
        sort_order
      FROM platform_plan_configs
      WHERE plan_code = $1
        AND is_active = TRUE
      LIMIT 1
      `,
      [normalizedCode],
    );
    return result.rows[0] ? rowToPlan(result.rows[0]) : defaultPlatformPlans[normalizedCode];
  } catch (error) {
    if ((error as { code?: string }).code !== "42P01") throw error;
    return defaultPlatformPlans[normalizedCode];
  }
}

export async function getLibraryEntitlements(libraryId: string) {
  const subscription = await requireDb().query<DbSubscriptionRow>(
    `
    SELECT status::text, plan_code, grace_until::text
    FROM subscriptions
    WHERE library_id = $1
    LIMIT 1
    `,
    [libraryId],
  );

  const snapshot = subscription.rows[0] ?? {
    status: "TRIALING" as const,
    plan_code: "TRIAL_25",
    grace_until: null,
  };
  const plan = await getPlatformPlanConfig(snapshot.plan_code);

  return {
    subscription: {
      status: snapshot.status,
      graceUntil: snapshot.grace_until,
      planCode: plan.code,
    },
    plan,
    features: plan.features,
  };
}

export async function requireLibraryEntitlement(libraryId: string, feature: EntitlementFeature) {
  const entitlements = await getLibraryEntitlements(libraryId);
  if (!entitlements.features[feature]) {
    throw new AppError(
      403,
      `This feature is not available on ${entitlements.plan.name}. Upgrade your plan to continue.`,
      "PLAN_FEATURE_REQUIRED",
    );
  }
  return entitlements;
}
