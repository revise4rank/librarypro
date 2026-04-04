CREATE TABLE IF NOT EXISTS library_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (library_id, student_user_id)
);

CREATE INDEX IF NOT EXISTS idx_library_reviews_library_created_at
  ON library_reviews (library_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_library_reviews_student_library
  ON library_reviews (student_user_id, library_id);
