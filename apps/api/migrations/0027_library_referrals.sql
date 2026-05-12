CREATE TABLE IF NOT EXISTS library_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_library_id UUID NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  referred_library_id UUID NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  referral_code VARCHAR(120) NOT NULL,
  plan_code VARCHAR(80),
  bonus_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  qualified_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (referred_library_id),
  CONSTRAINT library_referrals_status_chk CHECK (status IN ('PENDING', 'QUALIFIED', 'PAID', 'REJECTED'))
);

CREATE INDEX IF NOT EXISTS idx_library_referrals_referrer
  ON library_referrals(referrer_library_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_library_referrals_referred
  ON library_referrals(referred_library_id);
