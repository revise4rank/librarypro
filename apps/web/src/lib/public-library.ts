export type PublicLibraryProfile = {
  library_name: string;
  library_slug: string;
  city: string;
  area: string | null;
  address: string;
  brand_logo_url: string | null;
  hero_banner_url?: string | null;
  available_seats: number;
  starting_price: string;
  offer_text: string | null;
  subdomain: string;
  custom_domain?: string | null;
  hero_title: string;
  hero_tagline: string | null;
  about_text?: string | null;
  contact_name?: string | null;
  contact_phone: string | null;
  whatsapp_phone: string | null;
  email?: string | null;
  amenities: string[] | null;
  gallery_images: string[] | null;
  business_hours: string | null;
  landmark: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  highlight_offer?: string | null;
  offer_expires_at?: string | null;
  allow_direct_contact?: boolean;
  theme_primary?: string | null;
  theme_accent?: string | null;
  theme_surface?: string | null;
  distance_km?: string | null;
  rating?: string | null;
  reviews?: string | null;
};

export type PublicLibraryReview = {
  id: string;
  library_id: string;
  student_user_id: string;
  student_name: string;
  rating: number;
  review_text: string;
  created_at: string;
};

type PublicLibraryProfileResponse = {
  success: boolean;
  data: PublicLibraryProfile;
};

type PublicLibraryReviewsResponse = {
  success: boolean;
  data: PublicLibraryReview[];
};

const PRODUCTION_API_ORIGIN = "https://librarypro-api.onrender.com";
const demoAssetFallbacks: Record<string, string> = {
  "/uploads/public-profiles/demo-1.jpg": "/library-gallery/study-hall.svg",
  "/uploads/public-profiles/demo-2.jpg": "/library-gallery/reading-zone.svg",
  "/uploads/public-profiles/demo-3.jpg": "/library-gallery/reception.svg",
};

function getApiBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || PRODUCTION_API_ORIGIN;
  return raw.endsWith("/v1") ? raw : `${raw}/v1`;
}

function getApiOrigin() {
  const base = getApiBaseUrl();
  return base.endsWith("/v1") ? base.slice(0, -3) : base;
}

export function resolvePublicAssetUrl(value: string | null | undefined) {
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (demoAssetFallbacks[value]) {
    return demoAssetFallbacks[value];
  }
  if (value.startsWith("/uploads/")) {
    return `${getApiOrigin()}${value}`;
  }
  return value;
}

export function getGalleryUrl(value: string, index: number) {
  const resolved = resolvePublicAssetUrl(value);
  if (resolved && (resolved.startsWith("http://") || resolved.startsWith("https://") || resolved.startsWith("/"))) {
    return resolved;
  }

  const normalized = value.toLowerCase();
  if (normalized.includes("reception")) return "/library-gallery/reception.svg";
  if (normalized.includes("reading")) return "/library-gallery/reading-zone.svg";
  if (normalized.includes("hall")) return "/library-gallery/study-hall.svg";

  const fallbacks = [
    "/library-gallery/study-hall.svg",
    "/library-gallery/reading-zone.svg",
    "/library-gallery/reception.svg",
  ];

  return fallbacks[index % fallbacks.length];
}

export async function loadPublicLibraryProfile(slugOrSubdomain: string) {
  const response = await fetch(`${getApiBaseUrl()}/public/libraries/${encodeURIComponent(slugOrSubdomain)}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const json = (await response.json()) as PublicLibraryProfileResponse;
  return json.data;
}

export async function loadPublicLibraryReviews(slugOrSubdomain: string) {
  const response = await fetch(`${getApiBaseUrl()}/public/libraries/${encodeURIComponent(slugOrSubdomain)}/reviews`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  const json = (await response.json()) as PublicLibraryReviewsResponse;
  return json.data;
}
