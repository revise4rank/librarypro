DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'discount_type') THEN
    CREATE TYPE discount_type AS ENUM ('PERCENTAGE', 'FLAT');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS library_student_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  target_audience VARCHAR(150),
  description TEXT,
  duration_months INTEGER NOT NULL DEFAULT 1 CHECK (duration_months > 0),
  base_amount NUMERIC(10,2) NOT NULL CHECK (base_amount >= 0),
  default_discount_type discount_type,
  default_discount_value NUMERIC(10,2),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_library_student_plans_library_active
  ON library_student_plans(library_id, is_active, created_at DESC);

CREATE TABLE IF NOT EXISTS library_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  student_plan_id UUID REFERENCES library_student_plans(id) ON DELETE SET NULL,
  code VARCHAR(60) NOT NULL,
  discount_type discount_type NOT NULL,
  discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value >= 0),
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  usage_limit INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_library_coupon_code UNIQUE (library_id, code)
);

CREATE INDEX IF NOT EXISTS idx_library_coupons_library_active
  ON library_coupons(library_id, is_active, created_at DESC);

ALTER TABLE student_assignments
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS class_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS preparing_for VARCHAR(150),
  ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(20),
  ADD COLUMN IF NOT EXISTS student_plan_id UUID REFERENCES library_student_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS base_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS discount_type discount_type,
  ADD COLUMN IF NOT EXISTS discount_value NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(60),
  ADD COLUMN IF NOT EXISTS final_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS aadhaar_document_url TEXT,
  ADD COLUMN IF NOT EXISTS school_id_document_url TEXT,
  ADD COLUMN IF NOT EXISTS admission_source VARCHAR(30) NOT NULL DEFAULT 'DESK';

CREATE INDEX IF NOT EXISTS idx_student_assignments_library_plan
  ON student_assignments(library_id, student_plan_id);
