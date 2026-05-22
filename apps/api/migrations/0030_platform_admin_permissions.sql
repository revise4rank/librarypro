CREATE TABLE IF NOT EXISTS platform_admin_permissions (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  role_code VARCHAR(40) NOT NULL DEFAULT 'SUPPORT',
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT platform_admin_permissions_role_chk CHECK (
    role_code IN ('SUPER_ADMIN_FULL', 'SUPPORT', 'FINANCE', 'CONTENT', 'OPS')
  )
);

CREATE INDEX IF NOT EXISTS idx_platform_admin_permissions_role
  ON platform_admin_permissions(role_code);
