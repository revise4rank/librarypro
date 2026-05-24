import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors";
import type { user_role } from "../types/generated";

export function requireRole(roles: user_role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      return next(new AppError(401, "Authentication required", "UNAUTHENTICATED"));
    }

    if (!roles.includes(req.auth.role)) {
      return next(new AppError(403, "Insufficient permissions", "FORBIDDEN"));
    }

    if (
      req.tenant &&
      req.auth.role !== "SUPER_ADMIN" &&
      !req.auth.libraryIds.includes(req.tenant.libraryId)
    ) {
      return next(new AppError(403, "Tenant access denied", "TENANT_FORBIDDEN"));
    }

    return next();
  };
}
