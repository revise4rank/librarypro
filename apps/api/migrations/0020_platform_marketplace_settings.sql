CREATE TABLE IF NOT EXISTS platform_marketplace_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton_key TEXT NOT NULL UNIQUE DEFAULT 'default',
  headline VARCHAR(180) NOT NULL DEFAULT 'Discover the right library without the noise.',
  subheadline TEXT NOT NULL DEFAULT 'Search study spaces by city, budget, seats, and facilities.',
  banner_slides JSONB NOT NULL DEFAULT '[
    {"eyebrow":"Find faster","title":"Search study spaces by city, budget, seats, and facilities.","cta":"Start search","href":"#marketplace-search","tone":"slate"},
    {"eyebrow":"Top picks","title":"Filter top-rated and available libraries without opening every page.","cta":"See top libraries","href":"#marketplace-search","tone":"emerald"},
    {"eyebrow":"Offers live","title":"Find libraries with active discounts, seat offers, and quick contact.","cta":"View offers","href":"#marketplace-search","tone":"amber"},
    {"eyebrow":"For owners","title":"List your library with a public site, student access, and lead capture.","cta":"List library","href":"/owner/register","tone":"blue"}
  ]'::jsonb,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO platform_marketplace_settings (singleton_key)
VALUES ('default')
ON CONFLICT (singleton_key) DO NOTHING;
