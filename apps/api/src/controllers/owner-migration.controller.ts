import type { Request, Response } from "express";
import { AppError } from "../lib/errors";
import {
  buildOwnerMigrationCredentialPdf,
  commitOwnerMigration,
  downloadOwnerMigrationTemplate,
  getOwnerMigrationJob,
  getOwnerMigrationLoginStatus,
  listOwnerMigrationJobs,
  previewOwnerMigration,
} from "../services/owner-migration.service";

function requireOwnerContext(req: Request) {
  if (!req.auth || req.auth.role !== "LIBRARY_OWNER" || !req.auth.libraryIds[0]) {
    throw new AppError(401, "Library owner authentication required", "OWNER_AUTH_REQUIRED");
  }

  return {
    libraryId: req.auth.libraryIds[0],
    actorUserId: req.auth.userId,
  };
}

function paramValue(value: string | string[] | undefined) {
  if (!value) {
    throw new AppError(400, "Required route parameter missing", "PARAM_REQUIRED");
  }

  return Array.isArray(value) ? value[0] : value;
}

export async function downloadOwnerMigrationTemplateController(_req: Request, res: Response) {
  const buffer = await downloadOwnerMigrationTemplate();
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="booklib-library-migration-template.xlsx"');
  res.send(buffer);
}

export async function previewOwnerMigrationController(req: Request, res: Response) {
  const { libraryId, actorUserId } = requireOwnerContext(req);
  if (!req.file) {
    throw new AppError(400, "Upload a CSV or XLSX file first.", "MIGRATION_FILE_REQUIRED");
  }

  const data = await previewOwnerMigration({
    libraryId,
    actorUserId,
    file: req.file,
  });
  res.status(201).json({ success: true, data });
}

export async function commitOwnerMigrationController(req: Request, res: Response) {
  const { libraryId, actorUserId } = requireOwnerContext(req);
  const data = await commitOwnerMigration({
    libraryId,
    actorUserId,
    jobId: paramValue(req.params.jobId),
  });
  res.json({ success: true, data });
}

export async function listOwnerMigrationJobsController(req: Request, res: Response) {
  const { libraryId } = requireOwnerContext(req);
  const data = await listOwnerMigrationJobs(libraryId);
  res.json({ success: true, data });
}

export async function getOwnerMigrationJobController(req: Request, res: Response) {
  const { libraryId } = requireOwnerContext(req);
  const data = await getOwnerMigrationJob({
    libraryId,
    jobId: paramValue(req.params.jobId),
  });
  res.json({ success: true, data });
}

export async function downloadOwnerMigrationCredentialsController(req: Request, res: Response) {
  const { libraryId, actorUserId } = requireOwnerContext(req);
  const jobId = paramValue(req.params.jobId);
  const buffer = await buildOwnerMigrationCredentialPdf({ libraryId, actorUserId, jobId });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="booklib-migration-credentials-${jobId.slice(0, 8)}.pdf"`);
  res.send(buffer);
}

export async function getOwnerMigrationLoginStatusController(req: Request, res: Response) {
  const { libraryId } = requireOwnerContext(req);
  const data = await getOwnerMigrationLoginStatus({
    libraryId,
    q: typeof req.query.q === "string" ? req.query.q : "",
    status: typeof req.query.status === "string" ? req.query.status : "ALL",
    plan: typeof req.query.plan === "string" ? req.query.plan : "",
    room: typeof req.query.room === "string" ? req.query.room : "",
  });
  res.json({ success: true, data });
}
