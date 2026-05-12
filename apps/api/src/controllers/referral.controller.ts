import type { Request, Response } from "express";
import { AppError } from "../lib/errors";
import {
  getOwnerReferralDashboard,
  listAdminReferrals,
  updateAdminReferralStatus,
} from "../services/referral.service";

function ownerLibraryId(req: Request) {
  return req.tenant?.libraryId ?? req.auth?.libraryIds[0] ?? null;
}

export async function getOwnerReferralsController(req: Request, res: Response) {
  const libraryId = ownerLibraryId(req);
  if (!libraryId) {
    throw new AppError(400, "Owner library context missing", "LIBRARY_CONTEXT_REQUIRED");
  }
  const data = await getOwnerReferralDashboard(libraryId);
  res.json({ success: true, data });
}

export async function listAdminReferralsController(_req: Request, res: Response) {
  const data = await listAdminReferrals();
  res.json({ success: true, data });
}

export async function updateAdminReferralStatusController(req: Request, res: Response) {
  const referralId = Array.isArray(req.params.referralId) ? req.params.referralId[0] : req.params.referralId;
  if (!referralId) {
    throw new AppError(400, "Referral id is required", "REFERRAL_ID_REQUIRED");
  }
  const status = String(req.body.status ?? "").trim() as "PENDING" | "QUALIFIED" | "PAID" | "REJECTED";
  if (!["PENDING", "QUALIFIED", "PAID", "REJECTED"].includes(status)) {
    throw new AppError(400, "Invalid referral status", "INVALID_REFERRAL_STATUS");
  }
  const data = await updateAdminReferralStatus({
    referralId,
    status,
  });
  if (!data) {
    throw new AppError(404, "Referral not found", "REFERRAL_NOT_FOUND");
  }
  res.json({ success: true, data });
}
