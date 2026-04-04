CREATE TABLE IF NOT EXISTS student_intervention_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_note_id UUID NOT NULL REFERENCES student_intervention_notes(id) ON DELETE CASCADE,
  reminder_type VARCHAR(20) NOT NULL DEFAULT 'OVERDUE',
  reminder_date DATE NOT NULL DEFAULT CURRENT_DATE,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (intervention_note_id, reminder_type, reminder_date)
);

CREATE INDEX IF NOT EXISTS idx_student_intervention_reminders_lookup
  ON student_intervention_reminders(reminder_date DESC, reminder_type);
