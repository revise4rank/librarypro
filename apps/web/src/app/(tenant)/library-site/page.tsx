import { renderTenantLibraryPage } from "./_shared";

export default async function LibrarySitePage({
  searchParams,
}: {
  searchParams?: Promise<{ slug?: string }>;
}) {
  return renderTenantLibraryPage("home", searchParams);
}
