import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { ContactActions } from "./contact-actions";
import { PublicLibraryProfile, PublicLibraryReview, getGalleryUrl } from "../lib/public-library";
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

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-4 py-2 text-sm font-semibold ${
        active
          ? "bg-[var(--lp-primary)] text-white"
          : "border border-[var(--lp-border)] bg-[var(--lp-surface)] text-[var(--lp-primary)]"
      }`}
    >
      {children}
    </Link>
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
  const pageStyle = {
    "--NL-primary": profile.theme_primary ?? "#d2723d",
    "--NL-accent": profile.theme_accent ?? "#2f8f88",
    "--NL-surface": profile.theme_surface ?? "#fff9f0",
  } as CSSProperties;
  const gallery = (profile.gallery_images?.length
    ? profile.gallery_images
    : ["/library-gallery/study-hall.svg", "/library-gallery/reading-zone.svg", "/library-gallery/reception.svg"]).map(
    getGalleryUrl,
  );

  const highlights = [
    { label: "Available seats", value: String(profile.available_seats) },
    { label: "Starting price", value: `Rs. ${profile.starting_price}` },
    { label: "Hours", value: profile.business_hours ?? "Daily" },
    { label: "Rating", value: `${profile.rating ?? "0.0"}/5` },
  ];

  return (
    <main
      style={pageStyle}
      className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(236,173,132,0.18),transparent_24%),radial-gradient(circle_at_top_right,rgba(153,214,209,0.18),transparent_22%),linear-gradient(180deg,#fbf6ee_0%,#fffaf3_52%,#f6efe4_100%)] text-[var(--lp-text)]"
    >
      <section
        className="text-[var(--lp-text)]"
        style={{
          backgroundImage: profile.hero_banner_url
            ? `linear-gradient(rgba(255,241,227,0.82), rgba(255,248,239,0.88), rgba(229,242,239,0.9)), url(${profile.hero_banner_url})`
            : "linear-gradient(135deg,#fff1e3,#fff8ef 45%,#e5f2ef)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="mx-auto max-w-[1480px] px-4 py-6 md:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              {profile.brand_logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.brand_logo_url} alt={profile.library_name} className="h-14 w-14 rounded-[1.2rem] object-cover shadow-[0_10px_30px_rgba(111,95,74,0.16)]" />
              ) : (
                <div className="grid h-14 w-14 place-items-center rounded-[1.2rem] bg-[linear-gradient(135deg,#e8a27d,#2f8f88)] text-lg font-black text-white">
                  {profile.library_name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[var(--lp-primary)]">
                  Published Library Website
                </p>
                <p className="mt-2 break-all text-sm text-[var(--lp-muted)]">
                  {profile.custom_domain || `${profile.subdomain}.nextlib.in`}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--lp-accent)]">
                  Premium library subdomain website
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/marketplace" className="rounded-full border border-[var(--lp-border)] bg-[var(--lp-surface)] px-4 py-2 text-sm font-semibold text-[var(--lp-primary)]">
                Marketplace
              </Link>
              {showStudentActions ? (
                <Link href={`/student/login?library=${profile.subdomain}`} className="rounded-full bg-[var(--lp-primary)] px-4 py-2 text-sm font-semibold text-white">
                  Student login on this website
                </Link>
              ) : null}
            </div>
          </div>

          <div className="mt-6 flex gap-3 overflow-x-auto pb-1">
            <NavLink href={links.home} active={page === "home"}>Home</NavLink>
            <NavLink href={links.about} active={page === "about"}>About</NavLink>
            <NavLink href={links.pricing} active={page === "pricing"}>Pricing</NavLink>
            <NavLink href={links.contact} active={page === "contact"}>Contact</NavLink>
          </div>

          <div className="mt-12 grid gap-10 xl:grid-cols-[1.05fr_0.95fr] xl:items-end">
            <div>
              <div className="inline-flex rounded-full bg-[var(--lp-surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--lp-primary)]">
                {profile.area ?? "Prime Area"}, {profile.city}
              </div>
              <h1 className="mt-6 max-w-4xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl md:text-6xl">
                {profile.hero_title}
              </h1>
              <p className="mt-6 max-w-3xl text-sm leading-7 text-[var(--lp-muted)] sm:text-base sm:leading-8">
                {profile.hero_tagline ?? profile.about_text ?? "Owner-managed library website with student login, QR check-in, notices, and premium public branding."}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <ContactActions
                  slugOrSubdomain={profile.subdomain}
                  phone={profile.contact_phone}
                  whatsappPhone={profile.whatsapp_phone}
                  sourcePage="LIBRARY_SITE"
                />
                {showStudentActions ? (
                  <Link href={`/student/qr?library=${profile.subdomain}`} className="rounded-full border border-[var(--lp-border)] bg-[var(--lp-surface)] px-6 py-3 text-sm font-semibold text-[var(--lp-primary)]">
                    Student QR check-in
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {highlights.map((item) => (
                <div key={item.label} className="rounded-[1.75rem] border border-[var(--lp-border)] bg-[var(--lp-surface)] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--lp-accent)]">{item.label}</p>
                  <p className="mt-3 text-2xl font-black">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1480px] px-4 py-8 md:px-8 xl:py-12">
        {page === "home" ? (
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-[2rem] border border-[var(--lp-border)] bg-[var(--lp-surface)] p-6 shadow-[0_12px_30px_rgba(93,138,102,0.08)]">
              <h2 className="text-2xl font-extrabold">About {profile.library_name}</h2>
              <p className="mt-4 text-sm leading-8 text-[var(--lp-muted)]">
                {profile.about_text ?? "This premium library website is managed directly by the owner and gives students a single place to view facilities, contact details, pricing, login, and QR check-in access."}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {(profile.amenities ?? []).map((amenity) => (
                  <span key={amenity} className="rounded-full bg-[#edf5ee] px-4 py-2 text-sm font-medium text-[var(--lp-primary)]">
                    {amenity}
                  </span>
                ))}
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-[1.5rem] bg-[#edf7ef] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--lp-accent)]">Offer</p>
                  <p className="mt-2 text-lg font-black text-slate-950">{visibleOffer ?? "Contact owner for current offers"}</p>
                  {profile.offer_expires_at ? <p className="mt-2 text-xs font-semibold text-slate-500">Valid till {profile.offer_expires_at.slice(0, 10)}</p> : null}
                </div>
                <div className="rounded-[1.5rem] bg-[#f4faf5] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--lp-accent)]">Landmark</p>
                  <p className="mt-2 text-lg font-black text-slate-950">{profile.landmark ?? "Local landmark shared by owner"}</p>
                </div>
                <div className="rounded-[1.5rem] bg-[#edf7ef] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--lp-accent)]">Address</p>
                  <p className="mt-2 text-sm font-bold text-slate-950">{profile.address}</p>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-[var(--lp-border)] bg-[var(--lp-surface)] p-6 shadow-[0_12px_30px_rgba(93,138,102,0.08)]">
              <h2 className="text-2xl font-extrabold">Student actions on this website</h2>
              <div className="mt-6 grid gap-3">
                <div className="rounded-[1.25rem] bg-[var(--lp-primary)] px-4 py-4 text-left text-sm font-semibold text-white">
                  Ask about seat availability
                </div>
                <Link href={`/student/login?library=${profile.subdomain}`} className="rounded-[1.25rem] border border-[var(--lp-border)] bg-[var(--lp-surface)] px-4 py-4 text-sm font-semibold text-[var(--lp-primary)]">
                  Login with owner-issued ID
                </Link>
                <Link href={`/student/qr?library=${profile.subdomain}`} className="rounded-[1.25rem] border border-[var(--lp-border)] bg-[var(--lp-surface)] px-4 py-4 text-sm font-semibold text-[var(--lp-primary)]">
                  Open QR and check-in flow
                </Link>
                <Link href={links.contact} className="rounded-[1.25rem] border border-[var(--lp-border)] bg-[var(--lp-surface)] px-4 py-4 text-sm font-semibold text-[var(--lp-primary)]">
                  Contact owner directly
                </Link>
              </div>
              <div className="mt-5 rounded-[1.4rem] bg-[#fff4ea] p-4 text-sm leading-7 text-[var(--lp-muted)]">
                Premium plan libraries get this full website plus owner control panel, student login, QR check-in, notices, payments, and daily management from the same subdomain.
              </div>
            </section>
          </div>
        ) : null}

        {page === "about" ? (
          <section className="rounded-[2rem] border border-[var(--lp-border)] bg-[var(--lp-surface)] p-6 shadow-[0_12px_30px_rgba(93,138,102,0.08)]">
            <h2 className="text-3xl font-extrabold">About the library</h2>
            <p className="mt-5 max-w-4xl text-base leading-8 text-[var(--lp-muted)]">
              {profile.about_text ?? "This library is listed on Nextlib and managed through a dedicated subdomain website. Students can use the same library website for admission, login, QR check-in, notices, and daily updates."}
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {(profile.amenities ?? []).map((amenity) => (
                <div key={amenity} className="rounded-[1.5rem] border border-[var(--lp-border)] bg-[#f5faf6] p-5">
                  <p className="text-sm font-bold text-[var(--lp-text)]">{amenity}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {page === "pricing" ? (
          <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
            <div className="rounded-[2rem] border border-[var(--lp-border)] bg-[var(--lp-surface)] p-6 shadow-[0_12px_30px_rgba(93,138,102,0.08)]">
              <h2 className="text-3xl font-extrabold">Pricing and offers</h2>
              <div className="mt-6 rounded-[1.75rem] bg-[linear-gradient(135deg,_#fff1e3,_#fff8ef_55%,_#e5f2ef)] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--lp-accent)]">Monthly plan</p>
                <p className="mt-3 text-5xl font-black text-[var(--lp-text)]">Rs. {profile.starting_price}</p>
                <p className="mt-2 text-sm text-[var(--lp-muted)]">Starting monthly seat pricing shared by the owner.</p>
                <div className="mt-5 rounded-[1.2rem] bg-white/70 px-4 py-4 text-sm font-semibold text-[var(--lp-primary)]">
                  {visibleOffer ?? "Contact the owner for active discount offers and seat combinations."}
                </div>
              </div>
            </div>
            <div className="rounded-[2rem] border border-[var(--lp-border)] bg-[var(--lp-surface)] p-6 shadow-[0_12px_30px_rgba(93,138,102,0.08)]">
              <h2 className="text-2xl font-extrabold">What students get</h2>
                <div className="mt-5 grid gap-3">
                {[
                  "Owner-issued student login credentials",
                  "Seat assignment and validity tracking",
                  "QR-based check-in and attendance register",
                  "Notices, WiFi details, and payment reminders",
                ].map((item) => (
                  <div key={item} className="rounded-[1.25rem] border border-[var(--lp-border)] bg-[#f5faf6] px-4 py-4 text-sm font-semibold text-[var(--lp-text)]">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {page === "contact" ? (
          <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[2rem] border border-[var(--lp-border)] bg-[var(--lp-surface)] p-6 shadow-[0_12px_30px_rgba(93,138,102,0.08)]">
              <h2 className="text-3xl font-extrabold">Contact the owner</h2>
              <div className="mt-6 grid gap-4">
                <div className="rounded-[1.5rem] bg-[#f5faf6] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--lp-accent)]">Contact person</p>
                  <p className="mt-2 text-lg font-black">{profile.contact_name ?? profile.library_name}</p>
                </div>
                <div className="rounded-[1.5rem] bg-[#f5faf6] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--lp-accent)]">Phone</p>
                  <p className="mt-2 text-lg font-black">{profile.contact_phone ?? "Contact available on request"}</p>
                </div>
                <div className="rounded-[1.5rem] bg-[#f5faf6] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--lp-accent)]">Email</p>
                  <p className="mt-2 text-lg font-black">{profile.email ?? "Email not published"}</p>
                </div>
                <div className="rounded-[1.5rem] bg-[#f5faf6] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--lp-accent)]">Address</p>
                  <p className="mt-2 text-sm font-bold">{profile.address}</p>
                </div>
              </div>
            </div>
            <div className="rounded-[2rem] border border-[var(--lp-border)] bg-[var(--lp-surface)] p-6 shadow-[0_12px_30px_rgba(93,138,102,0.08)]">
              <h2 className="text-2xl font-extrabold">Photo gallery</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {gallery.map((item, index) => (
                  <div key={`${item}-${index}`} className="aspect-[16/10] overflow-hidden rounded-[1.75rem] bg-[linear-gradient(135deg,_#dff0e2,_#eef8f0_35%,_#cfe7d4)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item} alt={profile.library_name} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {page === "home" ? (
          <section className="mt-6 rounded-[2rem] border border-[var(--lp-border)] bg-[var(--lp-surface)] p-6 shadow-[0_12px_30px_rgba(93,138,102,0.08)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-extrabold">Photo gallery</h2>
                <p className="mt-1 text-sm text-[var(--lp-muted)]">Owner-managed visual showcase</p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {gallery.map((item, index) => (
                <div key={`${item}-${index}`} className="aspect-[16/10] overflow-hidden rounded-[1.75rem] bg-[linear-gradient(135deg,_#dff0e2,_#eef8f0_35%,_#cfe7d4)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item} alt={profile.library_name} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-6 rounded-[2rem] border border-[var(--lp-border)] bg-[var(--lp-surface)] p-6 shadow-[0_12px_30px_rgba(93,138,102,0.08)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-extrabold">Student reviews</h2>
              <p className="mt-1 text-sm text-[var(--lp-muted)]">
                Only joined students can post reviews. Marketplace trust score updates from these reviews.
              </p>
            </div>
            <div className="rounded-full bg-[#edf7ef] px-4 py-2 text-sm font-bold text-[var(--lp-primary)]">
              {profile.rating ?? "0.0"}/5 from {profile.reviews ?? "0"} reviews
            </div>
          </div>
          <div className="mt-6">
            <LibraryReviewsPanel reviews={reviews} />
          </div>
        </section>
      </section>
    </main>
  );
}
