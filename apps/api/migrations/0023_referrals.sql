-- Migration 0023: Referral system (student referral codes)

CREATE TABLE IF NOT EXISTS referral_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code        VARCHAR(20) NOT NULL UNIQUE,
  role        VARCHAR(20) NOT NULL CHECK (role IN ('student', 'owner')),
  library_id  UUID REFERENCES libraries(id) ON DELETE CASCADE,
  uses_count  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);

CREATE TABLE IF NOT EXISTS referral_uses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id  UUID NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
  referred_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (referral_code_id, referred_user_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_uses_code ON referral_uses(referral_code_id);
