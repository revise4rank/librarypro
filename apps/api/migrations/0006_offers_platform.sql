DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'offer_status') THEN
    CREATE TYPE offer_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'offer_source_type') THEN
    CREATE TYPE offer_source_type AS ENUM ('ADMIN', 'OWNER');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS offer_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(60) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES offer_categories(id) ON DELETE RESTRICT,
  source_type offer_source_type NOT NULL,
  created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  owner_library_id UUID REFERENCES libraries(id) ON DELETE SET NULL,
  approved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(180) NOT NULL,
  image_url TEXT,
  short_description VARCHAR(320) NOT NULL,
  long_description TEXT,
  city VARCHAR(120),
  area VARCHAR(120),
  target_library_id UUID REFERENCES libraries(id) ON DELETE SET NULL,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  cta_label VARCHAR(40) NOT NULL DEFAULT 'View Details',
  cta_url TEXT,
  contact_phone VARCHAR(20),
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  status offer_status NOT NULL DEFAULT 'PENDING',
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offers_status_city_featured
  ON offers(status, city, is_featured, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_offers_target_library
  ON offers(target_library_id, status, valid_until);

CREATE TABLE IF NOT EXISTS offer_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  student_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  library_id UUID REFERENCES libraries(id) ON DELETE SET NULL,
  city VARCHAR(120),
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offer_views_offer_time
  ON offer_views(offer_id, viewed_at DESC);

CREATE TABLE IF NOT EXISTS offer_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  student_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  library_id UUID REFERENCES libraries(id) ON DELETE SET NULL,
  action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('VIEW_DETAILS', 'CONTACT', 'APPLY')),
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offer_clicks_offer_time
  ON offer_clicks(offer_id, clicked_at DESC);

INSERT INTO offer_categories (slug, name, description)
VALUES
  ('coaching', 'Coaching Institutes', 'Nearby coaching, test prep, and mentorship programs'),
  ('colleges', 'Colleges', 'Admissions and campus discovery offers'),
  ('schools', 'Schools', 'School opportunities and enrollment campaigns'),
  ('courses', 'Courses', 'Online and offline course programs'),
  ('library-discounts', 'Library Discounts', 'Seat discounts, trial offers, and membership promotions')
ON CONFLICT (slug) DO NOTHING;
