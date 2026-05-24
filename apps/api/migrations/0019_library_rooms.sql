-- Add rooms as an organizational layer between floors and seats.
-- Floor → Room → Seats hierarchy.

CREATE TABLE IF NOT EXISTS library_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  floor_id UUID NOT NULL REFERENCES library_floors(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  capacity INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_library_rooms_floor ON library_rooms(floor_id);
CREATE INDEX IF NOT EXISTS idx_library_rooms_library ON library_rooms(library_id);

-- Attach seats to rooms (nullable — existing seats have no room assignment)
ALTER TABLE seats ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES library_rooms(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_seats_room ON seats(room_id) WHERE room_id IS NOT NULL;
