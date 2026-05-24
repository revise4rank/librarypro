import type { Pool, PoolClient } from "pg";

export type OwnerSubscriptionSnapshot = {
  id: string | null;
  library_id: string;
  plan_code: string | null;
  plan_name: string | null;
  amount: string | null;
  currency: string | null;
  status: string | null;
  razorpay_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  renews_at: string | null;
  grace_until: string | null;
  last_payment_at: string | null;
};

export type PlatformPaymentSnapshot = {
  id: string;
  amount: string;
  currency: string;
  status: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  created_at: string;
};

export class BillingRepository {
  constructor(private readonly pool: Pool) {}

  async getOwnerSubscription(libraryId: string) {
    const subscription = await this.pool.query<OwnerSubscriptionSnapshot>(
      `
        SELECT
          s.id::text,
          s.library_id::text,
          s.plan_code,
          s.plan_name,
          s.amount::text,
          s.currency,
          s.status::text,
          s.razorpay_subscription_id,
          s.current_period_start::text,
          s.current_period_end::text,
          s.renews_at::text,
          s.grace_until::text,
          s.last_payment_at::text
        FROM subscriptions s
        WHERE s.library_id = $1
        LIMIT 1
      `,
      [libraryId],
    );

    const pendingPayments = await this.pool.query<PlatformPaymentSnapshot>(
      `
        SELECT
          pp.id::text,
          pp.amount::text,
          pp.currency,
          pp.status::text,
          pp.razorpay_order_id,
          pp.razorpay_payment_id,
          pp.created_at::text
        FROM platform_payments pp
        WHERE pp.library_id = $1
        ORDER BY pp.created_at DESC
        LIMIT 5
      `,
      [libraryId],
    );

    return {
      subscription: subscription.rows[0] ?? null,
      recentPlatformPayments: pendingPayments.rows,
    };
  }

  async ensureSubscription(client: PoolClient, input: {
    libraryId: string;
    planCode: string;
    planName: string;
    amount: number;
    currency: string;
  }) {
    const result = await client.query<{ id: string }>(
      `
        INSERT INTO subscriptions (
          library_id,
          plan_code,
          plan_name,
          amount,
          currency,
          status,
          current_period_start,
          current_period_end,
          renews_at,
          grace_until,
          updated_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          'PAST_DUE',
          NOW(),
          NOW() + INTERVAL '30 days',
          NOW() + INTERVAL '30 days',
          NOW() + INTERVAL '3 days',
          NOW()
        )
        ON CONFLICT (library_id) DO UPDATE
        SET
          plan_code = EXCLUDED.plan_code,
          plan_name = EXCLUDED.plan_name,
          amount = EXCLUDED.amount,
          currency = EXCLUDED.currency,
          updated_at = NOW()
        RETURNING id::text
      `,
      [input.libraryId, input.planCode, input.planName, input.amount, input.currency],
    );

    return result.rows[0].id;
  }

  async createRenewalPayment(client: PoolClient, input: {
    libraryId: string;
    subscriptionId: string;
    amount: number;
    currency: string;
    razorpayOrderId: string;
  }) {
    const result = await client.query<{ id: string }>(
      `
        INSERT INTO platform_payments (
          library_id,
          subscription_id,
          amount,
          currency,
          status,
          razorpay_order_id
        )
        VALUES ($1, $2, $3, $4, 'PENDING', $5)
        RETURNING id::text
      `,
      [input.libraryId, input.subscriptionId, input.amount, input.currency, input.razorpayOrderId],
    );

    return result.rows[0].id;
  }
}
