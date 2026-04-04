import type { Request, Response } from "express";
import { createAuditLog } from "../lib/audit";
import { checkSubdomainAvailability, createPublicLibraryContactLead, createStudentLibraryReview, getOwnerPublicProfile, getPublicLibraryProfile, listAdminReviewReports, listOwnerLeads, listPublicLibraryReviews, moderateLibraryReview, publishOwnerPublicProfile, reportLibraryReview, saveOwnerPublicProfile, searchMarketplaceLibraries, searchMarketplaceSuggestions, updateOwnerLead } from "../services/public-profile.service";
import { createContactLeadBodySchema, createLibraryReviewBodySchema, librarySuggestionsQuerySchema, moderateLibraryReviewBodySchema, ownerLeadsQuerySchema, publishPublicProfileBodySchema, reportLibraryReviewBodySchema, savePublicProfileBodySchema, searchLibrariesQuerySchema, subdomainAvailabilitySchema, updateOwnerLeadBodySchema } from "../validators/public-profile.validators";
import { AppError } from "../lib/errors";

export async function getSubdomainAvailabilityController(req: Request, res: Response) {
  const parsed = subdomainAvailabilitySchema.parse(req.query);
  const result = await checkSubdomainAvailability(parsed.subdomain, req.auth?.libraryIds[0]);
  res.json({ success: true, data: result });
}

export async function searchMarketplaceLibrariesController(req: Request, res: Response) {
  const parsed = searchLibrariesQuerySchema.parse(req.query);
  const results = await searchMarketplaceLibraries(parsed);
  res.json({
    success: true,
    data: results.rows,
    meta: {
      total: results.total,
      page: results.page,
      limit: results.limit,
      totalPages: Math.max(1, Math.ceil(results.total / results.limit)),
    },
  });
}

export async function searchMarketplaceSuggestionsController(req: Request, res: Response) {
  const parsed = librarySuggestionsQuerySchema.parse(req.query);
  const results = await searchMarketplaceSuggestions(parsed);
  res.json({ success: true, data: results });
}

export async function getPublicLibraryProfileController(req: Request, res: Response) {
  const value = Array.isArray(req.params.slugOrSubdomain)
    ? req.params.slugOrSubdomain[0]
    : req.params.slugOrSubdomain;
  const profile = await getPublicLibraryProfile(value);
  res.json({ success: true, data: profile });
}

export async function saveOwnerPublicProfileController(req: Request, res: Response) {
  if (!req.auth || req.auth.role !== "LIBRARY_OWNER" || !req.auth.libraryIds[0]) {
    throw new AppError(401, "Library owner authentication required", "OWNER_AUTH_REQUIRED");
  }

  const parsed = savePublicProfileBodySchema.parse(req.body);
  const profile = await saveOwnerPublicProfile({
    libraryId: req.auth.libraryIds[0],
    ...parsed,
    brandLogoUrl: parsed.brandLogoUrl,
    heroBannerUrl: parsed.heroBannerUrl,
    offerExpiresAt: parsed.offerExpiresAt,
    latitude: parsed.latitude ?? null,
    longitude: parsed.longitude ?? null,
  });

  res.status(201).json({ success: true, data: profile });
}

export async function getOwnerPublicProfileController(req: Request, res: Response) {
  if (!req.auth || req.auth.role !== "LIBRARY_OWNER" || !req.auth.libraryIds[0]) {
    throw new AppError(401, "Library owner authentication required", "OWNER_AUTH_REQUIRED");
  }

  const profile = await getOwnerPublicProfile(req.auth.libraryIds[0]);
  res.json({ success: true, data: profile });
}

export async function publishOwnerPublicProfileController(req: Request, res: Response) {
  if (!req.auth || req.auth.role !== "LIBRARY_OWNER" || !req.auth.libraryIds[0]) {
    throw new AppError(401, "Library owner authentication required", "OWNER_AUTH_REQUIRED");
  }

  const parsed = publishPublicProfileBodySchema.parse(req.body);
  const profile = await publishOwnerPublicProfile(req.auth.libraryIds[0], parsed.isPublished);
  res.json({ success: true, data: profile });
}

export async function createPublicLibraryContactLeadController(req: Request, res: Response) {
  const value = Array.isArray(req.params.slugOrSubdomain)
    ? req.params.slugOrSubdomain[0]
    : req.params.slugOrSubdomain;
  const parsed = createContactLeadBodySchema.parse(req.body);
  const lead = await createPublicLibraryContactLead({
    slugOrSubdomain: value,
    ...parsed,
  });

  res.status(201).json({ success: true, data: lead });
}

