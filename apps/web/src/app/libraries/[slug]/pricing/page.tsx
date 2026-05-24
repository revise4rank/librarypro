import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicLibraryPage } from "../../../../components/public-library-page";
import { loadPublicLibraryProfile, resolvePublicAssetUrl } from "../../../../lib/public-library";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const profile = await loadPublicLibraryProfile(slug);
  if (!profile) return {};
  const title = `Pricing — ${profile.seo_title ?? profile.library_name}`;
  const description = `Seat pricing starting at Rs. ${profile.starting_price}/month at ${profile.library_name} in ${profile.city}. ${profile.seo_description ?? ""}`.trim();
  const image = profile.hero_banner_url ? resolvePublicAssetUrl(profile.hero_banner_url) : profile.gallery_images?.[0] ?? null;
  return { title, description, openGraph: { title, description, ...(image ? { images: [image] } : {}) } };
}

export default async function LibraryPricingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = await loadPublicLibraryProfile(slug);

  if (!profile) {
    notFound();
  }

  return (
    <PublicLibraryPage
      profile={profile}
      page="pricing"
      links={{
        home: `/libraries/${profile.library_slug}`,
        about: `/libraries/${profile.library_slug}/about`,
        pricing: `/libraries/${profile.library_slug}/pricing`,
        contact: `/libraries/${profile.library_slug}/contact`,
      }}
      showStudentActions={false}
    />
  );
}
