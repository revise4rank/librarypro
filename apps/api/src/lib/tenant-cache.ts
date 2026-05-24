import { requireDb } from "./db";
import type { TenantContext } from "../types/express";

type CachedTenant = {
  value: TenantContext | null;
  expiresAt: number;
};

const cache = new Map<string, CachedTenant>();
const TTL_MS = 60_000;

export async function getTenantBySlug(slug: string): Promise<TenantContext | null> {
  const cached = cache.get(slug);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const result = await requireDb().query<{
    library_id: string;
    slug: string;
    status: "ACTIVE" | "SUSPENDED" | "INACTIVE";
  }>(
    `
    SELECT
      l.id AS library_id,
      p.subdomain AS slug,
      l.status::text AS status
    FROM libraries_public_profiles p
    INNER JOIN libraries l ON l.id = p.library_id
    WHERE p.subdomain = $1
      AND p.is_published = TRUE
    LIMIT 1
    `,
    [slug],
  );

  const tenant = result.rows[0]
    ? {
        libraryId: result.rows[0].library_id,
        slug: result.rows[0].slug,
        status: result.rows[0].status,
      }
    : null;

  cache.set(slug, {
    value: tenant,
    expiresAt: Date.now() + TTL_MS,
  });

  return tenant;
}
