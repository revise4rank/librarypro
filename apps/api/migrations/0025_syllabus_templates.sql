ALTER TABLE subjects
  ADD COLUMN IF NOT EXISTS class_name VARCHAR(80);

CREATE INDEX IF NOT EXISTS idx_subjects_student_class
  ON subjects(student_user_id, class_name, created_at DESC);

CREATE TABLE IF NOT EXISTS global_syllabus_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_name VARCHAR(80) NOT NULL,
  subject_title VARCHAR(120) NOT NULL,
  color_hex VARCHAR(7),
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (class_name, subject_title)
);

CREATE TABLE IF NOT EXISTS global_syllabus_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  global_subject_id UUID NOT NULL REFERENCES global_syllabus_subjects(id) ON DELETE CASCADE,
  topic_title VARCHAR(180) NOT NULL,
  topic_order INTEGER NOT NULL DEFAULT 0,
  estimated_minutes INTEGER NOT NULL DEFAULT 60 CHECK (estimated_minutes > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (global_subject_id, topic_title)
);

CREATE INDEX IF NOT EXISTS idx_global_syllabus_subjects_class
  ON global_syllabus_subjects(class_name, subject_title);

CREATE INDEX IF NOT EXISTS idx_global_syllabus_topics_subject_order
  ON global_syllabus_topics(global_subject_id, topic_order, created_at);
