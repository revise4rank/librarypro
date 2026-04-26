import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

function loadLocalEnvFile() {
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../../.env"),
  ];

  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const raw = fs.readFileSync(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }

    break;
  }
}

loadLocalEnvFile();

const appEnv = process.env.NODE_ENV ?? "development";
const isTestEnv = appEnv === "test";
const isProductionEnv = appEnv === "production";
const defaultJwtSecret = isTestEnv ? "test-jwt-secret-for-librarypro" : "";
const defaultInternalTenantSecret = isTestEnv ? "test-internal-tenant-secret-for-librarypro" : "";
const defaultRazorpayWebhookSecret = isTestEnv ? "test-razorpay-webhook-secret" : "";

const envSchema = z.object({
  appEnv: z.string().default("development"),
  port: z.coerce.number().int().positive().default(4000),
  apiCompressionEnabled: z.boolean(),
  jwtSecret: z.string().min(1, "JWT_SECRET is required."),
  jwtAccessTtl: z.string().min(1).default("15m"),
  internalTenantHeaderSecret: z.string().min(1, "INTERNAL_TENANT_HEADER_SECRET is required."),
  baseDomain: z.string().min(1).default("librarypro.com"),
  webAppUrl: z.string().url().default("http://127.0.0.1:3000"),
  apiPublicUrl: z.string().default(""),
  apiTrustedProxyCount: z.coerce.number().int().min(0).default(1),
  dbPoolMax: z.coerce.number().int().positive().default(20),
  dbPoolIdleTimeoutMs: z.coerce.number().int().positive().default(30_000),
  dbPoolConnectionTimeoutMs: z.coerce.number().int().positive().default(5_000),
  razorpayKeyId: z.string().default(""),
  razorpayWebhookSecret: z.string().default(""),
  redisUrl: z.string().default(""),
  sentryDsn: z.string().default(""),
  otelServiceName: z.string().min(1).default("librarypro-api"),
  otelExporterOtlpEndpoint: z.string().default(""),
  uploadsDir: z.string().min(1).default("uploads"),
  uploadsProvider: z.enum(["local", "supabase"]).default("local"),
  supabaseUrl: z.string().default(""),
  supabaseServiceRoleKey: z.string().default(""),
  supabaseBucket: z.string().min(1).default("librarypro-assets"),
}).superRefine((value, context) => {
  if (isProductionEnv && value.jwtSecret.length < 32) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["jwtSecret"],
      message: "JWT_SECRET must be at least 32 characters in production.",
    });
  }

  if (isProductionEnv && value.internalTenantHeaderSecret.length < 32) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["internalTenantHeaderSecret"],
      message: "INTERNAL_TENANT_HEADER_SECRET must be at least 32 characters in production.",
    });
  }

  if (value.jwtSecret === value.internalTenantHeaderSecret) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["internalTenantHeaderSecret"],
      message: "INTERNAL_TENANT_HEADER_SECRET must be different from JWT_SECRET.",
    });
  }

  if (value.apiPublicUrl && !/^https?:\/\//i.test(value.apiPublicUrl)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["apiPublicUrl"],
      message: "API_PUBLIC_URL must be a valid http/https URL when provided.",
    });
  }

  if (value.uploadsProvider === "supabase" && (!value.supabaseUrl || !value.supabaseServiceRoleKey)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["uploadsProvider"],
      message: "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required when UPLOADS_PROVIDER=supabase.",
    });
  }
});

export const env = envSchema.parse({
  appEnv,
  port: process.env.PORT ?? 4000,
  apiCompressionEnabled: (process.env.API_COMPRESSION_ENABLED ?? "true").toLowerCase() !== "false",
  jwtSecret: process.env.JWT_SECRET ?? defaultJwtSecret,
  jwtAccessTtl: process.env.JWT_ACCESS_TTL ?? "15m",
  internalTenantHeaderSecret: process.env.INTERNAL_TENANT_HEADER_SECRET ?? defaultInternalTenantSecret,
  baseDomain: process.env.BASE_DOMAIN ?? "librarypro.com",
  webAppUrl: process.env.WEB_APP_URL ?? "http://127.0.0.1:3000",
  apiPublicUrl: process.env.API_PUBLIC_URL ?? "",
  apiTrustedProxyCount: process.env.API_TRUSTED_PROXY_COUNT ?? 1,
  dbPoolMax: process.env.DB_POOL_MAX ?? 20,
  dbPoolIdleTimeoutMs: process.env.DB_POOL_IDLE_TIMEOUT_MS ?? 30_000,
  dbPoolConnectionTimeoutMs: process.env.DB_POOL_CONNECTION_TIMEOUT_MS ?? 5_000,
  razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? "",
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? defaultRazorpayWebhookSecret,
  redisUrl: process.env.REDIS_URL ?? "",
  sentryDsn: process.env.SENTRY_DSN ?? "",
  otelServiceName: process.env.OTEL_SERVICE_NAME ?? "librarypro-api",
  otelExporterOtlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "",
  uploadsDir: process.env.UPLOADS_DIR ?? "uploads",
  uploadsProvider: process.env.UPLOADS_PROVIDER ?? "local",
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  supabaseBucket: process.env.SUPABASE_BUCKET ?? "librarypro-assets",
});
