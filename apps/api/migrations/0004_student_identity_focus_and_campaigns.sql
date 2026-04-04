ALTER TABLE users
  ADD COLUMN IF NOT EXISTS student_code VARCHAR(40) UNIQUE;

ALTER TABLE libraries_public_profiles
  ADD COLUMN IF NOT EXISTS offer_expires_at TIMESTAMPTZ;

ALTER TABLE library_contact_leads
  ADD COLUMN IF NOT EXISTS assignee_label VARCHAR(120) NOT NULL DEFAULT 'Owner Desk',
  ADD COLUMN IF NOT EXISTS follow_up_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS student_focus_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  daily_target_minutes INTEGER NOT NULL DEFAULT 180 CHECK (daily_target_minutes > 0),
  weekly_target_hours INTEGER NOT NULL DEFAULT 28 CHECK (weekly_target_hours > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_focus_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_name VARCHAR(120) NOT NULL,
  topic_name VARCHAR(180),
  target_minutes INTEGER NOT NULL DEFAULT 120 CHECK (target_minutes > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_focus_subjects_student_active
  ON student_focus_subjects(student_user_id, is_active, created_at DESC);

CREATE TABLE IF NOT EXISTS student_focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES student_focus_subjects(id) ON DELETE SET NULL,
  topic_title VARCHAR(180),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  session_type VARCHAR(20) NOT NULL DEFAULT 'POMODORO',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT student_focus_sessions_type_chk CHECK (session_type IN ('POMODORO', 'MANUAL'))
);

CREATE INDEX IF NOT EXISTS idx_student_focus_sessions_student_completed
  ON student_focus_sessions(student_user_id, completed_at DESC);
