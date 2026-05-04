export type MarketplaceBannerTone = "slate" | "emerald" | "amber" | "blue";

export type MarketplaceBannerSlide = {
  eyebrow: string;
  title: string;
  cta: string;
  href: string;
  tone: MarketplaceBannerTone;
};

export type PlatformMarketplaceSettings = {
  headline: string;
  subheadline: string;
  bannerSlides: MarketplaceBannerSlide[];
  updated_at?: string | null;
  updated_by_name?: string | null;
};

const PRODUCTION_API_ORIGIN = "https://librarypro-api.onrender.com";

export const defaultMarketplaceSettings: PlatformMarketplaceSettings = {
  headline: "Discover the right library without the noise.",
  subheadline: "Search study spaces by city, budget, seats, and facilities.",
  bannerSlides: [
    {
      eyebrow: "Find faster",
      title: "Search study spaces by city, budget, seats, and facilities.",
      cta: "Start search",
      href: "#marketplace-search",
      tone: "slate",
    },
    {
      eyebrow: "Top picks",
      title: "Filter top-rated and available libraries without opening every page.",
      cta: "See top libraries",
      href: "#marketplace-search",
      tone: "emerald",
    },
    {
      eyebrow: "Offers live",
      title: "Find libraries with active discounts, seat offers, and quick contact.",
      cta: "View offers",
      href: "#marketplace-search",
      tone: "amber",
    },
    {
      eyebrow: "For owners",
      title: "List your library with a public site, student access, and lead capture.",
      cta: "List library",
      href: "/owner/register",
      tone: "blue",
    },
  ],
};

function getApiBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || PRODUCTION_API_ORIGIN;
  return raw.endsWith("/v1") ? raw : `${raw}/v1`;
}

function normalizeSettings(value: Partial<PlatformMarketplaceSettings> | null | undefined): PlatformMarketplaceSettings {
  const slides = Array.isArray(value?.bannerSlides) && value.bannerSlides.length > 0
    ? value.bannerSlides.slice(0, 4)
    : defaultMarketplaceSettings.bannerSlides;

  return {
    headline: value?.headline || defaultMarketplaceSettings.headline,
    subheadline: value?.subheadline || defaultMarketplaceSettings.subheadline,
    bannerSlides: slides,
    updated_at: value?.updated_at ?? null,
    updated_by_name: value?.updated_by_name ?? null,
  };
}

export async function loadMarketplaceSettings(): Promise<PlatformMarketplaceSettings> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);

  try {
    const response = await fetch(`${getApiBaseUrl()}/public/marketplace-settings`, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) return defaultMarketplaceSettings;

    const json = (await response.json()) as { success: boolean; data?: PlatformMarketplaceSettings };
    return normalizeSettings(json.data);
  } catch {
    return defaultMarketplaceSettings;
  } finally {
    clearTimeout(timeoutId);
  }
}
