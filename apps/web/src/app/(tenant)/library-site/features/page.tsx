import { renderTenantLibraryPage } from "../_shared";

export default async function LibrarySiteFeaturesPage({
  searchParams,
}: {
  searchParams?: Promise<{ slug?: string }>;
}) {
  return renderTenantLibraryPage("features", searchParams);
}

