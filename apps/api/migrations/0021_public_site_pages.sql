ALTER TABLE libraries_public_profiles
  ADD COLUMN IF NOT EXISTS site_pages JSONB NOT NULL DEFAULT '{}'::jsonb;
