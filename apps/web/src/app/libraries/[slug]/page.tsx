import { notFound } from "next/navigation";
import { PublicLibraryPage } from "../../../components/public-library-page";
import { loadPublicLibraryProfile } from "../../../lib/public-library";

export default async function LibraryDetailPage({
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
      page="home"
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
