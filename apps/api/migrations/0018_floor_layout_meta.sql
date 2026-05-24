ALTER TABLE library_floors
ADD COLUMN IF NOT EXISTS layout_meta JSONB NOT NULL DEFAULT '{}'::jsonb;
