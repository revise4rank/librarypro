import Link from "next/link";
import { Suspense } from "react";
import { MarketplaceSearch } from "../../../components/marketplace-search";
import { PublicSiteHeader } from "../../../components/public-site-header";

const bannerSlides = [
  {
    eyebrow: "Find faster",
    title: "Search study spaces by city, budget, seats, and facilities.",
    cta: "Start search",
    href: "#marketplace-search",
  },
  {
    eyebrow: "Top picks",
    title: "Filter top-rated and available libraries without opening every page.",
    cta: "See top libraries",
    href: "#marketplace-search",
  },
  {
    eyebrow: "Offers live",
    title: "Find libraries with active discounts, seat offers, and quick contact.",
    cta: "View offers",
    href: "#marketplace-search",
  },
  {
    eyebrow: "For owners",
    title: "List your library with a public site, student access, and lead capture.",
    cta: "List library",
    href: "/owner/register",
  },
];

export default function MarketplacePage() {
  return (
    <main className="min-h-screen bg-[#FAFAFA] text-[#0F172A]">
      <PublicSiteHeader />

      <section className="border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]">
        <div className="mx-auto grid max-w-[1280px] gap-4 px-4 py-5 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <div className="animate-fade-up">
            <p className="lp-label text-emerald-700">Marketplace</p>
            <h1 className="mt-2 text-[clamp(1.8rem,4vw,3.3rem)] font-black leading-[0.98] tracking-[-0.05em]">
              Discover the right library without the noise.
            </h1>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href="#marketplace-search" className="lp-button lp-button-primary">
                Search libraries
              </a>
              <Link href="/owner/register" className="lp-button">
                List your library
              </Link>
            </div>
          </div>

          <div className="lp-marketplace-banner relative h-[136px] overflow-hidden rounded-[1rem] border border-slate-200 bg-[#0F172A] shadow-[0_18px_44px_rgba(15,23,42,0.12)]">
            {bannerSlides.map((slide, index) => (
              <article
                key={slide.title}
                className="lp-marketplace-slide absolute inset-0 grid content-center px-5 py-4 text-white sm:px-6"
                style={{ animationDelay: `${index * 4}s` }}
              >
                <p className="text-xs font-semibold text-emerald-300">{slide.eyebrow}</p>
                <h2 className="mt-2 max-w-3xl text-xl font-black leading-tight tracking-[-0.03em] sm:text-2xl">
                  {slide.title}
                </h2>
                <Link href={slide.href} className="mt-3 w-fit rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-white">
                  {slide.cta}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="marketplace-search" className="mx-auto max-w-[1280px] px-4 py-5 pb-16">
        <Suspense fallback={<div className="rounded-[2rem] border border-[var(--lp-border)] bg-[rgba(255,251,245,0.96)] p-6 text-sm font-medium text-[var(--lp-muted)]">Loading marketplace search...</div>}>
          <MarketplaceSearch />
        </Suspense>
      </section>
    </main>
  );
}
