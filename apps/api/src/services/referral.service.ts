import { requireDb } from "../lib/db";
import type { PoolClient } from "pg";

export async function qualifyReferralForLibrary(input: {
  libraryId: string;
  planCode: string;
  bonusAmount: number;
}) {
  if (input.bonusAmount <= 0) return null;
  const result = await requireDb().query(
    `
    UPDATE library_referrals
    SET status = CASE WHEN status = 'PAID' THEN status ELSE 'QUALIFIED' END,
        plan_code = $2,
        bonus_amount = $3,
        qualified_at = COALESCE(qualified_at, NOW()),
        updated_at = NOW()
    WHERE referred_library_id = $1
      AND status IN ('PENDING', 'QUALIFIED')
    RETURNING id::text, status, bonus_amount::text
    `,
    [input.libraryId, input.planCode, input.bonusAmount],
  );
  return result.rows[0] ?? null;
}

export async function qualifyReferralForPaidPlatformPayment(client: PoolClient, input: {
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
}) {
  if (!input.razorpayOrderId && !input.razorpayPaymentId) return null;
  const payment = await client.query<{
    library_id: string;
    plan_code: string | null;
    referral_bonus: string;
  }>(
    `
    SELECT
      pp.library_id::text,
      s.plan_code,
      COALESCE(pc.referral_bonus, 0)::text AS referral_bonus
    FROM platform_payments pp
    INNER JOIN subscriptions s ON s.id = pp.subscription_id
    LEFT JOIN platform_plan_configs pc ON pc.plan_code = s.plan_code
    WHERE pp.razorpay_order_id = COALESCE($1, pp.razorpay_order_id)
       OR pp.razorpay_payment_id = COALESCE($2, pp.razorpay_payment_id)
    ORDER BY pp.created_at DESC
    LIMIT 1
    `,
    [input.razorpayOrderId ?? null, input.razorpayPaymentId ?? null],
  );
  const row = payment.rows[0];
  if (!row || !row.plan_code || Number(row.referral_bonus) <= 0) return null;
  const result = await client.query(
    `
    UPDATE library_referrals
    SET status = CASE WHEN status = 'PAID' THEN status ELSE 'QUALIFIED' END,
        plan_code = $2,
        bonus_amount = $3,
        qualified_at = COALESCE(qualified_at, NOW()),
        updated_at = NOW()
    WHERE referred_library_id = $1
      AND status IN ('PENDING', 'QUALIFIED')
    RETURNING id::text, status, bonus_amount::text
    `,
    [row.library_id, row.plan_code, Number(row.referral_bonus)],
  );
  return result.rows[0] ?? null;
}

export async function getOwnerReferralDashboard(libraryId: string) {
  const codeResult = await requireDb().query<{ slug: string; name: string }>(
    `SELECT slug, name FROM libraries WHERE id = $1 LIMIT 1`,
    [libraryId],
  );

  const referrals = await requireDb().query(
    `
    SELECT
      lr.id::text,
      lr.referral_code,
      lr.plan_code,
      lr.bonus_amount::text,
      lr.status,
      lr.qualified_at::text,
      lr.paid_at::text,
      lr.created_at::text,
      referred.name AS referred_library_name,
      referred.city AS referred_library_city
    FROM library_referrals lr
    INNER JOIN libraries referred ON referred.id = lr.referred_library_id
    WHERE lr.referrer_library_id = $1
    ORDER BY lr.created_at DESC
    `,
    [libraryId],
  );

  const referredBy = await requireDb().query(
    `
    SELECT
      lr.id::text,
      lr.referral_code,
      lr.plan_code,
      lr.bonus_amount::text,
      lr.status,
      lr.qualified_at::text,
      lr.paid_at::text,
      lr.created_at::text,
      referrer.name AS referrer_library_name
    FROM library_referrals lr
    INNER JOIN libraries referrer ON referrer.id = lr.referrer_library_id
    WHERE lr.referred_library_id = $1
    ORDER BY lr.created_at DESC
    LIMIT 1
    `,
    [libraryId],
  );

  const summary = referrals.rows.reduce(
    (acc, row) => {
      const amount = Number(row.bonus_amount ?? 0);
      acc.total += amount;
      if (row.status === "QUALIFIED") acc.qualified += amount;
      if (row.status === "PAID") acc.paid += amount;
      return acc;
    },
    { total: 0, qualified: 0, paid: 0 },
  );

  return {
    referralCode: codeResult.rows[0]?.slug ?? "",
    libraryName: codeResult.rows[0]?.name ?? "",
    summary,
    referrals: referrals.rows,
    referredBy: referredBy.rows[0] ?? null,
  };
}

