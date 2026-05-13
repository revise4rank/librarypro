import { env } from "../config/env";
import { requireDb } from "../lib/db";

export type PlatformIntegrationSettings = {
  googleOAuthClientId: string;
  googleOAuthClientSecret: string;
  googleOAuthRedirectUrl: string;
  razorpayKeyId: string;
  razorpayKeySecret: string;
  razorpayWebhookSecret: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  reportFromEmail: string;
  updatedAt: string | null;
  updatedByName: string | null;
};

type IntegrationRow = {
  google_oauth_client_id: string;
  google_oauth_client_secret: string;
  google_oauth_redirect_url: string;
  razorpay_key_id: string;
  razorpay_key_secret: string;
  razorpay_webhook_secret: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  report_from_email: string;
  updated_at: string | null;
  updated_by_name: string | null;
};

function envSettings(): PlatformIntegrationSettings {
  return {
    googleOAuthClientId: env.googleOAuthClientId,
    googleOAuthClientSecret: env.googleOAuthClientSecret,
    googleOAuthRedirectUrl: env.googleOAuthRedirectUrl,
    razorpayKeyId: env.razorpayKeyId,
    razorpayKeySecret: env.razorpayKeySecret,
    razorpayWebhookSecret: env.razorpayWebhookSecret,
    smtpHost: env.smtpHost,
    smtpPort: env.smtpPort,
    smtpUser: env.smtpUser,
    smtpPass: env.smtpPass,
    reportFromEmail: env.reportFromEmail,
    updatedAt: null,
    updatedByName: null,
  };
}

function rowToSettings(row: IntegrationRow | undefined): PlatformIntegrationSettings {
  const fallback = envSettings();
  if (!row) return fallback;
  return {
    googleOAuthClientId: row.google_oauth_client_id || fallback.googleOAuthClientId,
    googleOAuthClientSecret: row.google_oauth_client_secret || fallback.googleOAuthClientSecret,
    googleOAuthRedirectUrl: row.google_oauth_redirect_url || fallback.googleOAuthRedirectUrl,
    razorpayKeyId: row.razorpay_key_id || fallback.razorpayKeyId,
    razorpayKeySecret: row.razorpay_key_secret || fallback.razorpayKeySecret,
    razorpayWebhookSecret: row.razorpay_webhook_secret || fallback.razorpayWebhookSecret,
    smtpHost: row.smtp_host || fallback.smtpHost,
    smtpPort: row.smtp_port || fallback.smtpPort,
    smtpUser: row.smtp_user || fallback.smtpUser,
    smtpPass: row.smtp_pass || fallback.smtpPass,
    reportFromEmail: row.report_from_email || fallback.reportFromEmail,
    updatedAt: row.updated_at,
    updatedByName: row.updated_by_name,
  };
}

export async function getPlatformIntegrationSettings() {
  try {
    const result = await requireDb().query<IntegrationRow>(
      `
      SELECT
        s.google_oauth_client_id,
        s.google_oauth_client_secret,
        s.google_oauth_redirect_url,
        s.razorpay_key_id,
        s.razorpay_key_secret,
        s.razorpay_webhook_secret,
        s.smtp_host,
        s.smtp_port,
        s.smtp_user,
        s.smtp_pass,
        s.report_from_email,
        s.updated_at::text,
        u.full_name AS updated_by_name
      FROM platform_integration_settings s
      LEFT JOIN users u ON u.id = s.updated_by
      WHERE s.singleton_key = 'default'
      LIMIT 1
      `,
    );
    return rowToSettings(result.rows[0]);
  } catch (error) {
    if ((error as Error).message === "DATABASE_URL is required for database-backed routes.") return envSettings();
    if ((error as { code?: string }).code === "42P01") return envSettings();
    throw error;
  }
}

export function redactPlatformIntegrationSettings(settings: PlatformIntegrationSettings) {
  return {
    googleOAuthClientId: settings.googleOAuthClientId,
    googleOAuthRedirectUrl: settings.googleOAuthRedirectUrl,
    googleOAuthClientSecretSet: Boolean(settings.googleOAuthClientSecret),
    razorpayKeyId: settings.razorpayKeyId,
    razorpayKeySecretSet: Boolean(settings.razorpayKeySecret),
    razorpayWebhookSecretSet: Boolean(settings.razorpayWebhookSecret),
    smtpHost: settings.smtpHost,
    smtpPort: settings.smtpPort,
    smtpUser: settings.smtpUser,
    reportFromEmail: settings.reportFromEmail,
    smtpPassSet: Boolean(settings.smtpPass),
    updatedAt: settings.updatedAt,
    updatedByName: settings.updatedByName,
  };
}

export async function updatePlatformIntegrationSettings(input: {
  googleOAuthClientId?: string;
  googleOAuthClientSecret?: string;
  googleOAuthRedirectUrl?: string;
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
  razorpayWebhookSecret?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  reportFromEmail?: string;
  updatedByUserId: string;
}) {
  const result = await requireDb().query<IntegrationRow>(
    `
    INSERT INTO platform_integration_settings (
      singleton_key,
      google_oauth_client_id,
      google_oauth_client_secret,
      google_oauth_redirect_url,
      razorpay_key_id,
      razorpay_key_secret,
      razorpay_webhook_secret,
      smtp_host,
      smtp_port,
      smtp_user,
      smtp_pass,
      report_from_email,
      updated_by
    )
    VALUES ('default', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    ON CONFLICT (singleton_key) DO UPDATE
    SET
      google_oauth_client_id = EXCLUDED.google_oauth_client_id,
      google_oauth_client_secret = COALESCE(NULLIF(EXCLUDED.google_oauth_client_secret, ''), platform_integration_settings.google_oauth_client_secret),
      google_oauth_redirect_url = EXCLUDED.google_oauth_redirect_url,
      razorpay_key_id = EXCLUDED.razorpay_key_id,
      razorpay_key_secret = COALESCE(NULLIF(EXCLUDED.razorpay_key_secret, ''), platform_integration_settings.razorpay_key_secret),
      razorpay_webhook_secret = COALESCE(NULLIF(EXCLUDED.razorpay_webhook_secret, ''), platform_integration_settings.razorpay_webhook_secret),
      smtp_host = EXCLUDED.smtp_host,
      smtp_port = EXCLUDED.smtp_port,
      smtp_user = EXCLUDED.smtp_user,
      smtp_pass = COALESCE(NULLIF(EXCLUDED.smtp_pass, ''), platform_integration_settings.smtp_pass),
      report_from_email = EXCLUDED.report_from_email,
      updated_by = EXCLUDED.updated_by,
      updated_at = NOW()
    RETURNING
      google_oauth_client_id,
      google_oauth_client_secret,
      google_oauth_redirect_url,
      razorpay_key_id,
      razorpay_key_secret,
      razorpay_webhook_secret,
      smtp_host,
      smtp_port,
      smtp_user,
      smtp_pass,
      report_from_email,
      updated_at::text,
      (SELECT full_name FROM users WHERE id = $12) AS updated_by_name
    `,
    [
      input.googleOAuthClientId ?? "",
      input.googleOAuthClientSecret ?? "",
      input.googleOAuthRedirectUrl ?? "",
      input.razorpayKeyId ?? "",
      input.razorpayKeySecret ?? "",
      input.razorpayWebhookSecret ?? "",
      input.smtpHost ?? "",
      input.smtpPort ?? 587,
      input.smtpUser ?? "",
      input.smtpPass ?? "",
      input.reportFromEmail ?? "",
      input.updatedByUserId,
    ],
  );

  return rowToSettings(result.rows[0]);
}
