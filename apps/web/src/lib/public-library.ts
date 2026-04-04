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

function getApiBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:4000";
  return raw.endsWith("/v1") ? raw : `${raw}/v1`;
}

export function getGalleryUrl(value: string, index: number) {
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/")) {
    return value;
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