export async function listAdminReferrals() {
  const result = await requireDb().query(
    `
    SELECT
      lr.id::text,
      lr.referral_code,
      lr.plan_code,
      lr.bonus_amount::text,
      lr.status,
      lr.qualified_at::text,
      lr.paid_at::text,
      lr.created_at::text,
      referrer.name AS referrer_library_name,
      referred.name AS referred_library_name,
      referred.city AS referred_library_city
    FROM library_referrals lr
    INNER JOIN libraries referrer ON referrer.id = lr.referrer_library_id
    INNER JOIN libraries referred ON referred.id = lr.referred_library_id
    ORDER BY lr.created_at DESC
    LIMIT 200
    `,
  );
  return result.rows;
}

export async function updateAdminReferralStatus(input: {
  referralId: string;
  status: "PENDING" | "QUALIFIED" | "PAID" | "REJECTED";
}) {
  const result = await requireDb().query(
    `
    UPDATE library_referrals
    SET status = $2,
        paid_at = CASE WHEN $2 = 'PAID' THEN NOW() ELSE paid_at END,
        updated_at = NOW()
    WHERE id = $1
    RETURNING id::text, status, paid_at::text
    `,
    [input.referralId, input.status],
  );
  return result.rows[0] ?? null;
}

export async function getStudentReferralDashboard(studentUserId: string) {
  const codeResult = await requireDb().query<{ student_code: string | null; full_name: string }>(
    `SELECT student_code, full_name FROM users WHERE id = $1 LIMIT 1`,
    [studentUserId],
  );

  const referrals = await requireDb().query(
    `
    SELECT
      sr.id::text,
      sr.referral_code,
      sr.bonus_amount::text,
      sr.status,
      sr.qualified_at::text,
      sr.paid_at::text,
      sr.created_at::text,
      referred.full_name AS referred_student_name,
      referred.student_code AS referred_student_code
    FROM student_referrals sr
    INNER JOIN users referred ON referred.id = sr.referred_student_user_id
    WHERE sr.referrer_student_user_id = $1
    ORDER BY sr.created_at DESC
    LIMIT 100
    `,
    [studentUserId],
  );

  const referredBy = await requireDb().query(
    `
    SELECT
      sr.id::text,
      sr.referral_code,
      sr.bonus_amount::text,
      sr.status,
      sr.created_at::text,
      referrer.full_name AS referrer_student_name,
      referrer.student_code AS referrer_student_code
    FROM student_referrals sr
    INNER JOIN users referrer ON referrer.id = sr.referrer_student_user_id
    WHERE sr.referred_student_user_id = $1
    ORDER BY sr.created_at DESC
    LIMIT 1
    `,
    [studentUserId],
  );

  const summary = referrals.rows.reduce(
    (acc, row) => {
      const amount = Number(row.bonus_amount ?? 0);
      acc.total += amount;
      if (row.status === "QUALIFIED") acc.qualified += amount;
      if (row.status === "PAID") acc.paid += amount;
      return acc;
    },
    { total: 0, qualified: 0, paid: 0 },
  );

  return {
    referralCode: codeResult.rows[0]?.student_code ?? "",
    studentName: codeResult.rows[0]?.full_name ?? "",
    summary,
    referrals: referrals.rows,
    referredBy: referredBy.rows[0] ?? null,
  };
}

export async function listAdminStudentReferrals() {
  const result = await requireDb().query(
    `
    SELECT
      sr.id::text,
      sr.referral_code,
      sr.bonus_amount::text,
      sr.status,
      sr.qualified_at::text,
      sr.paid_at::text,
      sr.created_at::text,
      referrer.full_name AS referrer_student_name,
      referrer.student_code AS referrer_student_code,
      referred.full_name AS referred_student_name,
      referred.student_code AS referred_student_code
    FROM student_referrals sr
    INNER JOIN users referrer ON referrer.id = sr.referrer_student_user_id
    INNER JOIN users referred ON referred.id = sr.referred_student_user_id
    ORDER BY sr.created_at DESC
    LIMIT 200
    `,
  );
  return result.rows;
}

export async function updateAdminStudentReferralStatus(input: {
  referralId: string;
  status: "PENDING" | "QUALIFIED" | "PAID" | "REJECTED";
  bonusAmount?: number;
}) {
  const result = await requireDb().query(
    `
    UPDATE student_referrals
    SET status = $2,
        bonus_amount = COALESCE($3, bonus_amount),
        qualified_at = CASE WHEN $2 = 'QUALIFIED' THEN COALESCE(qualified_at, NOW()) ELSE qualified_at END,
        paid_at = CASE WHEN $2 = 'PAID' THEN NOW() ELSE paid_at END,
        updated_at = NOW()
    WHERE id = $1
    RETURNING id::text, status, bonus_amount::text, paid_at::text
    `,
    [input.referralId, input.status, input.bonusAmount ?? null],
  );
  return result.rows[0] ?? null;
}
