import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function readCookie(headerValue: string | undefined, name: string) {
  if (!headerValue) {
    return null;
  }

  for (const cookie of headerValue.split(";")) {
    const [rawKey, ...rawValue] = cookie.trim().split("=");
    if (rawKey !== name) {
      continue;
    }

    return decodeURIComponent(rawValue.join("="));
  }

  return null;
}

export function csrfProtectionMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method.toUpperCase())) {
    req.csrf = { required: false, validated: true };
    return next();
  }

  const hasCookieAuth = Boolean(readCookie(req.header("cookie"), "lp_access"));
  if (!hasCookieAuth) {
    req.csrf = { required: false, validated: true };
    return next();
  }

  const cookieToken = readCookie(req.header("cookie"), "lp_csrf");
  const headerToken = req.header("x-csrf-token");

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return next(new AppError(403, "CSRF validation failed", "CSRF_INVALID"));
  }

  req.csrf = { required: true, validated: true };
  return next();
}
