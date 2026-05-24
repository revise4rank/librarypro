import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicLibraryPage } from "../../../../components/public-library-page";
import { loadPublicLibraryProfile } from "../../../../lib/public-library";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const profile = await loadPublicLibraryProfile(slug);
  if (!profile) return {};
  const title = `Contact — ${profile.seo_title ?? profile.library_name}`;
  const description = `Contact ${profile.library_name} in ${profile.city}${profile.contact_phone ? ` — Phone: ${profile.contact_phone}` : ""}.`;
  return { title, description, openGraph: { title, description } };
}

export default async function LibraryContactPage({
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
      page="contact"
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
