import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicLibraryPage } from "../../../../components/public-library-page";
import { loadPublicLibraryProfile, resolvePublicAssetUrl } from "../../../../lib/public-library";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const profile = await loadPublicLibraryProfile(slug);
  if (!profile) return {};
  const title = `About — ${profile.seo_title ?? profile.library_name}`;
  const description = profile.seo_description ?? profile.about_text?.slice(0, 160) ?? `About ${profile.library_name}, a study library in ${profile.city}.`;
  const image = profile.hero_banner_url ? resolvePublicAssetUrl(profile.hero_banner_url) : profile.gallery_images?.[0] ?? null;
  return { title, description, openGraph: { title, description, ...(image ? { images: [image] } : {}) } };
}

export default async function LibraryAboutPage({
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
      page="about"
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
