import type { Request, Response } from "express";
import { AppError } from "../lib/errors";
import { createSubscriptionRenewal, getBillingSubscription } from "../services/billing.service";
import { billingRenewBodySchema } from "../validators/billing.validators";

function getOwnerLibraryId(req: Request) {
  return req.tenant?.libraryId ?? req.auth?.libraryIds[0] ?? null;
}

export async function getBillingSubscriptionController(req: Request, res: Response) {
  const libraryId = getOwnerLibraryId(req);
  if (!libraryId) {
    throw new AppError(400, "Owner library context missing", "LIBRARY_CONTEXT_REQUIRED");
  }

  const data = await getBillingSubscription(libraryId);
  res.json({ success: true, data });
}

export async function renewBillingSubscriptionController(req: Request, res: Response) {
  const libraryId = getOwnerLibraryId(req);
  if (!libraryId) {
    throw new AppError(400, "Owner library context missing", "LIBRARY_CONTEXT_REQUIRED");
  }

  const parsed = billingRenewBodySchema.parse(req.body);
  const data = await createSubscriptionRenewal({
    libraryId,
    planCode: parsed.planCode,
  });

  res.status(201).json({ success: true, data });
}
