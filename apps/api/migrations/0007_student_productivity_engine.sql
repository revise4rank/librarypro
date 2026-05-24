ALTER TABLE student_focus_sessions
  DROP CONSTRAINT IF EXISTS student_focus_sessions_type_chk;

ALTER TABLE student_focus_sessions
  ADD CONSTRAINT student_focus_sessions_type_chk
  CHECK (session_type IN ('POMODORO', 'MANUAL', 'FOCUS_MODE'));

CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(120) NOT NULL,
  color_hex VARCHAR(7),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subjects_student_created
  ON subjects(student_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(180) NOT NULL,
  topic_order INTEGER NOT NULL DEFAULT 0,
  estimated_minutes INTEGER NOT NULL DEFAULT 60 CHECK (estimated_minutes > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_topics_subject_order
  ON topics(subject_id, topic_order, created_at);

CREATE TABLE IF NOT EXISTS student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED')),
  progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  completed_at TIMESTAMPTZ,
  last_studied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_user_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_student_progress_student_status
  ON student_progress(student_user_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS student_library_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  library_id UUID NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  login_id VARCHAR(40) NOT NULL,
  password_issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_user_id, library_id),
  UNIQUE (library_id, login_id)
);

CREATE INDEX IF NOT EXISTS idx_student_library_mapping_active
  ON student_library_mapping(student_user_id, is_active, joined_at DESC);

CREATE TABLE IF NOT EXISTS attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  checkin_id UUID REFERENCES checkins(id) ON DELETE SET NULL,
  attendance_date DATE NOT NULL,
  entry_time TIMESTAMPTZ NOT NULL,
  exit_time TIMESTAMPTZ,
  total_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (library_id, student_user_id, attendance_date, entry_time)
);

CREATE INDEX IF NOT EXISTS idx_attendance_logs_library_student_date
  ON attendance_logs(library_id, student_user_id, attendance_date DESC);

INSERT INTO student_library_mapping (student_user_id, library_id, login_id, is_active, joined_at)
SELECT DISTINCT
  sa.student_user_id,
  sa.library_id,
  COALESCE(u.student_code, u.email, u.phone, 'student-' || substr(u.id::text, 1, 8)) AS login_id,
  TRUE,
  sa.created_at
FROM student_assignments sa
INNER JOIN users u ON u.id = sa.student_user_id
ON CONFLICT (student_user_id, library_id) DO NOTHING;

INSERT INTO attendance_logs (library_id, student_user_id, checkin_id, attendance_date, entry_time, exit_time, total_minutes)
SELECT
  c.library_id,
  c.student_user_id,
  c.id,
  c.checked_in_at::date,
  c.checked_in_at,
  c.checked_out_at,
  CASE
    WHEN c.checked_out_at IS NULL THEN NULL
    ELSE GREATEST(0, floor(extract(epoch FROM (c.checked_out_at - c.checked_in_at)) / 60))::int
  END
FROM checkins c
ON CONFLICT (library_id, student_user_id, attendance_date, entry_time) DO NOTHING;
