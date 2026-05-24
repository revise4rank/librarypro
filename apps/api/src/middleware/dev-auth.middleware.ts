import type { NextFunction, Request, Response } from "express";

export function devAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  const role = req.header("x-dev-role");
  const userId = req.header("x-dev-user-id");
  const libraryId = req.header("x-dev-library-id");

  if (!role || !userId) {
    return next();
  }

  req.auth = {
    userId,
    role: role as "SUPER_ADMIN" | "LIBRARY_OWNER" | "STUDENT",
    libraryIds: libraryId ? [libraryId] : [],
    sessionVersion: 1,
  };

  return next();
}