export async function listPublicLibraryReviewsController(req: Request, res: Response) {
  const value = Array.isArray(req.params.slugOrSubdomain)
    ? req.params.slugOrSubdomain[0]
    : req.params.slugOrSubdomain;
  const data = await listPublicLibraryReviews(value);
  res.json({ success: true, data });
}

export async function createStudentLibraryReviewController(req: Request, res: Response) {
  if (!req.auth || req.auth.role !== "STUDENT") {
    throw new AppError(401, "Student authentication required", "STUDENT_AUTH_REQUIRED");
  }

  const libraryId = Array.isArray(req.params.libraryId) ? req.params.libraryId[0] : req.params.libraryId;
  if (!libraryId) {
    throw new AppError(400, "Library id is required", "LIBRARY_ID_REQUIRED");
  }

  const parsed = createLibraryReviewBodySchema.parse(req.body);
  const data = await createStudentLibraryReview({
    libraryId,
    studentUserId: req.auth.userId,
    rating: parsed.rating,
    reviewText: parsed.reviewText,
  });
  res.status(201).json({ success: true, data });
}

export async function reportLibraryReviewController(req: Request, res: Response) {
  if (!req.auth) {
    throw new AppError(401, "Authentication required", "AUTH_REQUIRED");
  }

  const reviewId = Array.isArray(req.params.reviewId) ? req.params.reviewId[0] : req.params.reviewId;
  if (!reviewId) {
    throw new AppError(400, "Review id is required", "REVIEW_ID_REQUIRED");
  }

  const parsed = reportLibraryReviewBodySchema.parse(req.body);
  const data = await reportLibraryReview({
    reviewId,
    reporterUserId: req.auth.userId,
    reason: parsed.reason,
  });
  await createAuditLog({
    actorUserId: req.auth.userId,
    libraryId: null,
    action: "public.review.report",
    entityType: "library_review",
    entityId: reviewId,
    metadata: { reason: parsed.reason },
    ipAddress: req.ip,
    userAgent: req.header("user-agent") ?? null,
  });
  res.status(201).json({ success: true, data });
}

export async function listAdminReviewReportsController(req: Request, res: Response) {
  const data = await listAdminReviewReports();
  res.json({ success: true, data });
}

export async function moderateLibraryReviewController(req: Request, res: Response) {
  const reviewId = Array.isArray(req.params.reviewId) ? req.params.reviewId[0] : req.params.reviewId;
  if (!reviewId) {
    throw new AppError(400, "Review id is required", "REVIEW_ID_REQUIRED");
  }
  const parsed = moderateLibraryReviewBodySchema.parse(req.body);
  const data = await moderateLibraryReview({
    reviewId,
    action: parsed.action,
    reason: parsed.reason || null,
  });
  await createAuditLog({
    actorUserId: req.auth?.userId ?? null,
    libraryId: null,
    action: "admin.review.moderate",
    entityType: "library_review",
    entityId: reviewId,
    metadata: { action: parsed.action, reason: parsed.reason || null },
    ipAddress: req.ip,
    userAgent: req.header("user-agent") ?? null,
  });
  res.json({ success: true, data });
}

export async function listOwnerLeadsController(req: Request, res: Response) {
  if (!req.auth || req.auth.role !== "LIBRARY_OWNER" || !req.auth.libraryIds[0]) {
    throw new AppError(401, "Library owner authentication required", "OWNER_AUTH_REQUIRED");
  }

  const parsed = ownerLeadsQuerySchema.parse(req.query);
  const data = await listOwnerLeads(req.auth.libraryIds[0], parsed.status ?? null);
  res.json({ success: true, data });
}

export async function updateOwnerLeadController(req: Request, res: Response) {
  if (!req.auth || req.auth.role !== "LIBRARY_OWNER" || !req.auth.libraryIds[0]) {
    throw new AppError(401, "Library owner authentication required", "OWNER_AUTH_REQUIRED");
  }

  const leadId = Array.isArray(req.params.leadId) ? req.params.leadId[0] : req.params.leadId;
  if (!leadId) {
    throw new AppError(400, "Lead id is required", "LEAD_ID_REQUIRED");
  }

  const parsed = updateOwnerLeadBodySchema.parse(req.body);
  const data = await updateOwnerLead({
    libraryId: req.auth.libraryIds[0],
    leadId,
    status: parsed.status ?? null,
    assigneeLabel: parsed.assigneeLabel || null,
    followUpAt: parsed.followUpAt || null,
    ownerNotes: parsed.ownerNotes || null,
    lastContactedAt: parsed.markContactedNow ? new Date().toISOString() : null,
  });
  res.json({ success: true, data });
}
