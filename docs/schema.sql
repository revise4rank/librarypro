CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'LIBRARY_OWNER', 'STUDENT');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'library_status') THEN
    CREATE TYPE library_status AS ENUM ('ACTIVE', 'SUSPENDED', 'INACTIVE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'seat_status') THEN
    CREATE TYPE seat_status AS ENUM ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'DISABLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assignment_status') THEN
    CREATE TYPE assignment_status AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM ('PENDING', 'PAID', 'DUE', 'FAILED', 'REFUNDED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE notification_type AS ENUM ('PAYMENT_REMINDER', 'EXPIRY_ALERT', 'GENERAL');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    CREATE TYPE subscription_status AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'EXPIRED', 'CANCELLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'checkin_mode') THEN
    CREATE TYPE checkin_mode AS ENUM ('QR', 'MANUAL', 'SYNCED_OFFLINE');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20) UNIQUE,
  password_hash TEXT NOT NULL,
  global_role user_role NOT NULL DEFAULT 'STUDENT',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  session_version INTEGER NOT NULL DEFAULT 1,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_email_or_phone_chk CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS libraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(180) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  city VARCHAR(120) NOT NULL,
  area VARCHAR(120),
  address TEXT NOT NULL,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  total_seats INTEGER NOT NULL DEFAULT 0 CHECK (total_seats >= 0),
  available_seats INTEGER NOT NULL DEFAULT 0 CHECK (available_seats >= 0),
  starting_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  offer_text VARCHAR(255),
  status library_status NOT NULL DEFAULT 'ACTIVE',
  qr_secret_hash TEXT NOT NULL,
  active_qr_key_id UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_libraries_city_status ON libraries(city, status);
CREATE INDEX IF NOT EXISTS idx_libraries_geo ON libraries(latitude, longitude);

CREATE TABLE IF NOT EXISTS user_library_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  library_id UUID NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, library_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_library_roles_user ON user_library_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_library_roles_library ON user_library_roles(library_id);

CREATE TABLE IF NOT EXISTS library_floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  floor_number INTEGER NOT NULL,
  layout_columns INTEGER NOT NULL DEFAULT 10 CHECK (layout_columns > 0),
  layout_rows INTEGER NOT NULL DEFAULT 10 CHECK (layout_rows > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (library_id, floor_number)
);

CREATE TABLE IF NOT EXISTS seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  floor_id UUID REFERENCES library_floors(id) ON DELETE SET NULL,
  seat_number VARCHAR(40) NOT NULL,
  label VARCHAR(80),
  row_no INTEGER NOT NULL CHECK (row_no > 0),
  col_no INTEGER NOT NULL CHECK (col_no > 0),
  pos_x INTEGER NOT NULL DEFAULT 0,
  pos_y INTEGER NOT NULL DEFAULT 0,
  status seat_status NOT NULL DEFAULT 'AVAILABLE',
  reserved_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (library_id, seat_number)
);

CREATE INDEX IF NOT EXISTS idx_seats_library_status ON seats(library_id, status);
CREATE INDEX IF NOT EXISTS idx_seats_library_floor ON seats(library_id, floor_id);

CREATE TABLE IF NOT EXISTS student_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seat_id UUID REFERENCES seats(id) ON DELETE SET NULL,
  father_name VARCHAR(150),
  plan_name VARCHAR(120) NOT NULL,
  plan_price NUMERIC(10,2) NOT NULL CHECK (plan_price >= 0),
  duration_months INTEGER NOT NULL DEFAULT 1 CHECK (duration_months > 0),
  next_due_date DATE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status assignment_status NOT NULL DEFAULT 'ACTIVE',
  payment_status payment_status NOT NULL DEFAULT 'PENDING',
  assigned_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT student_assignments_date_chk CHECK (ends_at > starts_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_student_assignments_active
  ON student_assignments(library_id, student_user_id)
  WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_student_assignments_library_status
  ON student_assignments(library_id, status, ends_at);

CREATE INDEX IF NOT EXISTS idx_student_assignments_seat
  ON student_assignments(library_id, seat_id);

CREATE TABLE IF NOT EXISTS checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES student_assignments(id) ON DELETE SET NULL,
  seat_id UUID REFERENCES seats(id) ON DELETE SET NULL,
  mode checkin_mode NOT NULL DEFAULT 'QR',
  client_event_id UUID,
  checked_in_at TIMESTAMPTZ NOT NULL,
  checked_out_at TIMESTAMPTZ,
  device_time TIMESTAMPTZ,
  qr_key_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT checkins_checkout_after_checkin_chk CHECK (
    checked_out_at IS NULL OR checked_out_at >= checked_in_at
  ),
  UNIQUE (library_id, client_event_id)
);

CREATE INDEX IF NOT EXISTS idx_checkins_library_student_time
  ON checkins(library_id, student_user_id, checked_in_at DESC);

