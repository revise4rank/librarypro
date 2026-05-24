-- Reusable plan templates per library.
-- Types: MONTHLY (duration in months), DAILY (duration in days), SHIFT (time-of-day slot).

CREATE TYPE plan_type AS ENUM ('MONTHLY', 'DAILY', 'SHIFT');

CREATE TABLE IF NOT EXISTS plan_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  type plan_type NOT NULL DEFAULT 'MONTHLY',
  duration_months INT,
  duration_days INT,
  shift_name VARCHAR(80),
  shift_start_hour SMALLINT CHECK (shift_start_hour BETWEEN 0 AND 23),
  shift_end_hour SMALLINT CHECK (shift_end_hour BETWEEN 0 AND 23),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plan_templates_library ON plan_templates(library_id) WHERE is_active = true;
