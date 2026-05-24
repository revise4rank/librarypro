CREATE INDEX IF NOT EXISTS idx_libraries_status_city_geo
  ON libraries(status, city, latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_public_profiles_marketplace_publish
  ON libraries_public_profiles(is_published, show_in_marketplace, subdomain);
