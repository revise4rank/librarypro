import type { Request, Response } from "express";
import { AppError } from "../lib/errors";
import { getStudentEntryQr, scanCheckIn, scanCheckOut } from "../services/checkin.service";
import { studentQrActionBodySchema } from "../validators/owner-operations.validators";

function requireStudentCheckinContext(req: Request) {
  if (!req.auth || req.auth.role !== "STUDENT") {
    throw new AppError(401, "Student authentication required", "STUDENT_AUTH_REQUIRED");
  }

  const libraryId = req.tenant?.libraryId ?? req.auth.libraryIds[0];
  if (!libraryId) {
    throw new AppError(400, "Student tenant context missing", "STUDENT_LIBRARY_REQUIRED");
  }

  return {
    libraryId,
    studentUserId: req.auth.userId,
  };
}

function requireStudentOnly(req: Request) {
  if (!req.auth || req.auth.role !== "STUDENT") {
    throw new AppError(401, "Student authentication required", "STUDENT_AUTH_REQUIRED");
  }

  return {
    studentUserId: req.auth.userId,
  };
}

export async function getStudentEntryQrController(req: Request, res: Response) {
  const { libraryId, studentUserId } = requireStudentCheckinContext(req);
  const result = await getStudentEntryQr(libraryId, studentUserId);

  res.status(200).json({
    success: true,
    data: result,
  });
}

export async function scanCheckInController(req: Request, res: Response) {
  const { studentUserId } = requireStudentOnly(req);
  const parsed = studentQrActionBodySchema.parse(req.body);
  const result = await scanCheckIn({
    studentUserId,
    qrRawPayload: parsed.qrPayload,
    clientEventId: parsed.clientEventId || undefined,
    scannedAtDevice: parsed.scannedAtDevice || undefined,
  });

  res.status(201).json({
    success: true,
    data: result,
  });
}

export async function scanCheckOutController(req: Request, res: Response) {
  const { studentUserId } = requireStudentOnly(req);
  const parsed = studentQrActionBodySchema.parse(req.body);
  const result = await scanCheckOut({
    studentUserId,
    qrRawPayload: parsed.qrPayload,
    clientEventId: parsed.clientEventId || undefined,
    scannedAtDevice: parsed.scannedAtDevice || undefined,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
}
