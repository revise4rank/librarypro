-- Migration 0022: Study planner (daily plan entries per student)

CREATE TABLE IF NOT EXISTS study_plan_entries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_date        DATE NOT NULL,
  subject          VARCHAR(150),
  target_minutes   INT NOT NULL DEFAULT 60,
  actual_minutes   INT NOT NULL DEFAULT 0,
  notes            TEXT,
  completed        BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_plan_user_date ON study_plan_entries(student_user_id, plan_date);
CREATE INDEX IF NOT EXISTS idx_study_plan_user_month ON study_plan_entries(student_user_id, DATE_TRUNC('month', plan_date));
