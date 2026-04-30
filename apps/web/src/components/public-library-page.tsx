import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Clock3, MapPin, QrCode, Sparkles, Star, UsersRound, Wifi } from "lucide-react";
import { ContactActions } from "./contact-actions";
import { formatLibraryHost } from "../lib/domain";
import { PublicLibraryProfile, PublicLibraryReview, getGalleryUrl, resolvePublicAssetUrl } from "../lib/public-library";
import { LibraryReviewsPanel } from "./library-reviews-panel";

type PublicLibraryPageProps = {
  profile: PublicLibraryProfile;
  reviews?: PublicLibraryReview[];
  page: "home" | "about" | "pricing" | "contact";
  links: {
    home: string;
    about: string;
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
          ? "bg-emerald-300 text-slate-950 shadow-[0_10px_24px_rgba(15,23,42,0.12)]"
          : "text-white/78 hover:bg-white/10 hover:text-white"
      }`}
    >
      {item.label}
    </Link>
  );
}

function SiteCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[1.25rem] border border-slate-200 bg-white/92 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.07)] backdrop-blur ${className}`}>
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
    <div className="rounded-[1rem] border border-slate-200 bg-[#F8FAFC] p-4">
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
    .join("") || "LP";
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
  const navItems: NavItem[] = [
    { href: links.home, label: "Home", page: "home" },
    { href: links.about, label: "About", page: "about" },
    { href: links.pricing, label: "Pricing", page: "pricing" },
    { href: links.contact, label: "Contact", page: "contact" },
  ];
  const amenities = profile.amenities?.length
    ? profile.amenities
    : ["Silent study zone", "Comfort seating", "Owner managed", "Student access"];
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
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div
          className="absolute inset-0 opacity-95"
          style={{
            backgroundImage: heroBackground,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(16,185,129,0.32),transparent_24%),radial-gradient(circle_at_86%_20%,rgba(251,191,36,0.18),transparent_22%)]" />

        <header className="relative z-10 border-b border-white/10 bg-slate-950/40 backdrop-blur">
          <div className="mx-auto flex h-[58px] max-w-[1180px] items-center justify-between gap-3 px-4">
            <Link href={links.home} className="flex min-w-0 items-center gap-3">
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
                  className="hidden rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-950 shadow-[0_18px_34px_rgba(0,0,0,0.18)] sm:inline-flex"
                >
                  Student login
                </Link>
              ) : null}
              <Link href="/marketplace" className="rounded-full border border-white/14 bg-white/8 px-3 py-2 text-xs font-bold text-white hover:bg-white/14">
                Marketplace
              </Link>
            </div>
          </div>

          <div className="mx-auto flex max-w-[1180px] gap-2 overflow-x-auto px-4 py-3 md:hidden">
            {navItems.map((item) => (
              <NavLink key={item.href} item={item} active={page === item.page} />
            ))}
          </div>
        </header>

        <div className="relative z-10 mx-auto grid max-w-[1180px] gap-8 px-4 py-12 md:py-16 lg:grid-cols-[1.02fr_0.98fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-2 text-xs font-bold text-emerald-200 backdrop-blur">
              <Sparkles className="h-4 w-4" />
              Premium library website
            </div>
            <h1 className="mt-5 max-w-3xl text-balance text-[clamp(2.05rem,5.8vw,4.25rem)] font-black leading-[1.02] tracking-[-0.045em] text-white">
              {profile.hero_title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/72 md:text-base md:leading-7">
              {profile.hero_tagline ?? profile.about_text ?? "A premium study space with seat visibility, student access, QR check-in, and direct owner contact."}
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
                <Link href={`/student/login?library=${profile.subdomain}`} className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_20px_45px_rgba(16,185,129,0.28)]">
                  Open student portal
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : null}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/14 bg-white/10 p-3 shadow-[0_30px_90px_rgba(0,0,0,0.28)] backdrop-blur">
            <div className="overflow-hidden rounded-[1.15rem] bg-slate-900">
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
        {page === "home" ? (
          <div className="grid gap-5">
            <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <SiteCard>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Why students choose us</p>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">A calmer study day, from seat to check-in.</h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                  {profile.about_text ?? "This library website gives students one clean place to discover facilities, check pricing, contact the owner, log in, and continue daily study actions."}
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <FacilityCard icon={<UsersRound className="h-5 w-5" />} title="Student-first" detail="Simple access for login, QR, dues, and notices." />
                  <FacilityCard icon={<QrCode className="h-5 w-5" />} title="QR ready" detail="Supports digital entry and owner-managed attendance." />
                  <FacilityCard icon={<Wifi className="h-5 w-5" />} title="Amenities" detail={`${amenities.slice(0, 2).join(", ")}${amenities.length > 2 ? " and more" : ""}.`} />
                  <FacilityCard icon={<Clock3 className="h-5 w-5" />} title="Clear hours" detail={profile.business_hours ?? "Daily study schedule shared by owner."} />
                </div>
              </SiteCard>

              <SiteCard className="bg-slate-950 text-white">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Current offer</p>
                <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white">{visibleOffer ?? "Contact owner for seat offers"}</h2>
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
                  <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-slate-950">See the study space before you visit.</h2>
                </div>
                <Link href={links.contact} className="text-sm font-black text-emerald-700">Book a visit</Link>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {gallery.slice(0, 3).map((item, index) => (
                  <div key={`${item}-${index}`} className="aspect-[16/11] overflow-hidden rounded-[1rem] bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item} alt={`${profile.library_name} gallery ${index + 1}`} className="h-full w-full object-cover transition duration-500 hover:scale-105" />
                  </div>
                ))}
              </div>
            </SiteCard>
          </div>
        ) : null}

        {page === "about" ? (
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <SiteCard className="bg-slate-950 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">About</p>
              <h2 className="mt-2 text-4xl font-black tracking-[-0.05em] text-white">{profile.library_name}</h2>
              <p className="mt-4 text-sm leading-7 text-white/70">
                {profile.about_text ?? "A premium LibraryPro-powered library website for students to discover, contact, log in, and continue daily study actions."}
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

        {page === "pricing" ? (
          <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
            <SiteCard className="bg-[linear-gradient(135deg,#0F172A,#115E59)] text-white">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Starting plan</p>
              <p className="mt-4 text-6xl font-black tracking-[-0.06em] text-white">Rs. {profile.starting_price}</p>
              <p className="mt-3 text-sm leading-7 text-white/70">Starting monthly seat pricing shared by the owner. Final plan and discounts are confirmed during admission.</p>
              <div className="mt-5 rounded-2xl border border-white/12 bg-white/10 p-4 text-sm font-bold text-white">
                {visibleOffer ?? "Ask owner for active discount offers and seat combinations."}
              </div>
            </SiteCard>
            <SiteCard>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Included access</p>
              <div className="mt-4 grid gap-3">
                {["Owner-issued student login", "Seat assignment and validity tracking", "QR entry support", "Payment reminders and notices"].map((item) => (
                  <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800">
                    {item}
                  </div>
                ))}
              </div>
            </SiteCard>
          </div>
        ) : null}

        {page === "contact" ? (
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <SiteCard>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Contact</p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">Talk to the library owner.</h2>
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
                {gallery.slice(0, 4).map((item, index) => (
                  <div key={`${item}-${index}`} className="aspect-[16/11] overflow-hidden rounded-[1rem] bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item} alt={`${profile.library_name} contact preview ${index + 1}`} className="h-full w-full object-cover" />
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
              <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-slate-950">Trusted by joined students.</h2>
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
    </main>
  );
}
