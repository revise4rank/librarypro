import { requireDb } from "../lib/db";
import { AppError } from "../lib/errors";
import { OffersRepository, type OfferCategoryRow, type OfferRow } from "../repositories/offers.repository";

const CACHE_TTL_MS = 60_000;
const offersCache = new Map<string, { expiresAt: number; value: unknown }>();

function repository() {
  return new OffersRepository(requireDb());
}

function getCached<T>(key: string) {
  const cached = offersCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt < Date.now()) {
    offersCache.delete(key);
    return null;
  }
  return cached.value as T;
}

function setCached(key: string, value: unknown) {
  offersCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function invalidateOffersCache() {
  offersCache.clear();
}

export async function listOfferCategories() {
  const cacheKey = "offer-categories";
  const cached = getCached<OfferCategoryRow[]>(cacheKey);
  if (cached) return cached;
  const categories = await repository().listCategories();
  setCached(cacheKey, categories);
  return categories;
}

export async function listOffers(input: {
  category?: string;
  city?: string;
  area?: string;
  featured?: boolean;
  libraryId?: string | null;
  page: number;
  limit: number;
}) {
  const cacheKey = `offers:${JSON.stringify(input)}`;
  const cached = getCached<{ rows: OfferRow[]; total: number; page: number; limit: number }>(cacheKey);
  if (cached) return cached;
  const result = await repository().listOffers(input);
  setCached(cacheKey, result);
  return result;
}

export async function listAdminOffers() {
  return repository().listAdminOffers();
}

export async function createOffer(input: Parameters<OffersRepository["createOffer"]>[0]) {
  if (input.ctaUrl && !/^https?:\/\//i.test(input.ctaUrl)) {
    throw new AppError(400, "Offer CTA URL must be http/https", "INVALID_OFFER_URL");
  }
  const offer = await repository().createOffer(input);
  invalidateOffersCache();
  return offer;
}

export async function trackOfferView(input: Parameters<OffersRepository["trackView"]>[0]) {
  return repository().trackView(input);
}

export async function trackOfferClick(input: Parameters<OffersRepository["trackClick"]>[0]) {
  return repository().trackClick(input);
}
