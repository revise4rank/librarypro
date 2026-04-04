CREATE TABLE IF NOT EXISTS revision_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  library_id UUID REFERENCES libraries(id) ON DELETE SET NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  source_type VARCHAR(20) NOT NULL DEFAULT 'AUTO',
  revision_stage INTEGER NOT NULL DEFAULT 1,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  priority_score INTEGER NOT NULL DEFAULT 50,
  last_reminded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (student_user_id, topic_id, revision_stage, source_type)
);

CREATE INDEX IF NOT EXISTS idx_revision_schedules_student_lookup
  ON revision_schedules(student_user_id, status, scheduled_for);

CREATE TABLE IF NOT EXISTS revision_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_schedule_id UUID REFERENCES revision_schedules(id) ON DELETE SET NULL,
  student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  minutes_spent INTEGER NOT NULL DEFAULT 0,
  confidence_score INTEGER NOT NULL DEFAULT 3,
  result_status VARCHAR(20) NOT NULL DEFAULT 'DONE',
  revised_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_revision_logs_student_lookup
  ON revision_logs(student_user_id, revised_at DESC);

CREATE TABLE IF NOT EXISTS student_feed_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  library_id UUID REFERENCES libraries(id) ON DELETE SET NULL,
  event_type VARCHAR(40) NOT NULL,
  visibility VARCHAR(20) NOT NULL DEFAULT 'LIBRARY_MEMBERS',
  actor_name VARCHAR(150) NOT NULL,
  title VARCHAR(180) NOT NULL,
  body TEXT NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_feed_posts_library_created
  ON student_feed_posts(library_id, created_at DESC);

CREATE TABLE IF NOT EXISTS feed_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_post_id UUID NOT NULL REFERENCES student_feed_posts(id) ON DELETE CASCADE,
  student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (feed_post_id, student_user_id)
);

CREATE TABLE IF NOT EXISTS feed_visibility_settings (
  student_user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  default_visibility VARCHAR(20) NOT NULL DEFAULT 'LIBRARY_MEMBERS',
  allow_subject_completion_posts BOOLEAN NOT NULL DEFAULT TRUE,
  allow_focus_posts BOOLEAN NOT NULL DEFAULT TRUE,
  allow_streak_posts BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
