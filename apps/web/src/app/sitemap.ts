import type { MetadataRoute } from "next";

const API_URL = (process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "https://librarypro-api.onrender.com");
const BASE_URL = process.env.NEXT_PUBLIC_WEB_URL?.replace(/\/$/, "") ?? "https://nextlib.in";

type LibrarySearchResult = {
  library_slug: string;
  library_name: string;
};

async function fetchLibrarySlugs(): Promise<string[]> {
  try {
    const res = await fetch(`${API_URL}/v1/public/libraries/search?page=1&limit=200`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { success: boolean; data: { rows?: LibrarySearchResult[] } };
    const rows = json.data?.rows ?? [];
    return rows.map((r) => r.library_slug).filter(Boolean);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await fetchLibrarySlugs();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/marketplace`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/student/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
  ];

  const libraryRoutes: MetadataRoute.Sitemap = slugs.flatMap((slug) => [
    { url: `${BASE_URL}/libraries/${slug}`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.8 },
    { url: `${BASE_URL}/libraries/${slug}/about`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.6 },
    { url: `${BASE_URL}/libraries/${slug}/pricing`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.6 },
    { url: `${BASE_URL}/libraries/${slug}/contact`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.5 },
  ]);

  return [...staticRoutes, ...libraryRoutes];
}
