CREATE TABLE IF NOT EXISTS library_migration_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  file_name TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_count INTEGER NOT NULL DEFAULT 0,
  warning_count INTEGER NOT NULL DEFAULT 0,
  committed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_library_migration_jobs_status CHECK (status IN ('DRAFT', 'COMMITTING', 'COMMITTED', 'FAILED'))
);

CREATE TABLE IF NOT EXISTS library_migration_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES library_migration_jobs(id) ON DELETE CASCADE,
  library_id UUID NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  normalized_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  row_fingerprint TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  action VARCHAR(40),
  errors TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  warnings TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_library_migration_rows_status CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'SKIPPED'))
);

CREATE INDEX IF NOT EXISTS idx_library_migration_jobs_library_created
  ON library_migration_jobs(library_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_library_migration_rows_job_row
  ON library_migration_rows(job_id, row_number);

CREATE INDEX IF NOT EXISTS idx_library_migration_rows_job_status
  ON library_migration_rows(job_id, status);

ALTER TABLE student_assignments
  ADD COLUMN IF NOT EXISTS migration_job_id UUID REFERENCES library_migration_jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS migration_row_id UUID REFERENCES library_migration_rows(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS migration_source_fingerprint TEXT;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS migration_job_id UUID REFERENCES library_migration_jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS migration_row_id UUID REFERENCES library_migration_rows(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS migration_source_fingerprint TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_migration_fingerprint
  ON payments(library_id, migration_source_fingerprint)
  WHERE migration_source_fingerprint IS NOT NULL;
