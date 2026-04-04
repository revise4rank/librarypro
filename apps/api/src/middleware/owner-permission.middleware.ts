import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors";
import { requireDb } from "../lib/db";
import { OwnerOperationsRepository } from "../repositories/owner-operations.repository";

export function requireOwnerPermission(permission: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth || req.auth.role !== "LIBRARY_OWNER" || !req.auth.libraryIds[0]) {
      return next(new AppError(401, "Library owner authentication required", "OWNER_AUTH_REQUIRED"));
    }

    const libraryId = req.auth.libraryIds[0];
    const repo = new OwnerOperationsRepository(requireDb());
    void repo
      .getOwnerAdminAccess(libraryId, req.auth.userId)
      .then((access) => {
        if (!access) {
          return next(new AppError(403, "Library admin access not found", "OWNER_ADMIN_NOT_FOUND"));
        }

        if (access.is_head_admin || access.permissions.includes(permission)) {
          return next();
        }

        return next(new AppError(403, `Missing owner permission: ${permission}`, "OWNER_PERMISSION_DENIED"));
      })
      .catch(next);
  };
}
