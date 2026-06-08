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
  supportWhatsappNumber: string;
  demoWhatsappNumber: string;
  supportWhatsappMessage: string;
  demoWhatsappMessage: string;
  enableFloatingWhatsapp: boolean;
  enableBookDemoCta: boolean;
  landingBanners: LandingBanner[];
  updatedAt: string | null;
  updatedByName: string | null;
};

export type LandingBanner = {
  eyebrow: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  ctaLabel: string;
  ctaHref: string;
  tone: "navy" | "steel" | "copper";
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
  support_whatsapp_number: string;
  demo_whatsapp_number: string;
  support_whatsapp_message: string;
  demo_whatsapp_message: string;
  enable_floating_whatsapp: boolean;
  enable_book_demo_cta: boolean;
  landing_banners: unknown;
  updated_at: string | null;
  updated_by_name: string | null;
};

export const defaultLandingBanners: LandingBanner[] = [
  {
    eyebrow: "Owner workspace",
    title: "Admissions, seats, dues, and QR attendance in one dashboard",
    subtitle: "Run your reading room without scattered registers. BookLib keeps daily operations clean, fast, and visible.",
    imageUrl: "",
    ctaLabel: "Start free trial",
    ctaHref: "/owner/register",
    tone: "navy",
  },
  {
    eyebrow: "Student portal",
    title: "Students scan, check in, pay dues, and keep their study flow clear",
    subtitle: "Give every student a simple portal for library access, alerts, study planner, syllabus tracker, and payments.",
    imageUrl: "",
    ctaLabel: "Explore libraries",
    ctaHref: "/marketplace",
    tone: "steel",
  },
  {
    eyebrow: "Library growth",
    title: "Publish offers, plans, gallery, and website pages that convert leads",
    subtitle: "BookLib connects your marketplace listing and subdomain website so students can discover and contact you faster.",
    imageUrl: "",
    ctaLabel: "Book demo",
    ctaHref: "/owner/register?demo=1",
    tone: "copper",
  },
];

function normalizeLandingBanners(value: unknown): LandingBanner[] {
  const raw = typeof value === "string" ? safeJsonParse(value) : value;
  if (!Array.isArray(raw)) return defaultLandingBanners;
  const cleaned = raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const banner = item as Partial<LandingBanner>;
      const title = String(banner.title ?? "").trim();
      if (!title) return null;
      const tone = banner.tone === "steel" || banner.tone === "copper" || banner.tone === "navy" ? banner.tone : "navy";
      return {
        eyebrow: String(banner.eyebrow ?? "BookLib").trim().slice(0, 64),
        title: title.slice(0, 180),
        subtitle: String(banner.subtitle ?? "").trim().slice(0, 260),
        imageUrl: String(banner.imageUrl ?? "").trim().slice(0, 1000),
        ctaLabel: String(banner.ctaLabel ?? "Learn more").trim().slice(0, 40),
        ctaHref: String(banner.ctaHref ?? "/owner/register").trim().slice(0, 240),
        tone,
      } satisfies LandingBanner;
    })
    .filter((item): item is LandingBanner => Boolean(item))
    .slice(0, 6);
  return cleaned.length > 0 ? cleaned : defaultLandingBanners;
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

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
    supportWhatsappNumber: "",
    demoWhatsappNumber: "",
    supportWhatsappMessage: "Hi BookLib, I need support.",
    demoWhatsappMessage: "Hi BookLib, I want a demo for my library.",
    enableFloatingWhatsapp: true,
    enableBookDemoCta: true,
    landingBanners: defaultLandingBanners,
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
    supportWhatsappNumber: row.support_whatsapp_number ?? fallback.supportWhatsappNumber,
    demoWhatsappNumber: row.demo_whatsapp_number ?? fallback.demoWhatsappNumber,
    supportWhatsappMessage: row.support_whatsapp_message || fallback.supportWhatsappMessage,
    demoWhatsappMessage: row.demo_whatsapp_message || fallback.demoWhatsappMessage,
    enableFloatingWhatsapp: row.enable_floating_whatsapp ?? fallback.enableFloatingWhatsapp,
    enableBookDemoCta: row.enable_book_demo_cta ?? fallback.enableBookDemoCta,
    landingBanners: normalizeLandingBanners(row.landing_banners ?? fallback.landingBanners),
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
        s.support_whatsapp_number,
        s.demo_whatsapp_number,
        s.support_whatsapp_message,
        s.demo_whatsapp_message,
        s.enable_floating_whatsapp,
        s.enable_book_demo_cta,
        s.landing_banners,
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
    supportWhatsappNumber: settings.supportWhatsappNumber,
    demoWhatsappNumber: settings.demoWhatsappNumber,
    supportWhatsappMessage: settings.supportWhatsappMessage,
    demoWhatsappMessage: settings.demoWhatsappMessage,
    enableFloatingWhatsapp: settings.enableFloatingWhatsapp,
    enableBookDemoCta: settings.enableBookDemoCta,
    landingBanners: settings.landingBanners,
    updatedAt: settings.updatedAt,
    updatedByName: settings.updatedByName,
  };
}

