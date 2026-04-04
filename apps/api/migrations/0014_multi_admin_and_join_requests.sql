CREATE TABLE IF NOT EXISTS library_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_via VARCHAR(20) NOT NULL DEFAULT 'QR',
  request_qr_key_id UUID,
  seat_preference VARCHAR(40),
  message TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  linked_assignment_id UUID REFERENCES student_assignments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT library_join_requests_status_chk CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
  CONSTRAINT library_join_requests_requested_via_chk CHECK (requested_via IN ('QR', 'MANUAL', 'MARKETPLACE', 'SELF_SERVICE'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_library_join_requests_pending
  ON library_join_requests(library_id, student_user_id)
  WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_library_join_requests_library_status
  ON library_join_requests(library_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_library_join_requests_student
  ON library_join_requests(student_user_id, created_at DESC);
