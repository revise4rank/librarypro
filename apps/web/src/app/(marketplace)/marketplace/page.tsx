import Link from "next/link";
import { Suspense } from "react";
import { MarketplaceSearch } from "../../../components/marketplace-search";

const utilityLinks = [
  "Silent reading halls",
  "Girls only libraries",
  "24x7 seats",
  "Budget plans",
  "Near me",
  "QR enabled",
];

const categoryRail = [
  { title: "Top libraries in Indore", text: "Fast moving listings with active seats and direct contact." },
  { title: "Under Rs. 999", text: "Budget-first plans for daily reading and exam prep." },
  { title: "Premium subdomain websites", text: "Libraries with their own public branded website and student portal." },
  { title: "Nearby study zones", text: "Distance-first discovery with locality and live seat context." },
];

const featureBands = [
  {
    title: "Search like commerce",
    text: "Filter by city, locality, amenities, price, distance, and live seat availability before you visit.",
  },
  {
    title: "Move to the selected library website",
    text: "Once you like a listing, go to that library's own subdomain for admission, contact, student login, QR, and notices.",
  },
  {
    title: "Built for premium library growth",
    text: "Premium plan libraries get more than a listing: they get a full branded microsite and full management control.",
  },
];

export default function MarketplacePage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fbf6ee_0%,#fffaf3_46%,#f3ecdf_100%)] text-[var(--lp-text)]">
      <section className="border-b border-[var(--lp-border)] bg-[rgba(255,244,233,0.88)]">
        <div className="mx-auto flex max-w-[1540px] flex-wrap items-center gap-3 px-4 py-3 text-sm text-[var(--lp-muted)] md:px-8">
          <span className="rounded-full bg-[var(--lp-surface)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--lp-primary)]">
            LibraryPro Marketplace
          </span>
          <span className="hidden h-4 w-px bg-[var(--lp-border)] md:block" />
          <span>Search libraries by city, locality, amenities, live seat visibility, offers, and contact options.</span>
          <div className="ml-auto flex flex-wrap gap-2">
            {utilityLinks.map((item) => (
              <span key={item} className="rounded-full border border-[var(--lp-border)] bg-white/80 px-3 py-1.5 text-xs font-medium text-[var(--lp-primary)]">
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <header className="border-b border-[var(--lp-border)] bg-[rgba(255,249,241,0.96)] backdrop-blur">
        <div className="mx-auto flex max-w-[1540px] flex-wrap items-center justify-between gap-4 px-4 py-5 md:px-8">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-[1.35rem] bg-[linear-gradient(135deg,#df8757,#2f8f88)] text-lg font-black text-white shadow-[0_14px_30px_rgba(111,95,74,0.16)]">
              NL
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[var(--lp-accent)]">Main discovery platform</p>
              <h1 className="mt-1 text-lg font-bold tracking-tight md:text-2xl">Find the right library, compare listings, then move to the chosen library website.</h1>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/owner/login" className="rounded-full border border-[var(--lp-border)] bg-[var(--lp-surface)] px-5 py-2.5 text-sm font-semibold text-[var(--lp-primary)]">
              Library Access
            </Link>
            <Link
              href="/student/access"
              className="rounded-full border border-[rgba(47,143,136,0.22)] bg-[rgba(47,143,136,0.12)] px-5 py-2.5 text-sm font-semibold text-[var(--lp-accent)]"
            >
              Student Portal
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-75">
          <div className="absolute left-[8%] top-20 h-56 w-56 rounded-full bg-[rgba(223,135,87,0.16)] blur-3xl" />
          <div className="absolute right-[7%] top-14 h-64 w-64 rounded-full bg-[rgba(47,143,136,0.13)] blur-3xl" />
        </div>

        <div className="relative mx-auto grid max-w-[1540px] gap-6 px-4 py-10 md:px-8 xl:grid-cols-[1.18fr_0.82fr] xl:items-center xl:py-16">
          <div className="animate-fade-up rounded-[2.4rem] border border-[var(--lp-border)] bg-[rgba(255,251,245,0.94)] p-8 shadow-[0_22px_54px_rgba(111,95,74,0.08)] md:p-12">
            <div className="inline-flex rounded-full bg-[#f8eadf] px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--lp-primary)]">
              Commerce-style library discovery
            </div>
            <h2 className="mt-6 max-w-5xl text-5xl font-black leading-[0.96] tracking-tight md:text-7xl">
              Discover study libraries like a marketplace, then continue on the selected library's own website.
            </h2>
            <p className="mt-6 max-w-3xl text-base leading-8 text-[var(--lp-muted)] md:text-lg">
              The main website is built for search, comparison, and trust. Premium libraries get their own subdomain website where
              owners manage seats, students, QR entry, notices, branding, and daily operations, while students log in to the same website.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#marketplace-search"
                className="rounded-full border border-[rgba(47,143,136,0.22)] bg-[rgba(47,143,136,0.12)] px-7 py-4 text-sm font-semibold text-[var(--lp-accent)] shadow-[0_18px_38px_rgba(47,143,136,0.12)]"
              >
                Start Search
              </a>
              <Link href="/owner/settings?tab=website" className="rounded-full border border-[var(--lp-border)] bg-[var(--lp-surface)] px-7 py-4 text-sm font-semibold text-[var(--lp-primary)]">
                Website Setup
              </Link>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {featureBands.map((item) => (
                <div key={item.title} className="rounded-[1.6rem] border border-[var(--lp-border)] bg-white/75 p-5">
                  <p className="text-lg font-black">{item.title}</p>
                  <p className="mt-3 text-sm leading-7 text-[var(--lp-muted)]">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="animate-fade-up-delay grid gap-5">
            <div className="rounded-[2.1rem] border border-[var(--lp-border)] bg-[linear-gradient(135deg,rgba(255,244,233,0.92),rgba(228,241,229,0.92),rgba(223,241,238,0.92))] p-6 shadow-[0_20px_48px_rgba(111,95,74,0.08)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--lp-accent)]">Premium owner advantage</p>
              <div className="mt-5 grid gap-3">
                {[
                  "Custom subdomain and branded library website",
                  "Student login, QR check-in, offers, notices, gallery",
                  "Owner seat and student control from same workspace",
                  "Marketplace listing plus direct contact channels",
                ].map((item) => (
                  <div key={item} className="rounded-[1.2rem] border border-[rgba(255,255,255,0.72)] bg-[rgba(255,255,255,0.72)] px-4 py-4 text-sm font-semibold text-[var(--lp-text)]">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {categoryRail.map((item, index) => (
                <article key={item.title} className="animate-fade-up rounded-[1.9rem] border border-[var(--lp-border)] bg-[rgba(255,251,245,0.94)] p-6 shadow-[0_14px_34px_rgba(111,95,74,0.08)]" style={{ animationDelay: `${index * 80}ms` }}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--lp-accent)]">Category rail</p>
                  <h3 className="mt-3 text-2xl font-black leading-tight">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--lp-muted)]">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="marketplace-search" className="mx-auto max-w-[1540px] px-4 pb-16 md:px-8">
        <Suspense fallback={<div className="rounded-[2rem] border border-[var(--lp-border)] bg-[rgba(255,251,245,0.96)] p-6 text-sm font-medium text-[var(--lp-muted)]">Loading marketplace search...</div>}>
          <MarketplaceSearch />
        </Suspense>
      </section>
    </main>
  );
}
