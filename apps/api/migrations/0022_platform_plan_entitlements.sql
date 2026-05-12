CREATE TABLE IF NOT EXISTS platform_plan_configs (
  plan_code VARCHAR(60) PRIMARY KEY,
  plan_name VARCHAR(120) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(8) NOT NULL DEFAULT 'INR',
  duration_months INTEGER NOT NULL DEFAULT 0,
  seat_limit INTEGER,
  referral_bonus NUMERIC(12, 2) NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO platform_plan_configs (
  plan_code,
  plan_name,
  amount,
  currency,
  duration_months,
  seat_limit,
  referral_bonus,
  features,
  is_active,
  sort_order
)
VALUES
  (
    'TRIAL_25',
    'Trial 25 Seats',
    0,
    'INR',
    0,
    25,
    0,
    '{
      "listing": true,
      "seat_management": true,
      "scanner_download": true,
      "subdomain": false,
      "website_builder": false,
      "ads": false,
      "admin_creation": false,
      "offers": false,
      "coupons": false,
      "reports_export": false
    }'::jsonb,
    true,
    10
  ),
  (
    'STARTER_449_2M',
    'Starter 449 - 2 Months',
    449,
    'INR',
    2,
    100,
    100,
    '{
      "listing": true,
      "seat_management": true,
      "scanner_download": true,
      "subdomain": true,
      "website_builder": true,
      "ads": false,
      "admin_creation": true,
      "offers": true,
      "coupons": true,
      "reports_export": true
    }'::jsonb,
    true,
    20
  ),
  (
    'GROWTH_999_6M',
    'Growth 999 - 6 Months',
    999,
    'INR',
    6,
    NULL,
    300,
    '{
      "listing": true,
      "seat_management": true,
      "scanner_download": true,
      "subdomain": true,
      "website_builder": true,
      "ads": true,
      "admin_creation": true,
      "offers": true,
      "coupons": true,
      "reports_export": true
    }'::jsonb,
    true,
    30
  )
ON CONFLICT (plan_code) DO UPDATE
SET
  plan_name = EXCLUDED.plan_name,
  amount = EXCLUDED.amount,
  currency = EXCLUDED.currency,
  duration_months = EXCLUDED.duration_months,
  seat_limit = EXCLUDED.seat_limit,
  referral_bonus = EXCLUDED.referral_bonus,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

UPDATE subscriptions
SET
  plan_code = 'TRIAL_25',
  plan_name = 'Trial 25 Seats',
  amount = 0,
  currency = 'INR',
  status = CASE WHEN status = 'ACTIVE' THEN 'TRIALING'::subscription_status ELSE status END,
  updated_at = NOW()
WHERE plan_code IN ('STARTER_TRIAL', 'TRIAL', 'FREE_TRIAL');