export function publicPlatformSiteSettings(settings: PlatformIntegrationSettings) {
  return {
    supportWhatsappNumber: settings.enableFloatingWhatsapp ? settings.supportWhatsappNumber : "",
    demoWhatsappNumber: settings.enableBookDemoCta ? settings.demoWhatsappNumber || settings.supportWhatsappNumber : "",
    supportWhatsappMessage: settings.supportWhatsappMessage,
    demoWhatsappMessage: settings.demoWhatsappMessage,
    enableFloatingWhatsapp: settings.enableFloatingWhatsapp,
    enableBookDemoCta: settings.enableBookDemoCta,
    landingBanners: settings.landingBanners,
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
  supportWhatsappNumber?: string;
  demoWhatsappNumber?: string;
  supportWhatsappMessage?: string;
  demoWhatsappMessage?: string;
  enableFloatingWhatsapp?: boolean;
  enableBookDemoCta?: boolean;
  landingBanners?: unknown;
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
      support_whatsapp_number,
      demo_whatsapp_number,
      support_whatsapp_message,
      demo_whatsapp_message,
      enable_floating_whatsapp,
      enable_book_demo_cta,
      landing_banners,
      updated_by
    )
    VALUES ('default', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18::jsonb, $19)
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
      support_whatsapp_number = EXCLUDED.support_whatsapp_number,
      demo_whatsapp_number = EXCLUDED.demo_whatsapp_number,
      support_whatsapp_message = EXCLUDED.support_whatsapp_message,
      demo_whatsapp_message = EXCLUDED.demo_whatsapp_message,
      enable_floating_whatsapp = EXCLUDED.enable_floating_whatsapp,
      enable_book_demo_cta = EXCLUDED.enable_book_demo_cta,
      landing_banners = EXCLUDED.landing_banners,
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
      support_whatsapp_number,
      demo_whatsapp_number,
      support_whatsapp_message,
      demo_whatsapp_message,
      enable_floating_whatsapp,
      enable_book_demo_cta,
      landing_banners,
      updated_at::text,
      (SELECT full_name FROM users WHERE id = $19) AS updated_by_name
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
      input.supportWhatsappNumber ?? "",
      input.demoWhatsappNumber ?? "",
      input.supportWhatsappMessage ?? "Hi BookLib, I need support.",
      input.demoWhatsappMessage ?? "Hi BookLib, I want a demo for my library.",
      input.enableFloatingWhatsapp ?? true,
      input.enableBookDemoCta ?? true,
      JSON.stringify(normalizeLandingBanners(input.landingBanners ?? defaultLandingBanners)),
      input.updatedByUserId,
    ],
  );

  return rowToSettings(result.rows[0]);
}
