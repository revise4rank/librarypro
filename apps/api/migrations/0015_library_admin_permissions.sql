CREATE TABLE IF NOT EXISTS library_admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permissions JSONB NOT NULL DEFAULT '["students","payments","reports","checkins","notifications","seat_control","admissions"]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (library_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_library_admin_permissions_library
  ON library_admin_permissions(library_id, user_id);
