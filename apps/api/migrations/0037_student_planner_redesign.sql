-- Migration 0037: richer student planner without breaking old entries
ALTER TABLE study_plan_entries
  ADD COLUMN IF NOT EXISTS title VARCHAR(180),
  ADD COLUMN IF NOT EXISTS chapter_topic VARCHAR(220),
  ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS deadline_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS start_time TIME,
  ADD COLUMN IF NOT EXISTS end_time TIME,
  ADD COLUMN IF NOT EXISTS task_type VARCHAR(30) NOT NULL DEFAULT 'STUDY',
  ADD COLUMN IF NOT EXISTS source_type VARCHAR(30) NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS carry_forward_from_id UUID REFERENCES study_plan_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS revision_stage INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_revised_at TIMESTAMPTZ;

UPDATE study_plan_entries
SET
  title = COALESCE(NULLIF(title, ''), subject, 'Study task'),
  status = CASE WHEN completed THEN 'COMPLETED' ELSE status END
WHERE title IS NULL OR title = '' OR completed = true;

CREATE INDEX IF NOT EXISTS idx_study_plan_user_status_date
  ON study_plan_entries(student_user_id, status, plan_date);

CREATE TABLE IF NOT EXISTS study_planner_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_type VARCHAR(20) NOT NULL CHECK (goal_type IN ('WEEKLY', 'MONTHLY')),
  period_start DATE NOT NULL,
  title VARCHAR(180) NOT NULL,
  subject VARCHAR(150),
  target_minutes INTEGER NOT NULL DEFAULT 0,
  target_tasks INTEGER NOT NULL DEFAULT 0,
  completed_tasks INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_planner_goals_user_period
  ON study_planner_goals(student_user_id, goal_type, period_start);

CREATE TABLE IF NOT EXISTS study_planner_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  color VARCHAR(20) NOT NULL DEFAULT 'YELLOW',
  pinned BOOLEAN NOT NULL DEFAULT false,
  pos_x INTEGER NOT NULL DEFAULT 0,
  pos_y INTEGER NOT NULL DEFAULT 0,
  width INTEGER NOT NULL DEFAULT 220,
  height INTEGER NOT NULL DEFAULT 140,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_planner_notes_user
  ON study_planner_notes(student_user_id, pinned DESC, updated_at DESC);

CREATE TABLE IF NOT EXISTS study_planner_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(180) NOT NULL,
  exam_at TIMESTAMPTZ NOT NULL,
  subject VARCHAR(150),
  priority VARCHAR(20) NOT NULL DEFAULT 'HIGH',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_planner_exams_user_time
  ON study_planner_exams(student_user_id, exam_at);

CREATE TABLE IF NOT EXISTS study_planner_habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  habit_date DATE NOT NULL,
  studied BOOLEAN NOT NULL DEFAULT false,
  water BOOLEAN NOT NULL DEFAULT false,
  sleep BOOLEAN NOT NULL DEFAULT false,
  exercise BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_user_id, habit_date)
);

CREATE INDEX IF NOT EXISTS idx_study_planner_habits_user_date
  ON study_planner_habits(student_user_id, habit_date);
