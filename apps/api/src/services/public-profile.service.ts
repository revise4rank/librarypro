import { AppError } from "../lib/errors";
import { deleteCacheByPrefixes, getCacheJson, setCacheJson } from "../lib/cache";
import { requireDb } from "../lib/db";
import {
  type LibraryReviewRow,
  type LibraryReviewReportRow,
  type OwnerLeadRow,
  PublicProfileRepository,
  type PublicLibrarySearchResult,
  type PublicLibrarySearchRow,
  type SavePublicProfileInput,
} from "../repositories/public-profile.repository";

const RESERVED_SUBDOMAINS = new Set(["www", "admin", "api", "app", "assets"]);
const CACHE_TTL_MS = 30_000;

function repository() {
  return new PublicProfileRepository(requireDb());
}

export async function invalidatePublicProfileCache(input?: { slugOrSubdomain?: string; libraryId?: string }) {
  const prefixes = [
    "marketplace-search:",
    "marketplace-suggestions:",
    input?.slugOrSubdomain ? `public-profile:${input.slugOrSubdomain}` : null,
  ].filter(Boolean) as string[];

  await deleteCacheByPrefixes(prefixes);
}

export async function checkSubdomainAvailability(subdomain: string, excludeLibraryId?: string) {
  if (RESERVED_SUBDOMAINS.has(subdomain)) {
    return { available: false, reason: "reserved" as const };
  }

  const available = await repository().isSubdomainAvailable(subdomain, excludeLibraryId);
  return { available, reason: available ? null : ("taken" as const) };
}

export async function saveOwnerPublicProfile(input: SavePublicProfileInput) {
  const availability = await checkSubdomainAvailability(input.subdomain, input.libraryId);
  if (!availability.available) {
    throw new AppError(409, "Requested subdomain is not available", "SUBDOMAIN_TAKEN");
  }

  const saved = await repository().saveProfile(input);
  await repository().refreshMarketplaceSearchIndex().catch(() => undefined);
  await invalidatePublicProfileCache({
    slugOrSubdomain: input.subdomain,
    libraryId: input.libraryId,
  });
  return saved;
}

export async function publishOwnerPublicProfile(libraryId: string, isPublished: boolean) {
  const updated = await repository().setPublished(libraryId, isPublished);
  if (!updated) {
    throw new AppError(404, "Public profile not found", "PUBLIC_PROFILE_NOT_FOUND");
  }

  await repository().refreshMarketplaceSearchIndex().catch(() => undefined);
  await invalidatePublicProfileCache({
    slugOrSubdomain: updated.subdomain,
    libraryId,
  });
  return updated;
}

export async function getOwnerPublicProfile(libraryId: string) {
  return repository().findOwnerProfileByLibraryId(libraryId);
}

export async function getPublicLibraryProfile(value: string) {
  const cacheKey = `public-profile:${value}`;
  const cached = await getCacheJson<PublicLibrarySearchRow | null>(cacheKey);
  if (cached) {
    return cached;
  }

  const profile = await repository().findBySlugOrSubdomain(value);
  if (!profile) {
    throw new AppError(404, "Public library profile not found", "PUBLIC_LIBRARY_NOT_FOUND");
  }

  await setCacheJson(cacheKey, profile, CACHE_TTL_MS);
  return profile;
}

export async function searchMarketplaceLibraries(params: {
  q?: string;
  city?: string;
  area?: string;
  amenities?: string[];
  minPrice?: number;
  maxPrice?: number;
  availableOnly?: boolean;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  limit: number;
  page: number;
}): Promise<PublicLibrarySearchResult> {
  const cacheKey = `marketplace-search:${JSON.stringify(params)}`;
  const cached = await getCacheJson<PublicLibrarySearchResult>(cacheKey);
  if (cached) {
    return cached;
  }

  const result = await repository().search(params);
  await setCacheJson(cacheKey, result, CACHE_TTL_MS);
  return result;
}

export async function searchMarketplaceSuggestions(params: { q: string; limit: number }) {
  const query = params.q.trim();
  if (!query) {
    return [];
  }

  const cacheKey = `marketplace-suggestions:${query}:${params.limit}`;
  const cached = await getCacheJson<string[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const result = await repository().searchSuggestions({
    q: query,
    limit: params.limit,
  });
  await setCacheJson(cacheKey, result, CACHE_TTL_MS);
  return result;
}

export async function createPublicLibraryContactLead(input: {
  slugOrSubdomain: string;
  channel: "CALL" | "WHATSAPP" | "CHAT" | "FORM";
  studentName?: string;
  studentPhone?: string;
  studentEmail?: string;
  message?: string;
  sourcePage: "MARKETPLACE" | "LIBRARY_SITE";
  metadata: Record<string, unknown>;
}) {
  const lead = await repository().createContactLead(input);
  if (!lead) {
    throw new AppError(404, "Public library profile not found", "PUBLIC_LIBRARY_NOT_FOUND");
  }

  return lead;
}

export async function listPublicLibraryReviews(slugOrSubdomain: string): Promise<LibraryReviewRow[]> {
  return repository().listLibraryReviews(slugOrSubdomain);
}

export async function createStudentLibraryReview(input: {
  libraryId: string;
  studentUserId: string;
  rating: number;
  reviewText: string;
}) {
  const allowed = await repository().hasStudentLibraryHistory(input.libraryId, input.studentUserId);
  if (!allowed) {
    throw new AppError(403, "Join the library before posting a review", "LIBRARY_REVIEW_NOT_ALLOWED");
  }

  const review = await repository().createOrUpdateLibraryReview(input);
  const profile = await repository().findOwnerProfileByLibraryId(input.libraryId);
  await invalidatePublicProfileCache({
    libraryId: input.libraryId,
    slugOrSubdomain: profile?.subdomain,
  });
  return review;
}

export async function reportLibraryReview(input: {
  reviewId: string;
  reporterUserId: string;
  reason: string;
}) {
  const report = await repository().reportLibraryReview(input);
  if (!report) {
    throw new AppError(404, "Review not found", "LIBRARY_REVIEW_NOT_FOUND");
  }

  return report;
}

export async function listAdminReviewReports(): Promise<LibraryReviewReportRow[]> {
  return repository().listReviewReports();
}

export async function moderateLibraryReview(input: {
  reviewId: string;
  action: "HIDE" | "RESTORE";
  reason?: string | null;
}) {
  const updated = await repository().moderateReview(input);
  if (!updated) {
    throw new AppError(404, "Review not found", "LIBRARY_REVIEW_NOT_FOUND");
  }

  const profile = await repository().findOwnerProfileByLibraryId(updated.library_id);
  await invalidatePublicProfileCache({
    libraryId: updated.library_id,
    slugOrSubdomain: profile?.subdomain,
  });
  return updated;
}

export async function listOwnerLeads(libraryId: string, status?: string | null): Promise<OwnerLeadRow[]> {
  return repository().listOwnerLeads(libraryId, status);
}

export async function updateOwnerLead(input: {
  libraryId: string;
  leadId: string;
  status?: string | null;
  assigneeLabel?: string | null;
  followUpAt?: string | null;
  ownerNotes?: string | null;
  lastContactedAt?: string | null;
}) {
  const updated = await repository().updateOwnerLead(input);
  if (!updated) {
    throw new AppError(404, "Lead not found", "LEAD_NOT_FOUND");
  }

  return updated;
}
