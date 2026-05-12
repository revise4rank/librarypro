CREATE TABLE IF NOT EXISTS student_book_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  library_id UUID REFERENCES libraries(id) ON DELETE SET NULL,
  title VARCHAR(180) NOT NULL,
  author VARCHAR(140),
  class_name VARCHAR(80),
  subject VARCHAR(120),
  message TEXT,
  toc_image_url TEXT,
  status VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  reviewed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT student_book_requests_status_chk CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'FULFILLED'))
);

CREATE INDEX IF NOT EXISTS idx_student_book_requests_student
  ON student_book_requests(student_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_book_requests_library_status
  ON student_book_requests(library_id, status, created_at DESC);
