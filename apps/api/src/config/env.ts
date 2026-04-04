import fs from "node:fs";
import path from "node:path";

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

export const env = {
  appEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  apiCompressionEnabled: (process.env.API_COMPRESSION_ENABLED ?? "true").toLowerCase() !== "false",
  jwtSecret: process.env.JWT_SECRET ?? "",
  jwtAccessTtl: process.env.JWT_ACCESS_TTL ?? "15m",
  internalTenantHeaderSecret: process.env.INTERNAL_TENANT_HEADER_SECRET ?? process.env.JWT_SECRET ?? "",
  baseDomain: process.env.BASE_DOMAIN ?? "librarypro.com",
  webAppUrl: process.env.WEB_APP_URL ?? "http://127.0.0.1:3000",
  apiTrustedProxyCount: Number(process.env.API_TRUSTED_PROXY_COUNT ?? 1),
  dbPoolMax: Number(process.env.DB_POOL_MAX ?? 20),
  dbPoolIdleTimeoutMs: Number(process.env.DB_POOL_IDLE_TIMEOUT_MS ?? 30_000),
  dbPoolConnectionTimeoutMs: Number(process.env.DB_POOL_CONNECTION_TIMEOUT_MS ?? 5_000),
  razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? "",
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? "",
  redisUrl: process.env.REDIS_URL ?? "",
  sentryDsn: process.env.SENTRY_DSN ?? "",
  otelServiceName: process.env.OTEL_SERVICE_NAME ?? "librarypro-api",
  otelExporterOtlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "",
  uploadsDir: process.env.UPLOADS_DIR ?? "uploads",
  uploadsProvider: process.env.UPLOADS_PROVIDER ?? "local",
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  supabaseBucket: process.env.SUPABASE_BUCKET ?? "librarypro-assets",
};
