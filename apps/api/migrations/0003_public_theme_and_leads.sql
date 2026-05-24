ALTER TABLE libraries_public_profiles
  ADD COLUMN IF NOT EXISTS hero_banner_url TEXT,
  ADD COLUMN IF NOT EXISTS theme_primary VARCHAR(20) NOT NULL DEFAULT '#d2723d',
  ADD COLUMN IF NOT EXISTS theme_accent VARCHAR(20) NOT NULL DEFAULT '#2f8f88',
  ADD COLUMN IF NOT EXISTS theme_surface VARCHAR(20) NOT NULL DEFAULT '#fff9f0';

ALTER TABLE library_contact_leads
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'NEW',
  ADD COLUMN IF NOT EXISTS owner_notes TEXT,
  ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_library_contact_leads_library_status_created
  ON library_contact_leads(library_id, status, created_at DESC);
