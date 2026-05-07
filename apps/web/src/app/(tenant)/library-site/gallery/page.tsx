import { renderTenantLibraryPage } from "../_shared";

export default async function LibrarySiteGalleryPage({
  searchParams,
}: {
  searchParams?: Promise<{ slug?: string }>;
}) {
  return renderTenantLibraryPage("gallery", searchParams);
}

