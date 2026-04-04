CREATE INDEX IF NOT EXISTS idx_student_assignments_library_status_created
  ON student_assignments (library_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_assignments_library_payment_end
  ON student_assignments (library_id, payment_status, ends_at);

CREATE INDEX IF NOT EXISTS idx_payments_library_status_paid
  ON payments (library_id, status, paid_at DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_library_student_status
  ON payments (library_id, student_user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_library_spent_on
  ON expenses (library_id, spent_on DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_checkins_library_checkin_checkout
  ON checkins (library_id, checked_in_at DESC, checked_out_at);

CREATE INDEX IF NOT EXISTS idx_notifications_library_recipient_created
  ON notifications (library_id, recipient_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_revision_schedules_student_status_time
  ON revision_schedules (student_user_id, status, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_revision_schedules_library_status_time
  ON revision_schedules (library_id, status, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_student_feed_library_visibility_created
  ON student_feed_posts (library_id, visibility, created_at DESC);
