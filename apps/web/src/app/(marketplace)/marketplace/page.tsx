import Link from "next/link";
import { Suspense } from "react";
import { MarketplaceSearch } from "../../../components/marketplace-search";

const categoryRail = [
  { title: "Nearby", text: "Find study spaces by city, locality, and live seat context." },
  { title: "Budget", text: "Compare entry pricing before you visit." },
  { title: "Premium", text: "Open branded library pages with student access." },
];

const featureBands = [
  {
    title: "Search",
    text: "Filter by city, price, amenities, and seats.",
  },
  {
    title: "Compare",
    text: "Shortlist libraries without opening crowded pages.",
  },
  {
    title: "Continue",
    text: "Move to the chosen library website for contact or login.",
  },
];

export default function MarketplacePage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fbf6ee_0%,#fffaf3_46%,#f3ecdf_100%)] text-[var(--lp-text)]">
      <section className="border-b border-[var(--lp-border)] bg-[rgba(255,244,233,0.88)]">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-3 px-4 py-2.5 text-sm text-[var(--lp-muted)]">
          <span className="rounded-full bg-[var(--lp-surface)] px-3 py-1 text-xs font-semibold text-[var(--lp-primary)]">
            LibraryPro Marketplace
          </span>
          <span className="hidden h-4 w-px bg-[var(--lp-border)] md:block" />
          <span>Search, compare, and open the right library website.</span>
        </div>
      </section>

      <header className="border-b border-[var(--lp-border)] bg-[rgba(255,249,241,0.96)] backdrop-blur">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4">
            <div className="grid h-11 w-11 place-items-center rounded-[0.75rem] bg-[linear-gradient(135deg,#df8757,#2f8f88)] text-sm font-black text-white shadow-[0_10px_22px_rgba(111,95,74,0.14)]">
              NL
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--lp-accent)]">Discovery platform</p>
              <h1 className="mt-0.5 text-base font-bold tracking-tight md:text-xl">Find the right library faster.</h1>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/owner/register" className="lp-button">
              List your library
            </Link>
            <Link
              href="/student/access"
              className="lp-button lp-button-accent"
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

        <div className="relative mx-auto grid max-w-[1280px] gap-5 px-4 py-8 xl:grid-cols-[1.05fr_0.95fr] xl:items-center xl:py-12">
          <div className="animate-fade-up rounded-[1.25rem] border border-[var(--lp-border)] bg-[rgba(255,251,245,0.94)] p-5 shadow-[0_14px_34px_rgba(111,95,74,0.06)] md:p-6">
            <div className="inline-flex rounded-full bg-[#f8eadf] px-3 py-1.5 text-xs font-semibold text-[var(--lp-primary)]">
              Library discovery
            </div>
            <h2 className="mt-4 max-w-4xl text-[clamp(2.25rem,7vw,4.6rem)] font-black leading-[0.98] tracking-tight">
              Compare libraries. Choose calmly. Continue directly.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--lp-muted)] md:text-base">
              Search by city, budget, seats, and facilities. Open a selected library page for contact, student login, QR, and updates.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#marketplace-search"
                className="lp-button lp-button-primary"
              >
                Start Search
              </a>
              <Link href="/owner/register" className="lp-button">
                Start library setup
              </Link>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {featureBands.map((item) => (
                <div key={item.title} className="rounded-[0.75rem] border border-[var(--lp-border)] bg-white/75 p-4">
                  <p className="text-base font-black">{item.title}</p>
                  <p className="mt-2 text-sm leading-5 text-[var(--lp-muted)]">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="animate-fade-up-delay grid gap-4">
            <div className="rounded-[1.25rem] border border-[var(--lp-border)] bg-[linear-gradient(135deg,rgba(255,244,233,0.92),rgba(228,241,229,0.92),rgba(223,241,238,0.92))] p-5 shadow-[0_14px_34px_rgba(111,95,74,0.06)]">
              <p className="lp-label text-[var(--lp-accent)]">Owner advantage</p>
              <div className="mt-4 grid gap-2">
                {[
                  "Branded library website",
                  "Student login and QR access",
                  "Seat and student controls",
                  "Marketplace contact leads",
                ].map((item) => (
                  <div key={item} className="rounded-[0.75rem] border border-[rgba(255,255,255,0.72)] bg-[rgba(255,255,255,0.72)] px-4 py-3 text-sm font-semibold text-[var(--lp-text)]">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {categoryRail.map((item, index) => (
                <article key={item.title} className="animate-fade-up rounded-[1rem] border border-[var(--lp-border)] bg-[rgba(255,251,245,0.94)] p-4 shadow-[0_10px_24px_rgba(111,95,74,0.05)]" style={{ animationDelay: `${index * 80}ms` }}>
                  <h3 className="text-lg font-black leading-tight">{item.title}</h3>
                  <p className="mt-2 text-sm leading-5 text-[var(--lp-muted)]">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="marketplace-search" className="mx-auto max-w-[1280px] px-4 pb-16">
        <Suspense fallback={<div className="rounded-[2rem] border border-[var(--lp-border)] bg-[rgba(255,251,245,0.96)] p-6 text-sm font-medium text-[var(--lp-muted)]">Loading marketplace search...</div>}>
          <MarketplaceSearch />
        </Suspense>
      </section>
    </main>
  );
}
