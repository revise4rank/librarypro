import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck, IndianRupee, MapPin, QrCode, ShieldCheck, Sparkles, Star, Wifi, Zap } from "lucide-react";
import { ContactActions } from "./contact-actions";
import { formatLibraryHost } from "../lib/domain";
import { PublicLibraryPlan, PublicLibrarySite, PublicLibraryReview, SitePageConfig, getGalleryUrl, resolvePublicAssetUrl } from "../lib/public-library";
import { LibraryReviewsPanel } from "./library-reviews-panel";
import { PublicLibraryFloatingWhatsapp } from "./public-library-floating-whatsapp";

type PublicLibraryPageProps = {
  profile: PublicLibrarySite;
  reviews?: PublicLibraryReview[];
  page: "home" | "about" | "features" | "gallery" | "pricing" | "contact";
  links: {
    home: string;
    about: string;
    features: string;
    gallery: string;
    pricing: string;
    contact: string;
  };
  showStudentActions?: boolean;
};

type NavItem = {
  href: string;
  label: string;
  page: PublicLibraryPageProps["page"];
};

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={`rounded-full px-3 py-2 text-xs font-semibold transition sm:text-sm ${
        active
          ? "bg-white text-slate-950 shadow-sm"
          : "text-white/78 hover:bg-white/10 hover:text-white"
      }`}
    >
      {item.label}
    </Link>
  );
}

function SiteCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  const backgroundClass = /\bbg-/.test(className) ? "" : "bg-white/92";

  return (
    <section className={`rounded-xl border border-slate-200 ${backgroundClass} p-4 shadow-sm backdrop-blur ${className}`}>
      {children}
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/14 bg-white/12 p-3 text-white backdrop-blur">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/62">{label}</p>
      <p className="mt-2 text-lg font-black leading-tight">{value}</p>
    </div>
  );
}

function FacilityCard({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-4">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-white">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-black text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
    </div>
  );
}

function initials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "BL";
}

const fallbackPageLabels: Record<PublicLibraryPageProps["page"], string> = {
  home: "Home",
  features: "Features",
  gallery: "Gallery",
  pricing: "Pricing",
  about: "About",
  contact: "Contact",
};

const fallbackHeroTitles: Record<PublicLibraryPageProps["page"], string> = {
  home: "A calmer study day, from seat to check-in.",
  features: "Facilities built for serious daily study.",
  gallery: "See the study space before you visit.",
  pricing: "Plans, offers, and seat pricing.",
  about: "About this library and study environment.",
  contact: "Contact the library owner.",
};

const fallbackHeroSubtitles: Record<PublicLibraryPageProps["page"], string> = {
  home: "A premium study space with seat visibility, student access, QR check-in, and direct owner contact.",
  features: "Explore facilities, access flow, student tools, and the services available inside this library.",
  gallery: "Browse the study hall, reception, reading zones, desks, and location photos before visiting.",
  pricing: "Review starting prices, public plans, and current joining offers before contacting the owner.",
  about: "Understand what makes this library reliable for students who need focused daily study time.",
  contact: "Call, WhatsApp, or visit using the owner-published contact and address details.",
};

function pageConfig(profile: PublicLibrarySite, key: PublicLibraryPageProps["page"]): SitePageConfig {
  return profile.site_pages?.[key] ?? {};
}

function pageHeading(config: SitePageConfig, fallback: string) {
  return config.title?.trim() || fallback;
}

function pageSubtitle(config: SitePageConfig, fallback: string) {
  return config.subtitle?.trim() || fallback;
}

function pageBody(config: SitePageConfig, fallback: string) {
  return config.body?.trim() || fallback;
}

function pageItems(config: SitePageConfig, fallback: { title: string; detail: string }[]) {
  const items = config.items?.filter((item) => item.title || item.detail) ?? [];
  return items.length ? items.map((item) => ({ title: item.title ?? "", detail: item.detail ?? "" })) : fallback;
}

function planPrice(plan: PublicLibraryPlan) {
  const base = Number(plan.base_amount || "0");
  const discount = Number(plan.default_discount_value || "0");
  if (!base || !discount || !plan.default_discount_type) return base;
  if (plan.default_discount_type === "PERCENTAGE") return Math.max(0, Math.round(base - (base * discount) / 100));
  return Math.max(0, Math.round(base - discount));
}

