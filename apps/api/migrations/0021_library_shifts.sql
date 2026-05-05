CREATE TABLE IF NOT EXISTS library_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_time TIME NOT NULL DEFAULT '08:00',
  end_time TIME NOT NULL DEFAULT '20:00',
  days_of_week JSONB NOT NULL DEFAULT '["MON","TUE","WED","THU","FRI","SAT","SUN"]'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_library_shifts_library_active
  ON library_shifts(library_id, is_active, sort_order, start_time);

CREATE UNIQUE INDEX IF NOT EXISTS uq_library_shifts_default
  ON library_shifts(library_id)
  WHERE is_default = TRUE;

INSERT INTO library_shifts (library_id, name, start_time, end_time, is_default, is_active, sort_order)
SELECT l.id, 'Full Day', '08:00', '20:00', TRUE, TRUE, 0
FROM libraries l
WHERE NOT EXISTS (
  SELECT 1
  FROM library_shifts ls
  WHERE ls.library_id = l.id
);

ALTER TABLE student_assignments
  ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES library_shifts(id) ON DELETE SET NULL;

ALTER TABLE checkins
  ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES library_shifts(id) ON DELETE SET NULL;

UPDATE student_assignments sa
SET shift_id = defaults.id
FROM (
  SELECT DISTINCT ON (library_id) id, library_id
  FROM library_shifts
  WHERE is_default = TRUE
  ORDER BY library_id, sort_order, created_at
) defaults
WHERE sa.library_id = defaults.library_id
  AND sa.shift_id IS NULL;

UPDATE checkins c
SET shift_id = sa.shift_id
FROM student_assignments sa
WHERE c.assignment_id = sa.id
  AND c.shift_id IS NULL
  AND sa.shift_id IS NOT NULL;

UPDATE checkins c
SET shift_id = defaults.id
FROM (
  SELECT DISTINCT ON (library_id) id, library_id
  FROM library_shifts
  WHERE is_default = TRUE
  ORDER BY library_id, sort_order, created_at
) defaults
WHERE c.library_id = defaults.library_id
  AND c.shift_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_student_assignments_library_shift
  ON student_assignments(library_id, shift_id, status);

CREATE INDEX IF NOT EXISTS idx_student_assignments_shift_seat
  ON student_assignments(library_id, shift_id, seat_id)
  WHERE status = 'ACTIVE' AND seat_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_student_assignments_active_seat_shift
  ON student_assignments(library_id, seat_id, shift_id)
  WHERE status = 'ACTIVE' AND seat_id IS NOT NULL AND shift_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_checkins_library_shift_time
  ON checkins(library_id, shift_id, checked_in_at DESC);

WITH seat_totals AS (
  SELECT
    l.id AS library_id,
    COUNT(*) FILTER (WHERE s.status <> 'DISABLED')::int AS total_count,
    COUNT(*) FILTER (
      WHERE s.status IN ('AVAILABLE', 'OCCUPIED')
        AND NOT EXISTS (
          SELECT 1
          FROM student_assignments sa
          WHERE sa.library_id = l.id
            AND sa.seat_id = s.id
            AND sa.shift_id = ls.id
            AND sa.status = 'ACTIVE'
        )
    )::int AS available_count
  FROM libraries l
  LEFT JOIN library_shifts ls ON ls.library_id = l.id AND ls.is_active = TRUE
  LEFT JOIN seats s ON s.library_id = l.id
  GROUP BY l.id
)
UPDATE libraries
SET
  total_seats = COALESCE(seat_totals.total_count, 0),
  available_seats = COALESCE(seat_totals.available_count, 0),
  updated_at = NOW()
FROM seat_totals
WHERE libraries.id = seat_totals.library_id;
