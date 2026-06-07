import Link from "next/link";
import { Suspense } from "react";
import { BadgeCheck, Building2, Compass, Search, Users } from "lucide-react";
import { MarketplaceSearch } from "../../../components/marketplace-search";
import { PublicSiteHeader } from "../../../components/public-site-header";
import { loadMarketplaceSettings } from "../../../lib/marketplace-settings";

const slideToneClass = {
  slate: "from-[#0F172A] via-[#17213A] to-[#0F172A]",
  emerald: "from-[#064E3B] via-[#0F766E] to-[#0F172A]",
  amber: "from-[#78350F] via-[#B45309] to-[#0F172A]",
  blue: "from-[#1E3A8A] via-[#0F766E] to-[#0F172A]",
};

export default async function MarketplacePage() {
  const marketplaceSettings = await loadMarketplaceSettings();
  const bannerSlides = marketplaceSettings.bannerSlides;

  return (
    <main className="min-h-screen bg-white text-[#0F172A]">
      <PublicSiteHeader activeLabel="Features" />

      <section className="overflow-hidden bg-[linear-gradient(135deg,#ffffff_0%,#f4fbf8_48%,#eefbf5_100%)]">
        <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-8 md:py-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-100 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm">
              <Compass className="h-4 w-4 text-emerald-600" />
              BookLib marketplace
            </div>
            <h1 className="mt-7 text-[clamp(2.5rem,5.7vw,5.25rem)] font-bold leading-[1.04] text-slate-900">
              {marketplaceSettings.headline}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              {marketplaceSettings.subheadline}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#marketplace-search" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-7 text-base font-bold text-white shadow-sm transition hover:bg-emerald-700">
                <Search className="h-5 w-5" />
                Search libraries
              </a>
              <Link href="/owner/register" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-emerald-200 bg-white px-7 text-base font-bold text-emerald-700 transition hover:bg-emerald-50">
                List your library
              </Link>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { value: "Live", label: "published listings", icon: Building2 },
                { value: "Plans", label: "pricing visible", icon: BadgeCheck },
                { value: "Leads", label: "call/WhatsApp ready", icon: Users },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-lg border border-emerald-100 bg-white p-4 shadow-sm">
                    <Icon className="h-5 w-5 text-emerald-600" />
                    <p className="mt-3 text-xl font-bold text-slate-900">{item.value}</p>
                    <p className="mt-1 text-xs font-semibold uppercase text-slate-500">{item.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lp-marketplace-banner relative min-h-[180px] overflow-hidden rounded-lg border border-slate-200 bg-slate-950 shadow-xl">
            {bannerSlides.map((slide, index) => (
              <article
                key={slide.title}
                className={`lp-marketplace-slide absolute inset-0 grid content-center bg-gradient-to-br px-6 py-8 text-white sm:px-8 ${slideToneClass[slide.tone] ?? slideToneClass.slate}`}
                style={{ animationDelay: `${index * 4}s` }}
              >
                <p className="text-sm font-bold text-emerald-300">{slide.eyebrow}</p>
                <h2 className="mt-3 max-w-3xl text-[clamp(1.9rem,4vw,3.25rem)] font-bold leading-tight">
                  {slide.title}
                </h2>
                <Link href={slide.href} className="mt-6 w-fit rounded-lg border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/15">
                  {slide.cta}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="marketplace-search" className="mx-auto w-full max-w-[1200px] px-4 py-6 pb-10">
        <Suspense fallback={<div className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500 shadow-sm">Loading marketplace search...</div>}>
          <MarketplaceSearch />
        </Suspense>
      </section>
    </main>
  );
}