function PlanCard({ plan, compact = false }: { plan: PublicLibraryPlan; compact?: boolean }) {
  const price = planPrice(plan);
  const base = Number(plan.base_amount || "0");
  const hasDiscount = price > 0 && price < base;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-black text-slate-950">{plan.name}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
            {plan.duration_months} month{plan.duration_months === 1 ? "" : "s"}
            {plan.target_audience ? ` · ${plan.target_audience}` : ""}
          </p>
        </div>
        {hasDiscount ? <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-black text-amber-800">Offer</span> : null}
      </div>
      <p className={`${compact ? "mt-3 text-2xl" : "mt-4 text-3xl"} flex items-center gap-1 font-black tracking-[-0.04em] text-slate-950`}>
        <IndianRupee className="h-5 w-5" />
        {price || plan.base_amount}
      </p>
      {hasDiscount ? <p className="mt-1 text-xs font-bold text-slate-400 line-through">Rs. {plan.base_amount}</p> : null}
      {plan.description ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{plan.description}</p> : null}
    </div>
  );
}

export function PublicLibraryPage({
  profile,
  reviews = [],
  page,
  links,
  showStudentActions = true,
}: PublicLibraryPageProps) {
  const isOfferActive = !profile.offer_expires_at || new Date(profile.offer_expires_at).getTime() >= Date.now();
  const visibleOffer = isOfferActive ? profile.offer_text ?? profile.highlight_offer : null;
  const heroBannerUrl = resolvePublicAssetUrl(profile.hero_banner_url);
  const brandLogoUrl = resolvePublicAssetUrl(profile.brand_logo_url);
  const gallery = (profile.gallery_images?.length
    ? profile.gallery_images
    : ["/library-gallery/study-hall.svg", "/library-gallery/reading-zone.svg", "/library-gallery/reception.svg"]).map(
    getGalleryUrl,
  );
  const amenities = profile.amenities?.length
    ? profile.amenities
    : ["Silent study zone", "Comfort seating", "Owner managed", "Student access"];
  const currentPageConfig = pageConfig(profile, page);
  const heroTitle = page === "home" ? profile.hero_title : pageHeading(currentPageConfig, fallbackHeroTitles[page]);
  const heroSubtitle =
    page === "home"
      ? profile.hero_tagline ?? profile.about_text ?? fallbackHeroSubtitles.home
      : pageSubtitle(currentPageConfig, fallbackHeroSubtitles[page]);
  const navItems = ([
    { href: links.home, label: pageConfig(profile, "home").navLabel || fallbackPageLabels.home, page: "home" },
    { href: links.features, label: pageConfig(profile, "features").navLabel || fallbackPageLabels.features, page: "features" },
    { href: links.gallery, label: pageConfig(profile, "gallery").navLabel || fallbackPageLabels.gallery, page: "gallery" },
    { href: links.pricing, label: pageConfig(profile, "pricing").navLabel || fallbackPageLabels.pricing, page: "pricing" },
    { href: links.about, label: pageConfig(profile, "about").navLabel || fallbackPageLabels.about, page: "about" },
    { href: links.contact, label: pageConfig(profile, "contact").navLabel || fallbackPageLabels.contact, page: "contact" },
  ] satisfies NavItem[]).filter((item) => pageConfig(profile, item.page).enabled !== false || item.page === "home");
  const premiumFeatures = [
    {
      icon: <Wifi className="h-5 w-5" />,
      title: amenities[0] ?? "Silent study zones",
      detail: "Owner-managed facilities are published directly from the BookLib website editor.",
    },
    {
      icon: <QrCode className="h-5 w-5" />,
      title: "Student access",
      detail: "Students can use the same subdomain for login, QR entry, dues, notices, and daily actions.",
    },
    {
      icon: <ShieldCheck className="h-5 w-5" />,
      title: "Verified owner presence",
      detail: "Contact details, hours, pricing, offers, gallery, and marketplace presence stay in sync.",
    },
    {
      icon: <Zap className="h-5 w-5" />,
      title: "Fast joining flow",
      detail: "Prospective students can explore the site, call, WhatsApp, and reach the correct library portal.",
    },
  ];
  const featureCards = pageItems(
    pageConfig(profile, "features"),
    premiumFeatures.map((feature) => ({ title: feature.title, detail: feature.detail })),
  );
  const pricingCards = pageItems(pageConfig(profile, "pricing"), [
    { title: "Owner-issued student login", detail: "Students get access after joining." },
    { title: "Seat assignment and validity tracking", detail: "Plans are confirmed during admission." },
    { title: "QR entry support", detail: "Daily library actions can run from the same subdomain." },
    { title: "Payment reminders and notices", detail: "Student communication stays organized." },
  ]);
  const publicPlans = Array.isArray(profile.public_plans) ? profile.public_plans : [];
  const galleryHighlights = gallery.map((item, index) => ({
    src: item,
    label: index === 0 ? "Main study hall" : index === 1 ? "Reading zone" : index === 2 ? "Reception and entry" : `Gallery view ${index + 1}`,
  }));
  const rating = profile.rating ?? "0.0";
  const reviewCount = profile.reviews ?? "0";
  const pageStyle = {
    "--site-primary": profile.theme_primary ?? "#0F172A",
    "--site-accent": profile.theme_accent ?? "#10B981",
    "--site-surface": profile.theme_surface ?? "#F8FAFC",
  } as CSSProperties;
  const heroBackground = heroBannerUrl
    ? `linear-gradient(120deg,rgba(15,23,42,0.94),rgba(15,23,42,0.74) 48%,rgba(15,23,42,0.42)),url(${heroBannerUrl})`
    : "linear-gradient(120deg,#0F172A,#134E4A 58%,#0F172A)";

  return (
    <main style={pageStyle} className="min-h-screen bg-[#FAFAFA] text-slate-950">
      <PublicLibraryFloatingWhatsapp
        slugOrSubdomain={profile.subdomain}
        libraryName={profile.library_name}
        whatsappPhone={profile.whatsapp_phone}
        enabled={profile.allow_direct_contact !== false}
      />
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div
          className="absolute inset-0 opacity-95"
          style={{
            backgroundImage: heroBackground,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.12),rgba(2,6,23,0.42))]" />

        <header className="relative z-10 border-b border-white/10 bg-slate-950/40 backdrop-blur">
          <div className="mx-auto flex h-[58px] max-w-[1180px] items-center justify-between gap-3 px-4">
            <Link href={links.home} className="flex min-w-0 items-center gap-3 text-white">
              {brandLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={brandLogoUrl} alt={profile.library_name} className="h-10 w-10 rounded-2xl object-cover ring-1 ring-white/18" />
              ) : (
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-sm font-black text-slate-950">
                  {initials(profile.library_name)}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-black tracking-[-0.02em] text-white">{profile.library_name}</p>
                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">{profile.city}</p>
              </div>
            </Link>

            <nav className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/8 p-1 md:flex">
              {navItems.map((item) => (
                <NavLink key={item.href} item={item} active={page === item.page} />
              ))}
            </nav>

            <div className="flex items-center gap-2">
              {showStudentActions ? (
                <Link
                  href={`/student/login?library=${profile.subdomain}`}
                  className="hidden rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-950 shadow-sm sm:inline-flex"
                >
                  Student login
                </Link>
              ) : null}
            </div>
          </div>

          <div className="mx-auto flex max-w-[1180px] gap-2 overflow-x-auto px-4 py-3 md:hidden">
            {navItems.map((item) => (
              <NavLink key={item.href} item={item} active={page === item.page} />
            ))}
          </div>
        </header>

        <div className="relative z-10 mx-auto grid max-w-[1180px] gap-6 px-4 py-8 md:py-12 lg:grid-cols-[1.02fr_0.98fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-2 text-xs font-bold text-emerald-200 backdrop-blur">
              <Sparkles className="h-4 w-4" />
              {page === "home" ? "BookLib powered website" : `${fallbackPageLabels[page]} page`}
            </div>
            <h1 className="mt-5 max-w-3xl text-balance text-[clamp(2rem,4.8vw,3.75rem)] font-bold leading-[1.05] tracking-[-0.04em] text-white">
              {heroTitle}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/72 md:text-base md:leading-7">
              {heroSubtitle}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <ContactActions
                slugOrSubdomain={profile.subdomain}
                phone={profile.contact_phone}
                whatsappPhone={profile.whatsapp_phone}
                sourcePage="LIBRARY_SITE"
                className="sm:block"
              />
              {showStudentActions ? (
                <Link href={`/student/login?library=${profile.subdomain}`} className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 shadow-sm">
                  Open student portal
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : null}
            </div>
            {visibleOffer ? (
              <div className="mt-5 inline-flex max-w-full items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300 px-4 py-2 text-sm font-black text-slate-950 shadow-sm">
                <Sparkles className="h-4 w-4" />
                <span className="truncate">{visibleOffer}</span>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-white/14 bg-white/10 p-3 shadow-sm backdrop-blur">
            <div className="overflow-hidden rounded-lg bg-slate-900">
              <div className="relative aspect-[16/10]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={gallery[0]} alt={`${profile.library_name} preview`} className="h-full w-full object-cover opacity-90" />
                <div className="absolute inset-x-3 bottom-3 rounded-2xl border border-white/12 bg-slate-950/70 p-3 text-white backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Now welcoming students</p>
                  <p className="mt-1 text-lg font-black">{profile.area ?? "Prime location"}, {profile.city}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
                <MiniStat label="Seats" value={profile.available_seats} />
                <MiniStat label="From" value={`Rs. ${profile.starting_price}`} />
                <MiniStat label="Hours" value={profile.business_hours ?? "Daily"} />
                <MiniStat label="Rating" value={`${rating}/5`} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-[1180px] gap-3 px-4 py-4 md:grid-cols-3">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
            <BadgeCheck className="h-5 w-5 text-emerald-600" />
            <p className="text-sm font-bold text-slate-800">Published at {profile.custom_domain || formatLibraryHost(profile.subdomain)}</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
            <Star className="h-5 w-5 text-amber-500" />
            <p className="text-sm font-bold text-slate-800">{rating}/5 from {reviewCount} student reviews</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
            <MapPin className="h-5 w-5 text-sky-600" />
            <p className="line-clamp-1 text-sm font-bold text-slate-800">{profile.address}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-4 py-8 md:py-10">
        {currentPageConfig.enabled === false && page !== "home" ? (
          <SiteCard>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Page hidden</p>
            <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-slate-950">This page is not published right now.</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">The library owner can enable it from the website editor.</p>
            <Link href={links.home} className="mt-5 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white">
              Go to home
            </Link>
          </SiteCard>
        ) : null}

        {currentPageConfig.enabled !== false && page === "home" ? (
          <div className="grid gap-5">
            <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <SiteCard>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Why students choose us</p>
                <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-slate-950">{pageHeading(pageConfig(profile, "home"), "A calmer study day, from seat to check-in.")}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                  {pageBody(pageConfig(profile, "home"), profile.about_text ?? "This library website gives students one clean place to discover facilities, check pricing, contact the owner, log in, and continue daily study actions.")}
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {premiumFeatures.map((feature) => (
                    <FacilityCard key={feature.title} icon={feature.icon} title={feature.title} detail={feature.detail} />
                  ))}
                </div>
              </SiteCard>

              <SiteCard className="bg-slate-950 text-white">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Current offer</p>
                <h2 className="mt-3 text-2xl font-bold tracking-[-0.04em] text-white">{visibleOffer ?? "Contact owner for seat offers"}</h2>
                <p className="mt-3 text-sm leading-7 text-white/68">
                  {profile.offer_expires_at ? `Valid till ${profile.offer_expires_at.slice(0, 10)}.` : "Ask the owner about current seat availability, pricing, and joining options."}
                </p>
                <div className="mt-5 grid gap-3">
                  <Link href={links.pricing} className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950">
                    View pricing
                  </Link>
                  <Link href={links.contact} className="inline-flex items-center justify-center rounded-full border border-white/16 px-5 py-3 text-sm font-black text-white">
                    Contact owner
                  </Link>
                </div>
              </SiteCard>
            </div>

            <SiteCard>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Visual tour</p>
                  <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-slate-950">See the study space before you visit.</h2>
                </div>
                <Link href={links.gallery} className="text-sm font-black text-emerald-700">Open gallery</Link>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {galleryHighlights.slice(0, 3).map((item, index) => (
                  <div key={`${item.src}-${index}`} className="aspect-[16/11] overflow-hidden rounded-xl bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.src} alt={`${profile.library_name} ${item.label}`} className="h-full w-full object-cover transition duration-500 hover:scale-105" />
                  </div>
                ))}
              </div>
            </SiteCard>

            <SiteCard>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Plans</p>
                  <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-slate-950">Clear pricing before students enquire.</h2>
                </div>
                <Link href={links.pricing} className="text-sm font-black text-emerald-700">View all plans</Link>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {publicPlans.length ? (
                  publicPlans.slice(0, 3).map((plan) => <PlanCard key={plan.id} plan={plan} compact />)
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-3">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Starting from</p>
                    <p className="mt-2 flex items-center gap-1 text-3xl font-black tracking-[-0.04em] text-slate-950"><IndianRupee className="h-6 w-6" /> {profile.starting_price}</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">Detailed public plans can be published from the owner Plans page.</p>
                  </div>
                )}
              </div>
            </SiteCard>
          </div>
        ) : null}

        {currentPageConfig.enabled !== false && page === "features" ? (
          <div className="grid gap-5">
            <SiteCard>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Features</p>
                  <h2 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-slate-950">{pageHeading(pageConfig(profile, "features"), "Everything students expect from a serious study space.")}</h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{pageSubtitle(pageConfig(profile, "features"), "Facilities, access, and student workflows are published from the owner website editor.")}</p>
                </div>
                <Link href={links.contact} className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white">
                  Enquire now
                </Link>
              </div>
              <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {featureCards.map((feature, index) => (
                  <FacilityCard key={`${feature.title}-${index}`} icon={premiumFeatures[index % premiumFeatures.length].icon} title={feature.title} detail={feature.detail} />
                ))}
              </div>
            </SiteCard>

            <div className="grid gap-5 lg:grid-cols-[0.82fr_1.18fr]">
              <SiteCard className="bg-slate-950 text-white">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Student flow</p>
                <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-white">Explore, contact, join, and continue from one website.</h2>
                <div className="mt-5 grid gap-3">
                  {["Browse facilities and photos", "Check pricing and offers", "Contact owner by call or WhatsApp", "Use student login after joining"].map((item, index) => (
                    <div key={item} className="flex gap-3 rounded-xl border border-white/12 bg-white/10 p-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-sm font-black text-slate-950">{index + 1}</span>
                      <p className="text-sm font-bold leading-6 text-white/78">{item}</p>
                    </div>
                  ))}
                </div>
              </SiteCard>
              <SiteCard>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Facilities list</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {amenities.map((amenity) => (
                    <div key={amenity} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800">
                      {amenity}
                    </div>
                  ))}
                </div>
              </SiteCard>
            </div>
          </div>
        ) : null}

        {currentPageConfig.enabled !== false && page === "gallery" ? (
          <div className="grid gap-5">
            <SiteCard>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Gallery</p>
                  <h2 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-slate-950">{pageHeading(pageConfig(profile, "gallery"), "A full visual tour before students visit.")}</h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{pageSubtitle(pageConfig(profile, "gallery"), "See the study hall, reading zones, reception, and location before visiting.")}</p>
                </div>
                <Link href={links.contact} className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white">
                  Book visit
                </Link>
              </div>
              <div className="mt-6 grid gap-3 md:grid-cols-3">
                {galleryHighlights.map((item, index) => (
                  <figure key={`${item.src}-${index}`} className={index === 0 ? "md:col-span-2 md:row-span-2" : ""}>
                    <div className="overflow-hidden rounded-xl bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.src} alt={`${profile.library_name} ${item.label}`} className={`${index === 0 ? "aspect-[16/10]" : "aspect-[4/3]"} w-full object-cover transition duration-500 hover:scale-105`} />
                    </div>
                    <figcaption className="mt-2 text-sm font-bold text-slate-600">{item.label}</figcaption>
                  </figure>
                ))}
              </div>
            </SiteCard>

            <SiteCard className="bg-slate-950 text-white">
              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Visit</p>
                  <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-white">{profile.area ?? profile.city} study space with owner-managed access.</h2>
                </div>
                <ContactActions
                  slugOrSubdomain={profile.subdomain}
                  phone={profile.contact_phone}
                  whatsappPhone={profile.whatsapp_phone}
                  sourcePage="LIBRARY_SITE"
                />
              </div>
            </SiteCard>
          </div>
        ) : null}

        {currentPageConfig.enabled !== false && page === "about" ? (
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <SiteCard className="bg-slate-950 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">About</p>
              <h2 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-white">{pageHeading(pageConfig(profile, "about"), profile.library_name)}</h2>
              <p className="mt-4 text-sm leading-7 text-white/70">
                {pageBody(pageConfig(profile, "about"), profile.about_text ?? "A premium BookLib-powered library website for students to discover, contact, log in, and continue daily study actions.")}
              </p>
            </SiteCard>
            <SiteCard>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Facilities</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {amenities.map((amenity) => (
                  <div key={amenity} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800">
                    {amenity}
                  </div>
                ))}
              </div>
            </SiteCard>
          </div>
        ) : null}

        {currentPageConfig.enabled !== false && page === "pricing" ? (
          <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
            <SiteCard className="bg-[linear-gradient(135deg,#0F172A,#115E59)] text-white">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Starting plan</p>
              <h2 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-white">{pageHeading(pageConfig(profile, "pricing"), "Starting plans and current offers")}</h2>
              <p className="mt-3 text-sm leading-7 text-white/70">{pageSubtitle(pageConfig(profile, "pricing"), "Starting monthly seat pricing shared by the owner. Final plan and discounts are confirmed during admission.")}</p>
              <p className="mt-4 flex items-center gap-2 text-3xl font-bold tracking-[-0.04em] text-white"><IndianRupee className="h-7 w-7" /> {profile.starting_price}</p>
              {pageConfig(profile, "pricing").body ? <p className="mt-3 text-sm leading-7 text-white/70">{pageConfig(profile, "pricing").body}</p> : null}
              <div className="mt-5 rounded-2xl border border-white/12 bg-white/10 p-4 text-sm font-bold text-white">
                {visibleOffer ?? "Ask owner for active discount offers and seat combinations."}
              </div>
            </SiteCard>
            <SiteCard>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">{publicPlans.length ? "Active public plans" : "Included access"}</p>
              <div className="mt-4 grid gap-3">
                {publicPlans.length ? publicPlans.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} />
                )) : pricingCards.map((item) => (
                  <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-bold text-slate-800">{item.title}</p>
                    {item.detail ? <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{item.detail}</p> : null}
                  </div>
                ))}
              </div>
            </SiteCard>
          </div>
        ) : null}

        {currentPageConfig.enabled !== false && page === "contact" ? (
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <SiteCard>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Contact</p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-slate-950">{pageHeading(pageConfig(profile, "contact"), "Talk to the library owner.")}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{pageSubtitle(pageConfig(profile, "contact"), "Students can call, WhatsApp, or visit after checking the address.")}</p>
              <div className="mt-5 grid gap-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Contact person</p>
                  <p className="mt-2 text-lg font-black">{profile.contact_name ?? profile.library_name}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Phone</p>
                  <p className="mt-2 text-lg font-black">{profile.contact_phone ?? "Contact available on request"}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Address</p>
                  <p className="mt-2 text-sm font-bold leading-6">{profile.address}</p>
                </div>
              </div>
            </SiteCard>
            <SiteCard>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Visit preview</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {galleryHighlights.slice(0, 4).map((item, index) => (
                  <div key={`${item.src}-${index}`} className="aspect-[16/11] overflow-hidden rounded-xl bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.src} alt={`${profile.library_name} contact preview ${index + 1}`} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            </SiteCard>
          </div>
        ) : null}

        <SiteCard className="mt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Student reviews</p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-slate-950">Trusted by joined students.</h2>
            </div>
            <div className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
              {rating}/5 from {reviewCount} reviews
            </div>
          </div>
          <div className="mt-5">
            <LibraryReviewsPanel reviews={reviews} />
          </div>
        </SiteCard>
      </section>
      {showStudentActions ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/94 p-3 shadow-sm backdrop-blur md:hidden">
          <div className="mx-auto grid max-w-[1180px] grid-cols-2 gap-2">
            <Link href={links.contact} className="rounded-full border border-slate-200 px-4 py-3 text-center text-sm font-black text-slate-950">
              Contact
            </Link>
            <Link href={`/student/login?library=${profile.subdomain}`} className="rounded-full bg-emerald-500 px-4 py-3 text-center text-sm font-black text-slate-950">
              Student login
            </Link>
          </div>
        </div>
      ) : null}
    </main>
  );
}
