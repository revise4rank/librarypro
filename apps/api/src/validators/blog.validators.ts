import { z } from "zod";

const blogBlockSchema = z.object({
  type: z.enum(["heading", "paragraph", "list", "quote", "cta", "faq"]),
  text: z.string().trim().max(4000).optional().or(z.literal("")),
  title: z.string().trim().max(240).optional().or(z.literal("")),
  question: z.string().trim().max(240).optional().or(z.literal("")),
  answer: z.string().trim().max(1000).optional().or(z.literal("")),
  items: z.array(z.string().trim().min(1).max(500)).max(12).optional(),
});

export const blogPostBodySchema = z.object({
  title: z.string().trim().min(8).max(180),
  slug: z.string().trim().min(4).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  category: z.string().trim().min(2).max(80).default("Library Growth"),
  excerpt: z.string().trim().min(20).max(420),
  coverImageUrl: z.string().trim().max(1000).optional().or(z.literal("")),
  seoTitle: z.string().trim().max(180).optional().or(z.literal("")),
  seoDescription: z.string().trim().max(320).optional().or(z.literal("")),
  readTimeMinutes: z.coerce.number().int().min(1).max(60).default(6),
  contentJson: z.array(blogBlockSchema).min(1).max(80),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
});

export const updateBlogPostBodySchema = blogPostBodySchema.partial();
