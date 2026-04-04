CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE MATERIALIZED VIEW IF NOT EXISTS marketplace_search_index AS
SELECT
  l.id AS library_id,
  l.name AS library_name,
  l.slug AS library_slug,
  l.city,
  l.area,
  l.address,
  l.latitude,
  l.longitude,
  l.available_seats,
  l.starting_price,
  l.offer_text,
  l.status::text AS library_status,
  p.subdomain,
  p.custom_domain,
  p.brand_logo_url,
  p.hero_banner_url,
  p.hero_title,
  p.hero_tagline,
  p.about_text,
  p.contact_name,
  p.contact_phone,
  p.whatsapp_phone,
  p.email,
  p.amenities,
  p.gallery_images,
  p.business_hours,
  p.landmark,
  p.seo_title,
  p.seo_description,
  p.highlight_offer,
  p.offer_expires_at,
  p.allow_direct_contact,
  p.is_published,
  p.show_in_marketplace,
  p.theme_primary,
  p.theme_accent,
  p.theme_surface,
  to_tsvector(
    'simple',
    COALESCE(l.name, '') || ' ' ||
    COALESCE(l.city, '') || ' ' ||
    COALESCE(l.area, '') || ' ' ||
    COALESCE(l.address, '') || ' ' ||
    COALESCE(p.subdomain, '') || ' ' ||
    COALESCE(p.hero_title, '') || ' ' ||
    COALESCE(p.hero_tagline, '')
  ) AS search_vector,
  LOWER(
    COALESCE(l.name, '') || ' ' ||
    COALESCE(l.city, '') || ' ' ||
    COALESCE(l.area, '') || ' ' ||
    COALESCE(l.address, '') || ' ' ||
    COALESCE(p.subdomain, '') || ' ' ||
    COALESCE(p.hero_title, '') || ' ' ||
    COALESCE(p.hero_tagline, '')
  ) AS search_text
FROM libraries l
INNER JOIN libraries_public_profiles p ON p.library_id = l.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_search_index_library
  ON marketplace_search_index(library_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_search_index_publish
  ON marketplace_search_index(is_published, show_in_marketplace, library_status, city);

CREATE INDEX IF NOT EXISTS idx_marketplace_search_index_vector
  ON marketplace_search_index USING GIN(search_vector);

CREATE INDEX IF NOT EXISTS idx_marketplace_search_index_text_trgm
  ON marketplace_search_index USING GIN(search_text gin_trgm_ops);
