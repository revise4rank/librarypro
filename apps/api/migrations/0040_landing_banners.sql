ALTER TABLE platform_integration_settings
  ADD COLUMN IF NOT EXISTS landing_banners JSONB NOT NULL DEFAULT '[]'::jsonb;
