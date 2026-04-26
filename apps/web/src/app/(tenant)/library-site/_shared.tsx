import { headers } from "next/headers";
import Link from "next/link";
import { PublicLibraryPage } from "../../../components/public-library-page";
import { loadPublicLibraryProfile, loadPublicLibraryReviews } from "../../../lib/public-library";

function UnavailableLibrarySite() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fbf6ee_0%,#fffaf3_52%,#f6efe4_100%)] text-[var(--lp-text)]">
      <section className="mx-auto max-w-[980px] px-4 py-20 text-center md:px-8">
        <div className="rounded-[2rem] border border-[var(--lp-border)] bg-[var(--lp-surface)] p-8 shadow-[0_12px_30px_rgba(93,138,102,0.08)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--lp-accent)]">Library website unavailable</p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight">This library has not published its premium website yet.</h1>
          <p className="mt-5 text-base leading-8 text-[var(--lp-muted)]">
            Once the owner activates the premium subdomain website, students will be able to use the same library website for library details, login, QR entry, and direct contact.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/marketplace" className="rounded-full bg-[var(--lp-primary)] px-6 py-3 text-sm font-semibold text-white">
              Back to marketplace
            </Link>
            <Link href="/owner/settings?tab=website" className="rounded-full border border-[var(--lp-border)] bg-[var(--lp-surface)] px-6 py-3 text-sm font-semibold text-[var(--lp-primary)]">
              Owner website setup
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export async function renderTenantLibraryPage(
  page: "home" | "about" | "pricing" | "contact",
  searchParams?: Promise<{ slug?: string }>,
) {
  const headerStore = await headers();
  const params = searchParams ? await searchParams : undefined;
  const tenantSlug = headerStore.get("x-tenant-slug");
  const slugOrSubdomain = params?.slug ?? tenantSlug ?? null;

  if (!slugOrSubdomain) {
    return <UnavailableLibrarySite />;
  }

  const profile = await loadPublicLibraryProfile(slugOrSubdomain);

  if (!profile) {
    return <UnavailableLibrarySite />;
  }

  const reviews = await loadPublicLibraryReviews(slugOrSubdomain);

  const tenantLinks = tenantSlug
    ? {
        home: "/",
        about: "/about",
        pricing: "/pricing",
        contact: "/contact",
      }
    : {
        home: `/library-site?slug=${profile.subdomain}`,
        about: `/libraries/${profile.library_slug}/about`,
        pricing: `/libraries/${profile.library_slug}/pricing`,
        contact: `/libraries/${profile.library_slug}/contact`,
      };

  return <PublicLibraryPage profile={profile} reviews={reviews} page={page} links={tenantLinks} />;
}
