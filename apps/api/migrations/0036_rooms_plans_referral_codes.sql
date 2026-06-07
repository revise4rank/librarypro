CREATE TABLE IF NOT EXISTS library_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  floor_id UUID NOT NULL REFERENCES library_floors(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_library_room_name_per_floor UNIQUE (library_id, floor_id, name)
);

ALTER TABLE library_rooms
  ADD COLUMN IF NOT EXISTS library_id UUID REFERENCES libraries(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS floor_id UUID REFERENCES library_floors(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_library_rooms_floor
  ON library_rooms(library_id, floor_id, status, sort_order, name);

ALTER TABLE seats
  ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES library_rooms(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'seats' AND column_name = 'status'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_seats_library_floor_room
      ON seats(library_id, floor_id, room_id, status);
  ELSE
    CREATE INDEX IF NOT EXISTS idx_seats_library_floor_room
      ON seats(library_id, floor_id, room_id);
  END IF;
END $$;

ALTER TABLE libraries
  ADD COLUMN IF NOT EXISTS referral_code VARCHAR(12);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS referral_code VARCHAR(12);

CREATE UNIQUE INDEX IF NOT EXISTS uq_libraries_referral_code
  ON libraries(referral_code)
  WHERE referral_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_referral_code
  ON users(referral_code)
  WHERE referral_code IS NOT NULL;

ALTER TABLE library_student_plans
  ADD COLUMN IF NOT EXISTS plan_type VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
  ADD COLUMN IF NOT EXISTS duration_days INTEGER,
  ADD COLUMN IF NOT EXISTS shift_start_time TIME,
  ADD COLUMN IF NOT EXISTS shift_end_time TIME,
  ADD COLUMN IF NOT EXISTS allowed_hours NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS allowed_days TEXT[];

ALTER TABLE library_student_plans
  DROP CONSTRAINT IF EXISTS chk_library_student_plans_plan_type;

ALTER TABLE library_student_plans
  ADD CONSTRAINT chk_library_student_plans_plan_type
  CHECK (plan_type IN ('MONTHLY', 'DAY_WISE', 'SHIFT_HOURS'));

WITH room_candidates AS (
  SELECT DISTINCT ON (lf.library_id, lf.id, lower(room_item->>'name'))
    lf.library_id,
    lf.id AS floor_id,
    room_item->>'name' AS name,
    COALESCE((room_item->>'sortOrder')::int, room_index.ordinality::int - 1) AS sort_order
  FROM library_floors lf
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(lf.layout_meta->'rooms', '[]'::jsonb)) WITH ORDINALITY AS room_index(room_item, ordinality)
  WHERE COALESCE(room_item->>'name', '') <> ''
  ORDER BY lf.library_id, lf.id, lower(room_item->>'name'), room_index.ordinality
)
INSERT INTO library_rooms (library_id, floor_id, name, sort_order)
SELECT rc.library_id, rc.floor_id, rc.name, rc.sort_order
FROM room_candidates rc
WHERE NOT EXISTS (
  SELECT 1
  FROM library_rooms lr
  WHERE lr.library_id = rc.library_id
    AND lr.floor_id = rc.floor_id
    AND lower(lr.name) = lower(rc.name)
);

UPDATE seats s
SET room_id = lr.id
FROM library_rooms lr
WHERE s.library_id = lr.library_id
  AND s.floor_id = lr.floor_id
  AND s.room_id IS NULL
  AND lower(COALESCE(s.label, '')) = lower(lr.name);
