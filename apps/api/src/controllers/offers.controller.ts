import type { Request, Response } from "express";
import { AppError } from "../lib/errors";
import { createOffer, listAdminOffers, listOfferCategories, listOffers, trackOfferClick, trackOfferView } from "../services/offers.service";
import { createOfferBodySchema, listOffersQuerySchema, trackOfferClickBodySchema } from "../validators/offers.validators";

function requireOwner(req: Request) {
  if (!req.auth || req.auth.role !== "LIBRARY_OWNER" || !req.auth.libraryIds[0]) {
    throw new AppError(401, "Library owner authentication required", "OWNER_AUTH_REQUIRED");
  }
  return {
    userId: req.auth.userId,
    libraryId: req.auth.libraryIds[0],
  };
}

function requireAdmin(req: Request) {
  if (!req.auth || req.auth.role !== "SUPER_ADMIN") {
    throw new AppError(401, "Super admin authentication required", "ADMIN_AUTH_REQUIRED");
  }
  return {
    userId: req.auth.userId,
  };
}

export async function listOfferCategoriesController(_req: Request, res: Response) {
  const data = await listOfferCategories();
  res.json({ success: true, data });
}

export async function listOffersController(req: Request, res: Response) {
  const parsed = listOffersQuerySchema.parse(req.query);
  const data = await listOffers({
    category: parsed.category || undefined,
    city: parsed.city || undefined,
    area: parsed.area || undefined,
    featured: parsed.featured,
    libraryId: req.tenant?.libraryId ?? req.auth?.libraryIds?.[0] ?? null,
    page: parsed.page,
    limit: parsed.limit,
  });
  res.json({
    success: true,
    data: data.rows,
    meta: {
      total: data.total,
      page: data.page,
      limit: data.limit,
      totalPages: Math.max(1, Math.ceil(data.total / data.limit)),
    },
  });
}

export async function trackOfferViewController(req: Request, res: Response) {
  const offerId = Array.isArray(req.params.offerId) ? req.params.offerId[0] : req.params.offerId;
  if (!offerId) {
    throw new AppError(400, "Offer id is required", "OFFER_ID_REQUIRED");
  }

  await trackOfferView({
    offerId,
    studentUserId: req.auth?.role === "STUDENT" ? req.auth.userId : null,
    libraryId: req.tenant?.libraryId ?? req.auth?.libraryIds?.[0] ?? null,
    city: null,
  });
  res.status(201).json({ success: true });
}

export async function trackOfferClickController(req: Request, res: Response) {
  const parsed = trackOfferClickBodySchema.parse(req.body);
  await trackOfferClick({
    offerId: parsed.offerId,
    actionType: parsed.actionType,
    studentUserId: req.auth?.role === "STUDENT" ? req.auth.userId : null,
    libraryId: req.tenant?.libraryId ?? req.auth?.libraryIds?.[0] ?? null,
  });
  res.status(201).json({ success: true });
}

export async function listAdminOffersController(_req: Request, res: Response) {
  const data = await listAdminOffers();
  res.json({ success: true, data });
}

export async function createAdminOfferController(req: Request, res: Response) {
  const { userId } = requireAdmin(req);
  const parsed = createOfferBodySchema.parse(req.body);
  const data = await createOffer({
    categoryId: parsed.categoryId,
    sourceType: "ADMIN",
    createdByUserId: userId,
    title: parsed.title,
    imageUrl: parsed.imageUrl || null,
    shortDescription: parsed.shortDescription,
    longDescription: parsed.longDescription || null,
    city: parsed.city || null,
    area: parsed.area || null,
    targetLibraryId: parsed.targetLibraryId || null,
    validFrom: parsed.validFrom || null,
    validUntil: parsed.validUntil || null,
    ctaLabel: parsed.ctaLabel,
    ctaUrl: parsed.ctaUrl || null,
    contactPhone: parsed.contactPhone || null,
    isFeatured: parsed.isFeatured,
    status: parsed.status ?? "APPROVED",
    approvedByUserId: userId,
    reviewNotes: parsed.reviewNotes || null,
  });
  res.status(201).json({ success: true, data });
}

export async function createOwnerOfferController(req: Request, res: Response) {
  const { userId, libraryId } = requireOwner(req);
  const parsed = createOfferBodySchema.parse(req.body);
  const data = await createOffer({
    categoryId: parsed.categoryId,
    sourceType: "OWNER",
    createdByUserId: userId,
    ownerLibraryId: libraryId,
    title: parsed.title,
    imageUrl: parsed.imageUrl || null,
    shortDescription: parsed.shortDescription,
    longDescription: parsed.longDescription || null,
    city: parsed.city || null,
    area: parsed.area || null,
    targetLibraryId: parsed.targetLibraryId || libraryId,
    validFrom: parsed.validFrom || null,
    validUntil: parsed.validUntil || null,
    ctaLabel: parsed.ctaLabel,
    ctaUrl: parsed.ctaUrl || null,
    contactPhone: parsed.contactPhone || null,
    isFeatured: false,
    status: "PENDING",
    reviewNotes: parsed.reviewNotes || null,
  });
  res.status(201).json({ success: true, data });
}
