CREATE TABLE IF NOT EXISTS global_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(180) NOT NULL,
  author VARCHAR(140),
  class_name VARCHAR(80),
  subject VARCHAR(120),
  language VARCHAR(40),
  status VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT global_books_status_chk CHECK (status IN ('DRAFT', 'PUBLISHED', 'UNPUBLISHED'))
);

CREATE INDEX IF NOT EXISTS idx_global_books_search
  ON global_books(status, class_name, subject, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_global_books_title_author_unique
  ON global_books(title, COALESCE(author, ''));

CREATE TABLE IF NOT EXISTS global_book_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES global_books(id) ON DELETE CASCADE,
  chapter_title VARCHAR(180) NOT NULL,
  chapter_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (book_id, chapter_title)
);

CREATE INDEX IF NOT EXISTS idx_global_book_chapters_book_order
  ON global_book_chapters(book_id, chapter_order, created_at);

CREATE TABLE IF NOT EXISTS global_book_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES global_books(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES global_book_chapters(id) ON DELETE CASCADE,
  topic_title VARCHAR(180) NOT NULL,
  topic_order INTEGER NOT NULL DEFAULT 0,
  estimated_minutes INTEGER NOT NULL DEFAULT 60 CHECK (estimated_minutes > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (chapter_id, topic_title)
);

CREATE INDEX IF NOT EXISTS idx_global_book_topics_book_order
  ON global_book_topics(book_id, chapter_id, topic_order, created_at);

CREATE TABLE IF NOT EXISTS student_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES global_books(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_user_id, book_id)
);

CREATE INDEX IF NOT EXISTS idx_student_books_student_active
  ON student_books(student_user_id, is_active, added_at DESC);

ALTER TABLE topics
  ADD COLUMN IF NOT EXISTS student_book_id UUID REFERENCES student_books(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS global_book_id UUID REFERENCES global_books(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS global_book_chapter_id UUID REFERENCES global_book_chapters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS global_book_topic_id UUID REFERENCES global_book_topics(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_topics_student_global_book_topic
  ON topics(student_user_id, global_book_topic_id)
  WHERE global_book_topic_id IS NOT NULL;

ALTER TABLE student_book_requests
  ADD COLUMN IF NOT EXISTS linked_global_book_id UUID REFERENCES global_books(id) ON DELETE SET NULL;

ALTER TABLE student_book_requests
  DROP CONSTRAINT IF EXISTS student_book_requests_status_chk;

ALTER TABLE student_book_requests
  ADD CONSTRAINT student_book_requests_status_chk
  CHECK (status IN ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'FULFILLED'));
