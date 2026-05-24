-- Migration 0021: Student book tracker (My Book personal reading list)

DO $$ BEGIN
  CREATE TYPE book_status AS ENUM ('READING', 'COMPLETED', 'WISHLIST', 'DROPPED');
EXCEPTION WHEN duplicate_object THEN null;
END; $$;

CREATE TABLE IF NOT EXISTS student_personal_books (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  library_id       UUID REFERENCES libraries(id) ON DELETE SET NULL,
  title            VARCHAR(200) NOT NULL,
  author           VARCHAR(150),
  status           book_status NOT NULL DEFAULT 'READING',
  total_pages      INT,
  current_page     INT NOT NULL DEFAULT 0,
  notes            TEXT,
  started_at       DATE,
  finished_at      DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_personal_books_user ON student_personal_books(student_user_id);
CREATE INDEX IF NOT EXISTS idx_student_personal_books_user_status ON student_personal_books(student_user_id, status);
