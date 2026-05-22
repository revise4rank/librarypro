import { requireDb } from "../lib/db";
import { AppError } from "../lib/errors";

export type BlogBlock = {
  type: "heading" | "paragraph" | "list" | "quote" | "cta" | "faq";
  text?: string;
  title?: string;
  question?: string;
  answer?: string;
  items?: string[];
};

type BlogRow = {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  cover_image_url: string;
  seo_title: string;
  seo_description: string;
  read_time_minutes: number;
  content_json: BlogBlock[];
  status: "DRAFT" | "PUBLISHED";
  is_archived: boolean;
  published_at: string | null;
  author_name: string | null;
  created_at: string;
  updated_at: string;
};

export type BlogPostInput = {
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  coverImageUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  readTimeMinutes: number;
  contentJson: BlogBlock[];
  status: "DRAFT" | "PUBLISHED";
  authorUserId: string;
};

function mapBlog(row: BlogRow) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: row.category,
    excerpt: row.excerpt,
    coverImageUrl: row.cover_image_url,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    readTimeMinutes: row.read_time_minutes,
    contentJson: row.content_json,
    status: row.status,
    isArchived: row.is_archived,
    publishedAt: row.published_at,
    authorName: row.author_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const blogSelect = `
  SELECT
    b.id::text,
    b.title,
    b.slug,
    b.category,
    b.excerpt,
    b.cover_image_url,
    b.seo_title,
    b.seo_description,
    b.read_time_minutes,
    b.content_json,
    b.status,
    b.is_archived,
    b.published_at::text,
    u.full_name AS author_name,
    b.created_at::text,
    b.updated_at::text
  FROM blog_posts b
  LEFT JOIN users u ON u.id = b.author_user_id
`;

export async function listPublicBlogs() {
  const result = await requireDb().query<BlogRow>(
    `
    ${blogSelect}
    WHERE b.status = 'PUBLISHED' AND b.is_archived = FALSE
    ORDER BY b.published_at DESC NULLS LAST, b.created_at DESC
    `,
  );
  return result.rows.map(mapBlog);
}

export async function getPublicBlogBySlug(slug: string) {
  const result = await requireDb().query<BlogRow>(
    `
    ${blogSelect}
    WHERE b.slug = $1 AND b.status = 'PUBLISHED' AND b.is_archived = FALSE
    LIMIT 1
    `,
    [slug],
  );
  const row = result.rows[0];
  if (!row) throw new AppError(404, "Blog post not found", "BLOG_NOT_FOUND");
  return mapBlog(row);
}

export async function listAdminBlogs() {
  const result = await requireDb().query<BlogRow>(
    `
    ${blogSelect}
    WHERE b.is_archived = FALSE
    ORDER BY b.updated_at DESC
    `,
  );
  return result.rows.map(mapBlog);
}

export async function createAdminBlog(input: BlogPostInput) {
  const result = await requireDb().query<BlogRow>(
    `
    INSERT INTO blog_posts (
      title, slug, category, excerpt, cover_image_url, seo_title, seo_description,
      read_time_minutes, content_json, status, published_at, author_user_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, CASE WHEN $10 = 'PUBLISHED' THEN NOW() ELSE NULL END, $11)
    RETURNING
      id::text, title, slug, category, excerpt, cover_image_url, seo_title, seo_description,
      read_time_minutes, content_json, status, is_archived, published_at::text,
      (SELECT full_name FROM users WHERE id = $11) AS author_name,
      created_at::text, updated_at::text
    `,
    [
      input.title,
      input.slug,
      input.category,
      input.excerpt,
      input.coverImageUrl ?? "",
      input.seoTitle ?? "",
      input.seoDescription ?? "",
      input.readTimeMinutes,
      JSON.stringify(input.contentJson),
      input.status,
      input.authorUserId,
    ],
  );
  return mapBlog(result.rows[0]);
}

export async function updateAdminBlog(blogId: string, input: Partial<BlogPostInput>) {
  const existing = await requireDb().query<{ status: string }>("SELECT status FROM blog_posts WHERE id = $1 AND is_archived = FALSE LIMIT 1", [blogId]);
  if (!existing.rows[0]) throw new AppError(404, "Blog post not found", "BLOG_NOT_FOUND");

  const result = await requireDb().query<BlogRow>(
    `
    UPDATE blog_posts
    SET
      title = COALESCE($2, title),
      slug = COALESCE($3, slug),
      category = COALESCE($4, category),
      excerpt = COALESCE($5, excerpt),
      cover_image_url = COALESCE($6, cover_image_url),
      seo_title = COALESCE($7, seo_title),
      seo_description = COALESCE($8, seo_description),
      read_time_minutes = COALESCE($9, read_time_minutes),
      content_json = COALESCE($10::jsonb, content_json),
      status = COALESCE($11, status),
      published_at = CASE
        WHEN COALESCE($11, status) = 'PUBLISHED' AND published_at IS NULL THEN NOW()
        WHEN COALESCE($11, status) = 'DRAFT' THEN NULL
        ELSE published_at
      END,
      updated_at = NOW()
    WHERE id = $1 AND is_archived = FALSE
    RETURNING
      id::text, title, slug, category, excerpt, cover_image_url, seo_title, seo_description,
      read_time_minutes, content_json, status, is_archived, published_at::text,
      (SELECT full_name FROM users WHERE id = author_user_id) AS author_name,
      created_at::text, updated_at::text
    `,
    [
      blogId,
      input.title ?? null,
      input.slug ?? null,
      input.category ?? null,
      input.excerpt ?? null,
      input.coverImageUrl ?? null,
      input.seoTitle ?? null,
      input.seoDescription ?? null,
      input.readTimeMinutes ?? null,
      input.contentJson ? JSON.stringify(input.contentJson) : null,
      input.status ?? null,
    ],
  );
  return mapBlog(result.rows[0]);
}

export async function archiveAdminBlog(blogId: string) {
  const result = await requireDb().query<{ id: string }>(
    `
    UPDATE blog_posts
    SET is_archived = TRUE, status = 'DRAFT', published_at = NULL, updated_at = NOW()
    WHERE id = $1 AND is_archived = FALSE
    RETURNING id::text
    `,
    [blogId],
  );
  if (!result.rows[0]) throw new AppError(404, "Blog post not found", "BLOG_NOT_FOUND");
  return { id: result.rows[0].id };
}
