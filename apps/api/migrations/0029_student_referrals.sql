CREATE TABLE IF NOT EXISTS student_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'QUALIFIED', 'PAID', 'REJECTED')),
  bonus_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  qualified_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (referred_student_user_id)
);

CREATE INDEX IF NOT EXISTS idx_student_referrals_referrer
  ON student_referrals(referrer_student_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_referrals_status
  ON student_referrals(status, created_at DESC);
