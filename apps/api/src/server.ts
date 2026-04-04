import express from "express";
import http from "node:http";
import path from "node:path";
import { createClient } from "redis";
import compression from "compression";
import { ZodError } from "zod";
import { env } from "./config/env";
import { db } from "./lib/db";
import { captureException, initializeMonitoring, shutdownMonitoring } from "./lib/monitoring";
import { authMiddleware } from "./middleware/auth.middleware";
import { csrfProtectionMiddleware } from "./middleware/csrf.middleware";
import { initializeRealtimeServer } from "./lib/realtime";
import { apiRateLimitMiddleware, authRateLimitMiddleware, publicReadRateLimitMiddleware } from "./middleware/rate-limit.middleware";
import { requestLoggerMiddleware } from "./middleware/request-logger.middleware";
import { subscriptionEnforcementMiddleware } from "./middleware/subscription-enforcement.middleware";
import { tenantMiddleware } from "./middleware/tenant.middleware";
import { router } from "./routes";

export function createServer() {
  const app = express();

  app.set("trust proxy", env.apiTrustedProxyCount);
  const baseDomain = env.baseDomain.toLowerCase();
  const webAppHost = env.webAppUrl.replace(/^https?:\/\//, "").split(":")[0].toLowerCase();

  function isAllowedOrigin(origin: string) {
    try {
      const parsed = new URL(origin);
      const host = parsed.hostname.toLowerCase();
      return (
        host === webAppHost ||
        host === baseDomain ||
        host.endsWith(`.${baseDomain}`) ||
        host === "localhost" ||
        host === "127.0.0.1"
      );
    } catch {
      return false;
    }
  }

  app.use((req, res, next) => {
    const origin = req.header("origin");
    if (origin && isAllowedOrigin(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Vary", "Origin");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");

    if (req.method === "OPTIONS") {
      if (origin && !isAllowedOrigin(origin)) {
        return res.sendStatus(403);
      }
      return res.sendStatus(204);
    }

    return next();
  });
  if (env.apiCompressionEnabled) {
    app.use(compression());
  }
  app.use((req, res, next) => {
    if (req.method === "GET" && (req.path.startsWith("/v1/public/") || req.path.startsWith("/v1/offers"))) {
      res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
    } else if (req.method === "GET" && (req.path === "/health" || req.path === "/ready")) {
      res.setHeader("Cache-Control", "no-store");
    }
    next();
  });
  app.use(requestLoggerMiddleware);
  app.use(["/v1/public", "/v1/offers"], publicReadRateLimitMiddleware);
  app.use(apiRateLimitMiddleware);
  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });
  app.get("/ready", async (_req, res) => {
    const checks: Record<string, { ok: boolean; detail?: string }> = {
      database: { ok: false },
      redis: { ok: true, detail: env.redisUrl ? undefined : "not_configured" },
    };

    try {
      if (!db) {
        throw new Error("DATABASE_URL_MISSING");
      }
      await db.query("select 1");
      checks.database = { ok: true };
    } catch (error) {
      checks.database = {
        ok: false,
        detail: error instanceof Error ? error.message : "database_check_failed",
      };
    }

    if (env.redisUrl) {
      let redisClient: ReturnType<typeof createClient> | null = null;
      try {
        redisClient = createClient({ url: env.redisUrl });
        await redisClient.connect();
        await redisClient.ping();
        checks.redis = { ok: true };
      } catch (error) {
        checks.redis = {
          ok: false,
          detail: error instanceof Error ? error.message : "redis_check_failed",
        };
      } finally {
        if (redisClient) {
          await redisClient.quit().catch(() => undefined);
        }
      }
    }

    const ok = Object.values(checks).every((check) => check.ok);
    return res.status(ok ? 200 : 503).json({
      ok,
      checks,
      ts: new Date().toISOString(),
    });
  });
  app.use("/v1/billing/razorpay/webhook", express.raw({ type: "application/json" }));
  app.use(express.json());
  app.use("/uploads", express.static(path.resolve(env.uploadsDir)));
  app.use(authMiddleware);
  app.use(csrfProtectionMiddleware);
  app.use(tenantMiddleware);
  app.use(subscriptionEnforcementMiddleware);
  app.use("/v1/auth/login", authRateLimitMiddleware);
  app.use("/v1", router);

  app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const isZodError = error instanceof ZodError;
    const statusCode = typeof error?.statusCode === "number" ? error.statusCode : isZodError ? 400 : 500;
    const message = isZodError
      ? error.issues.map((issue) => `${issue.path.join(".") || "field"}: ${issue.message}`).join(" | ")
      : error?.message ?? "Unexpected error";
    if (statusCode >= 500) {
      captureException(error, {
        path: _req.originalUrl,
        method: _req.method,
        userId: _req.auth?.userId ?? null,
        libraryId: _req.tenant?.libraryId ?? null,
      });
    }
    res.status(statusCode).json({
      success: false,
      error: {
        code: error?.code ?? (isZodError ? "VALIDATION_ERROR" : "INTERNAL_SERVER_ERROR"),
        message,
      },
    });
  });

  return app;
}

const app = createServer();

if (process.env.NODE_ENV !== "test") {
  const start = async () => {
    initializeMonitoring();
    const server = http.createServer(app);
    await initializeRealtimeServer(server);

    const shutdown = async () => {
      server.close(() => undefined);
      await shutdownMonitoring();
      process.exit(0);
    };

    process.once("SIGINT", () => {
      void shutdown();
    });
    process.once("SIGTERM", () => {
      void shutdown();
    });

    server.listen(env.port, () => {
      console.info(`LibraryPro API running on http://127.0.0.1:${env.port}`);
    });
  };

  start().catch((error) => {
    console.error("Failed to start API server", error);
    process.exit(1);
  });
}
