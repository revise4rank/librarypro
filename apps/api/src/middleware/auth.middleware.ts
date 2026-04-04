import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../lib/auth";
import { AppError } from "../lib/errors";
import { requireDb } from "../lib/db";
import { AuthRepository } from "../repositories/auth.repository";

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

export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const authorization = req.header("authorization");
  const cookieToken = readCookie(req.header("cookie"), "lp_access");

  if (!authorization && !cookieToken) {
    return next();
  }

  let token = cookieToken;

  if (authorization) {
    const [scheme, bearerToken] = authorization.split(" ");
    if (scheme !== "Bearer" || !bearerToken) {
      return next(new AppError(401, "Invalid authorization header", "INVALID_AUTH_HEADER"));
    }
    token = bearerToken;
  }

  if (!token) {
    return next();
  }

  try {
    const payload = verifyAccessToken(token);
    const repository = new AuthRepository(requireDb());
    repository
      .getSessionSnapshot(payload.userId)
      .then((snapshot) => {
        if (!snapshot || !snapshot.is_active) {
          return next(new AppError(401, "Account is inactive", "ACCOUNT_INACTIVE"));
        }

        if (snapshot.session_version !== payload.sessionVersion) {
          return next(new AppError(401, "Session expired. Please login again.", "SESSION_EXPIRED"));
        }

        req.auth = {
          userId: payload.userId,
          role: payload.role,
          libraryIds: payload.libraryIds,
          sessionVersion: payload.sessionVersion,
        };
        return next();
      })
      .catch((error) => next(error));
    return;
  } catch {
    return next(new AppError(401, "Invalid or expired token", "INVALID_TOKEN"));
  }
}
