import type { Request, Response } from "express";
import { createAuditLog } from "../lib/audit";
import { AppError } from "../lib/errors";
import { saveUploadedAsset } from "../lib/storage";

export async function uploadPublicProfileAssetController(req: Request, res: Response) {
  if (!req.auth || req.auth.role !== "LIBRARY_OWNER") {
    throw new AppError(401, "Library owner authentication required", "OWNER_AUTH_REQUIRED");
  }

  if (!req.file) {
    throw new AppError(400, "File is required", "FILE_REQUIRED");
  }

  const libraryId = req.auth.libraryIds[0] ?? null;
  if (!libraryId) {
    throw new AppError(400, "Library context missing", "LIBRARY_CONTEXT_REQUIRED");
  }

  const stored = await saveUploadedAsset({
    file: req.file,
    libraryId,
  });

  await createAuditLog({
    actorUserId: req.auth.userId,
    libraryId,
    action: "public_profile.asset.uploaded",
    entityType: "public_profile_asset",
    entityId: stored.fileName,
    metadata: {
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: stored.url,
      provider: stored.provider,
    },
    ipAddress: req.ip,
    userAgent: req.header("user-agent") ?? null,
  });

  res.status(201).json({
    success: true,
    data: {
      fileName: stored.fileName,
      url: stored.url,
      provider: stored.provider,
      mimeType: req.file.mimetype,
      size: req.file.size,
    },
  });
}
