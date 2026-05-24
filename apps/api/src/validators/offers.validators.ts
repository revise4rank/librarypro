import { z } from "zod";

export const listOffersQuerySchema = z.object({
  category: z.string().trim().optional().default(""),
  city: z.string().trim().optional().default(""),
  area: z.string().trim().optional().default(""),
  featured: z.enum(["true", "false"]).optional().transform((value) => value === "true"),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(24).optional().default(12),
});

export const createOfferBodySchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string().trim().min(3).max(180),
  imageUrl: z.string().trim().max(1200).optional().or(z.literal("")),
  shortDescription: z.string().trim().min(10).max(320),
  longDescription: z.string().trim().max(4000).optional().or(z.literal("")),
  city: z.string().trim().max(120).optional().or(z.literal("")),
  area: z.string().trim().max(120).optional().or(z.literal("")),
  targetLibraryId: z.string().uuid().optional().or(z.literal("")),
  validFrom: z.string().trim().optional().or(z.literal("")),
  validUntil: z.string().trim().optional().or(z.literal("")),
  ctaLabel: z.enum(["View Details", "Contact", "Apply"]).default("View Details"),
  ctaUrl: z.string().trim().max(1200).optional().or(z.literal("")),
  contactPhone: z.string().trim().max(20).optional().or(z.literal("")),
  isFeatured: z.boolean().optional().default(false),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "EXPIRED"]).optional(),
  reviewNotes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const trackOfferClickBodySchema = z.object({
  offerId: z.string().uuid(),
  actionType: z.enum(["VIEW_DETAILS", "CONTACT", "APPLY"]),
});
