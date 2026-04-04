import { z } from "zod";

export const searchLibrariesQuerySchema = z.object({
  q: z.string().trim().optional(),
  city: z.string().trim().optional(),
  area: z.string().trim().optional(),
  amenities: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value.split(",").map((item) => item.trim()).filter(Boolean) : [])),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  availableOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().positive().max(100).optional(),
  limit: z.coerce.number().int().positive().max(50).optional().default(20),
  page: z.coerce.number().int().positive().optional().default(1),
});

export const librarySuggestionsQuerySchema = z.object({
  q: z.string().trim().optional().default(""),
  limit: z.coerce.number().int().positive().max(10).optional().default(6),
});

export const subdomainAvailabilitySchema = z.object({
  subdomain: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/),
});

export const savePublicProfileBodySchema = z.object({
  subdomain: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/),
  brandLogoUrl: z.string().trim().max(1000).optional().default(""),
  heroBannerUrl: z.string().trim().max(1000).optional().default(""),
  heroTitle: z.string().trim().min(10).max(220),
  heroTagline: z.string().trim().max(500).optional().default(""),
  aboutText: z.string().trim().max(4000).optional().default(""),
  contactName: z.string().trim().max(150).optional().default(""),
  contactPhone: z.string().trim().max(20).optional().default(""),
  whatsappPhone: z.string().trim().max(20).optional().default(""),
  email: z.string().trim().email().optional().or(z.literal("")).default(""),
  addressText: z.string().trim().min(5).max(1000),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  landmark: z.string().trim().max(255).optional().default(""),
  businessHours: z.string().trim().max(120).optional().default(""),
  amenities: z.array(z.string().trim().min(1).max(80)).max(50).default([]),
  galleryImages: z.array(z.string().trim().min(1).max(500)).max(30).default([]),
  seoTitle: z.string().trim().max(220).optional().default(""),
  seoDescription: z.string().trim().max(500).optional().default(""),
  metaKeywords: z.string().trim().max(500).optional().default(""),
  showInMarketplace: z.boolean().default(true),
  allowDirectContact: z.boolean().default(true),
  adBudget: z.number().nonnegative().default(0),
  highlightOffer: z.string().trim().max(255).optional().default(""),
  offerExpiresAt: z.string().trim().optional().or(z.literal("")).default(""),
  themePrimary: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).default("#d2723d"),
  themeAccent: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).default("#2f8f88"),
  themeSurface: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).default("#fff9f0"),
});

export const publishPublicProfileBodySchema = z.object({
  isPublished: z.boolean(),
});

export const createContactLeadBodySchema = z.object({
  channel: z.enum(["CALL", "WHATSAPP", "CHAT", "FORM"]),
  studentName: z.string().trim().max(150).optional(),
  studentPhone: z.string().trim().max(20).optional(),
  studentEmail: z.string().trim().email().optional(),
  message: z.string().trim().max(1000).optional(),
  sourcePage: z.enum(["MARKETPLACE", "LIBRARY_SITE"]).default("MARKETPLACE"),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export const ownerLeadsQuerySchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "WON", "CLOSED"]).optional(),
});

export const updateOwnerLeadBodySchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "WON", "CLOSED"]).optional(),
  assigneeLabel: z.string().trim().max(120).optional().or(z.literal("")),
  followUpAt: z.string().trim().optional().or(z.literal("")),
  ownerNotes: z.string().trim().max(2000).optional().or(z.literal("")),
  markContactedNow: z.boolean().optional().default(false),
});

export const createLibraryReviewBodySchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  reviewText: z.string().trim().min(8).max(1200),
});

export const reportLibraryReviewBodySchema = z.object({
  reason: z.string().trim().min(6).max(600),
});

export const moderateLibraryReviewBodySchema = z.object({
  action: z.enum(["HIDE", "RESTORE"]),
  reason: z.string().trim().max(600).optional().or(z.literal("")),
});
