import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { AppError } from "../lib/errors";
import { getTenantBySlug } from "../lib/tenant-cache";

const RESERVED_SUBDOMAINS = new Set(["www", "admin", "api"]);

function extractTenantSlug(hostHeader?: string): string | null {
  if (!hostHeader) return null;

  const host = hostHeader.split(":")[0].toLowerCase();
  const baseDomain = env.baseDomain.toLowerCase();
  const webAppHost = env.webAppUrl.replace(/^https?:\/\//, "").split(":")[0].toLowerCase();
  const apiPublicHost = env.apiPublicUrl.replace(/^https?:\/\//, "").split(":")[0].toLowerCase();

  if (host === "127.0.0.1" || host === "localhost" || host === webAppHost || (apiPublicHost && host === apiPublicHost)) {
    return null;
  }

  if (host === baseDomain || host === `www.${baseDomain}` || host === `admin.${baseDomain}`) {
    return null;
  }

  if (!host.endsWith(`.${baseDomain}`)) {
    throw new AppError(400, "Untrusted host header", "UNTRUSTED_HOST");
  }

  const slug = host.replace(`.${baseDomain}`, "");
  if (!slug || RESERVED_SUBDOMAINS.has(slug)) {
    return null;
  }

  return slug;
}

export async function tenantMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    const forwardedHost = req.headers["x-forwarded-host"];
    const forwardedValue = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost;
    const host = forwardedValue || req.headers.host;
    const trustedSlug = typeof req.headers["x-tenant-slug"] === "string" ? req.headers["x-tenant-slug"] : null;
    const internalTenantSecret =
      typeof req.headers["x-librarypro-internal-tenant-secret"] === "string"
        ? req.headers["x-librarypro-internal-tenant-secret"]
        : null;

    const slug =
      trustedSlug && internalTenantSecret && internalTenantSecret === env.internalTenantHeaderSecret
        ? trustedSlug
        : extractTenantSlug(host);

    if (!slug) {
      return next();
    }

    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      throw new AppError(404, "Library not found", "LIBRARY_NOT_FOUND");
    }

    if (tenant.status !== "ACTIVE") {
      throw new AppError(403, "Library is inactive", "LIBRARY_INACTIVE");
    }

    req.tenant = tenant;
    return next();
  } catch (error) {
    return next(error);
  }
}
