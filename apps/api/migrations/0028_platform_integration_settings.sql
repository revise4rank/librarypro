CREATE TABLE IF NOT EXISTS platform_integration_settings (
  singleton_key TEXT PRIMARY KEY DEFAULT 'default',
  google_oauth_client_id TEXT NOT NULL DEFAULT '',
  google_oauth_client_secret TEXT NOT NULL DEFAULT '',
  google_oauth_redirect_url TEXT NOT NULL DEFAULT '',
  razorpay_key_id TEXT NOT NULL DEFAULT '',
  razorpay_key_secret TEXT NOT NULL DEFAULT '',
  razorpay_webhook_secret TEXT NOT NULL DEFAULT '',
  smtp_host TEXT NOT NULL DEFAULT '',
  smtp_port INTEGER NOT NULL DEFAULT 587,
  smtp_user TEXT NOT NULL DEFAULT '',
  smtp_pass TEXT NOT NULL DEFAULT '',
  report_from_email TEXT NOT NULL DEFAULT '',
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO platform_integration_settings (singleton_key)
VALUES ('default')
ON CONFLICT (singleton_key) DO NOTHING;