CREATE INDEX IF NOT EXISTS idx_checkins_library_date
  ON checkins(library_id, checked_in_at DESC);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES student_assignments(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  status payment_status NOT NULL DEFAULT 'PENDING',
  method VARCHAR(50) NOT NULL DEFAULT 'CASH',
  paid_at TIMESTAMPTZ,
  due_date DATE,
  reference_no VARCHAR(120),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_library_status_paid_at
  ON payments(library_id, status, paid_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_library_student
  ON payments(library_id, student_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  category VARCHAR(80) NOT NULL,
  title VARCHAR(150) NOT NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  spent_on DATE NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_library_spent_on
  ON expenses(library_id, spent_on DESC);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  sender_user_id UUID REFERENCES users(id),
  recipient_user_id UUID REFERENCES users(id),
  type notification_type NOT NULL,
  title VARCHAR(180) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_library_recipient
  ON notifications(library_id, recipient_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS library_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID NOT NULL UNIQUE REFERENCES libraries(id) ON DELETE CASCADE,
  wifi_name VARCHAR(120),
  wifi_password VARCHAR(120),
  notice_message TEXT,
  timezone VARCHAR(80) NOT NULL DEFAULT 'Asia/Kolkata',
  allow_offline_checkin BOOLEAN NOT NULL DEFAULT TRUE,
  offline_drift_tolerance_minutes INTEGER NOT NULL DEFAULT 10 CHECK (offline_drift_tolerance_minutes >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID NOT NULL UNIQUE REFERENCES libraries(id) ON DELETE CASCADE,
  plan_code VARCHAR(40) NOT NULL,
  plan_name VARCHAR(100) NOT NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  status subscription_status NOT NULL DEFAULT 'TRIALING',
  razorpay_subscription_id VARCHAR(120),
  razorpay_customer_id VARCHAR(120),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  renews_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  last_payment_at TIMESTAMPTZ,
  grace_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT subscriptions_period_chk CHECK (current_period_end > current_period_start)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status_end
  ON subscriptions(status, current_period_end);

CREATE TABLE IF NOT EXISTS platform_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  status payment_status NOT NULL DEFAULT 'PENDING',
  razorpay_order_id VARCHAR(120),
  razorpay_payment_id VARCHAR(120),
  razorpay_signature TEXT,
  invoice_url TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_payments_library_paid_at
  ON platform_payments(library_id, paid_at DESC);

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(40) NOT NULL,
  event_id VARCHAR(180) NOT NULL,
  event_type VARCHAR(120) NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ,
  status VARCHAR(30) NOT NULL DEFAULT 'RECEIVED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source, event_id)
);

CREATE TABLE IF NOT EXISTS analytics_daily_library_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  collected_revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  expenses_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  new_students INTEGER NOT NULL DEFAULT 0,
  active_students INTEGER NOT NULL DEFAULT 0,
  checkins_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (library_id, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_analytics_daily_library_date
  ON analytics_daily_library_metrics(library_id, metric_date DESC);

CREATE TABLE IF NOT EXISTS libraries_public_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID NOT NULL UNIQUE REFERENCES libraries(id) ON DELETE CASCADE,
  subdomain VARCHAR(63) NOT NULL UNIQUE,
  custom_domain VARCHAR(255),
  brand_logo_url TEXT,
  hero_title VARCHAR(220) NOT NULL,
  hero_tagline TEXT,
  about_text TEXT,
  contact_name VARCHAR(150),
  contact_phone VARCHAR(20),
  whatsapp_phone VARCHAR(20),
  email VARCHAR(255),
  address_text TEXT NOT NULL,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  landmark VARCHAR(255),
  business_hours VARCHAR(120),
  amenities JSONB NOT NULL DEFAULT '[]'::jsonb,
  gallery_images JSONB NOT NULL DEFAULT '[]'::jsonb,
  seo_title VARCHAR(220),
  seo_description TEXT,
  meta_keywords TEXT,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  show_in_marketplace BOOLEAN NOT NULL DEFAULT TRUE,
  allow_direct_contact BOOLEAN NOT NULL DEFAULT TRUE,
  ad_budget NUMERIC(10,2) NOT NULL DEFAULT 0,
  highlight_offer VARCHAR(255),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT libraries_public_profiles_subdomain_chk CHECK (subdomain ~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$')
);

CREATE INDEX IF NOT EXISTS idx_public_profiles_published_city
  ON libraries_public_profiles(is_published, show_in_marketplace);

CREATE INDEX IF NOT EXISTS idx_public_profiles_contact_phone
  ON libraries_public_profiles(contact_phone);

CREATE TABLE IF NOT EXISTS library_contact_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  public_profile_id UUID REFERENCES libraries_public_profiles(id) ON DELETE SET NULL,
  channel VARCHAR(30) NOT NULL,
  student_name VARCHAR(150),
  student_phone VARCHAR(20),
  student_email VARCHAR(255),
  message TEXT,
  source_page VARCHAR(50) NOT NULL DEFAULT 'MARKETPLACE',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT library_contact_leads_channel_chk CHECK (channel IN ('CALL', 'WHATSAPP', 'CHAT', 'FORM'))
);

CREATE INDEX IF NOT EXISTS idx_library_contact_leads_library_created
  ON library_contact_leads(library_id, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  library_id UUID REFERENCES libraries(id) ON DELETE SET NULL,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address VARCHAR(80),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_library_created
  ON audit_logs(library_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created
  ON audit_logs(actor_user_id, created_at DESC);
