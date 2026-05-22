import type { Request, Response } from "express";
import { createAuditLog } from "../lib/audit";
import { AppError } from "../lib/errors";
import {
  archiveAdminBlog,
  createAdminBlog,
  getPublicBlogBySlug,
  listAdminBlogs,
  listPublicBlogs,
  updateAdminBlog,
} from "../services/blog.service";
import { getPlatformIntegrationSettings, publicPlatformSiteSettings } from "../services/platform-integrations.service";
import { blogPostBodySchema, updateBlogPostBodySchema } from "../validators/blog.validators";

function paramValue(value: string | string[] | undefined) {
  const resolved = Array.isArray(value) ? value[0] : value;
  if (!resolved) throw new AppError(400, "Missing route parameter", "MISSING_PARAM");
  return resolved;
}

export async function listPublicBlogsController(_req: Request, res: Response) {
  const data = await listPublicBlogs();
  res.json({ success: true, data });
}

export async function getPublicBlogController(req: Request, res: Response) {
  const data = await getPublicBlogBySlug(paramValue(req.params.slug));
  res.json({ success: true, data });
}

export async function getPublicSiteSettingsController(_req: Request, res: Response) {
  const settings = await getPlatformIntegrationSettings();
  res.json({ success: true, data: publicPlatformSiteSettings(settings) });
}

export async function listAdminBlogsController(_req: Request, res: Response) {
  const data = await listAdminBlogs();
  res.json({ success: true, data });
}

export async function createAdminBlogController(req: Request, res: Response) {
  if (!req.auth || req.auth.role !== "SUPER_ADMIN") {
    throw new AppError(401, "Super admin authentication required", "ADMIN_AUTH_REQUIRED");
  }
  const parsed = blogPostBodySchema.parse(req.body);
  const data = await createAdminBlog({ ...parsed, authorUserId: req.auth.userId });
  await createAuditLog({
    actorUserId: req.auth.userId,
    action: "admin.blog.create",
    entityType: "blog_post",
    entityId: data.id,
    metadata: { slug: data.slug, status: data.status },
    ipAddress: req.ip,
    userAgent: req.header("user-agent") ?? null,
  });
  res.status(201).json({ success: true, data });
}

export async function updateAdminBlogController(req: Request, res: Response) {
  if (!req.auth || req.auth.role !== "SUPER_ADMIN") {
    throw new AppError(401, "Super admin authentication required", "ADMIN_AUTH_REQUIRED");
  }
  const blogId = paramValue(req.params.blogId);
  const parsed = updateBlogPostBodySchema.parse(req.body);
  const data = await updateAdminBlog(blogId, parsed);
  await createAuditLog({
    actorUserId: req.auth.userId,
    action: "admin.blog.update",
    entityType: "blog_post",
    entityId: data.id,
    metadata: { slug: data.slug, status: data.status },
    ipAddress: req.ip,
    userAgent: req.header("user-agent") ?? null,
  });
  res.json({ success: true, data });
}

export async function archiveAdminBlogController(req: Request, res: Response) {
  if (!req.auth || req.auth.role !== "SUPER_ADMIN") {
    throw new AppError(401, "Super admin authentication required", "ADMIN_AUTH_REQUIRED");
  }
  const blogId = paramValue(req.params.blogId);
  const data = await archiveAdminBlog(blogId);
  await createAuditLog({
    actorUserId: req.auth.userId,
    action: "admin.blog.archive",
    entityType: "blog_post",
    entityId: data.id,
    metadata: {},
    ipAddress: req.ip,
    userAgent: req.header("user-agent") ?? null,
  });
  res.json({ success: true, data });
}
