import type { NextFunction, Request, Response } from "express";
import { requireDb } from "../lib/db";
import { AppError } from "../lib/errors";

export type PlatformPermission = "TENANTS" | "USERS" | "PAYMENTS" | "PLANS" | "CONTENT" | "OPS" | "SETTINGS" | "ACCESS";

export function requirePlatformPermission(permission: PlatformPermission) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.auth || req.auth.role !== "SUPER_ADMIN") {
        return next(new AppError(403, "Super admin access required", "SUPER_ADMIN_REQUIRED"));
      }

      const result = await requireDb().query<{ role_code: string; permissions: string[] }>(
        `
        SELECT role_code, permissions
        FROM platform_admin_permissions
        WHERE user_id = $1
        LIMIT 1
        `,
        [req.auth.userId],
      );
      const row = result.rows[0];

      if (!row || row.role_code === "SUPER_ADMIN_FULL" || row.permissions.includes(permission)) {
        return next();
      }

      return next(new AppError(403, "Platform permission denied", "PLATFORM_PERMISSION_DENIED"));
    } catch (error) {
      return next(error);
    }
  };
}
