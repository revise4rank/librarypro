ALTER TABLE student_intervention_notes
  ADD COLUMN IF NOT EXISTS follow_up_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS note_status VARCHAR(20) NOT NULL DEFAULT 'OPEN';

CREATE INDEX IF NOT EXISTS idx_student_intervention_followup
  ON student_intervention_notes(library_id, student_user_id, note_status, follow_up_at);
