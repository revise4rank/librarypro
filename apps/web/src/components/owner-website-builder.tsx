"use client";

import { useEffect, useState } from "react";
import { apiFetch, hydrateSessionFromServer } from "../lib/api";
import { formatLibraryHost } from "../lib/domain";
import { resolvePublicAssetUrl } from "../lib/public-library";
import { DashboardCard } from "./dashboard-shell";
import { PublicProfileForm } from "./public-profile-form";

type StudentPlanConfig = {
  id: string;
  name: string;
  duration_months: number;
  base_amount: string;
  is_active: boolean;
};

type PublicProfileFormValues = {
  subdomain: string;
  brandLogoUrl: string;
  heroBannerUrl: string;
  heroTitle: string;
  heroTagline: string;
  aboutText: string;
  contactName: string;
  contactPhone: string;
  whatsappPhone: string;
  addressText: string;
  landmark: string;
  businessHours: string;
  highlightOffer: string;
  offerExpiresAt: string;
  seoTitle: string;
  seoDescription: string;
  adBudget: string;
  themePrimary: string;
  themeAccent: string;
  themeSurface: string;
  amenities: string[];
  galleryImages: string[];
  sitePages: SitePagesConfig;
  published: boolean;
};

type SitePageKey = "home" | "features" | "gallery" | "pricing" | "about" | "contact";

type SitePageConfig = {
  enabled: boolean;
  navLabel: string;
  title: string;
  subtitle: string;
  body: string;
  layout: "classic" | "split" | "spotlight" | "compact";
  items: { title: string; detail: string }[];
};

type SitePagesConfig = Partial<Record<SitePageKey, SitePageConfig>>;
type BuilderSection = "identity" | "hero" | "pages" | "theme" | "contact" | "seo" | "gallery";

type OwnerPublicProfileResponse = {
  success: boolean;
  data: {
    subdomain: string;
    brand_logo_url: string | null;
    hero_banner_url: string | null;
    hero_title: string;
    hero_tagline: string | null;
    about_text: string | null;
    contact_name: string | null;
    contact_phone: string | null;
    whatsapp_phone: string | null;
    address_text: string;
    landmark: string | null;
    business_hours: string | null;
    highlight_offer: string | null;
    offer_expires_at: string | null;
    seo_title: string | null;
    seo_description: string | null;
    ad_budget: string;
    theme_primary: string | null;
    theme_accent: string | null;
    theme_surface: string | null;
    amenities: string[] | null;
    gallery_images: string[] | null;
    site_pages: SitePagesConfig | null;
    is_published: boolean;
  } | null;
};

function mapProfileToFormValues(profile: NonNullable<OwnerPublicProfileResponse["data"]>): PublicProfileFormValues {
  return {
    subdomain: profile.subdomain,
    brandLogoUrl: profile.brand_logo_url ?? "",
    heroBannerUrl: profile.hero_banner_url ?? "",
    heroTitle: profile.hero_title,
    heroTagline: profile.hero_tagline ?? "",
    aboutText: profile.about_text ?? "",
    contactName: profile.contact_name ?? "",
    contactPhone: profile.contact_phone ?? "",
    whatsappPhone: profile.whatsapp_phone ?? "",
    addressText: profile.address_text,
    landmark: profile.landmark ?? "",
    businessHours: profile.business_hours ?? "",
    highlightOffer: profile.highlight_offer ?? "",
    offerExpiresAt: profile.offer_expires_at?.slice(0, 10) ?? "",
    seoTitle: profile.seo_title ?? "",
    seoDescription: profile.seo_description ?? "",
    adBudget: profile.ad_budget ?? "0",
    themePrimary: profile.theme_primary ?? "#d2723d",
    themeAccent: profile.theme_accent ?? "#2f8f88",
    themeSurface: profile.theme_surface ?? "#fff9f0",
    amenities: profile.amenities ?? [],
    galleryImages: profile.gallery_images ?? [],
    sitePages: profile.site_pages ?? {},
    published: profile.is_published,
  };
}

export function OwnerWebsiteBuilder({
  initialValues,
  defaultEditorOpen = false,
}: {
  initialValues: PublicProfileFormValues;
  defaultEditorOpen?: boolean;
}) {
  const [values, setValues] = useState(initialValues);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [requestedAction, setRequestedAction] = useState<"save-draft" | "publish" | null>(null);
  const [activeSection, setActiveSection] = useState<BuilderSection>(defaultEditorOpen ? "identity" : "hero");
  const [activePage, setActivePage] = useState<SitePageKey>("home");
  const [plans, setPlans] = useState<StudentPlanConfig[]>([]);
  const heroPreview = resolvePublicAssetUrl(values.heroBannerUrl);
  const logoPreview = resolvePublicAssetUrl(values.brandLogoUrl);
  const enabledPages = Object.values(values.sitePages ?? {}).filter((page) => page?.enabled !== false).length;
  const siteHost = values.subdomain ? formatLibraryHost(values.subdomain) : "Subdomain pending";
  const activePlans = plans.filter((plan) => plan.is_active);
  const startingPlan = activePlans.reduce<StudentPlanConfig | null>((lowest, plan) => {
    if (!lowest) return plan;
    return Number(plan.base_amount || "0") < Number(lowest.base_amount || "0") ? plan : lowest;
  }, null);
  const qualityItems = [
    { label: "Brand logo", done: Boolean(values.brandLogoUrl), section: "identity" as BuilderSection },
    { label: "Hero image", done: Boolean(values.heroBannerUrl), section: "hero" as BuilderSection },
    { label: "Hero headline", done: Boolean(values.heroTitle), section: "hero" as BuilderSection },
    { label: "Hero tagline", done: Boolean(values.heroTagline), section: "hero" as BuilderSection },
    { label: "About content", done: Boolean(values.aboutText), section: "pages" as BuilderSection, page: "about" as SitePageKey },
    { label: "Contact number", done: Boolean(values.contactPhone || values.whatsappPhone), section: "contact" as BuilderSection },
    { label: "Address", done: Boolean(values.addressText), section: "contact" as BuilderSection },
    { label: "Gallery photos", done: values.galleryImages.length >= 2, section: "gallery" as BuilderSection },
    { label: "Public plans", done: activePlans.length > 0, section: "pages" as BuilderSection, page: "pricing" as SitePageKey },
    { label: "Offer badge", done: Boolean(values.highlightOffer), section: "hero" as BuilderSection },
  ];
  const qualityScore = Math.round((qualityItems.filter((item) => item.done).length / qualityItems.length) * 100);
  const siteUrl = values.subdomain ? `https://${formatLibraryHost(values.subdomain)}` : "";
  const builderShortcuts: { label: string; section: BuilderSection; page?: SitePageKey }[] = [
    { label: "Brand", section: "identity" },
    { label: "Hero", section: "hero" },
    { label: "Home", section: "pages", page: "home" },
    { label: "Features", section: "pages", page: "features" },
    { label: "Pricing", section: "pages", page: "pricing" },
    { label: "Gallery", section: "gallery", page: "gallery" },
    { label: "All Pages", section: "pages" },
    { label: "Theme", section: "theme" },
    { label: "Contact", section: "contact" },
    { label: "SEO", section: "seo" },
  ];

  function openBuilderSection(section: BuilderSection, page?: SitePageKey) {
    setActiveSection(section);
    if (page) {
      setActivePage(page);
    }
  }

  useEffect(() => {
    hydrateSessionFromServer()
      .then((session) => {
        if (!session?.user || session.user.role !== "LIBRARY_OWNER") {
          return null;
        }

        return Promise.all([
          apiFetch<OwnerPublicProfileResponse>("/owner/public-profile"),
          apiFetch<{ success: boolean; data: StudentPlanConfig[] }>("/owner/student-plans").catch(() => ({ success: false, data: [] })),
        ]);
      })
      .then((response) => {
        if (response?.[0]?.data) {
          setValues(mapProfileToFormValues(response[0].data));
        }
        if (response?.[1]?.data) {
          setPlans(response[1].data);
        }
      })
      .catch((error) => {
        setLoadError(error instanceof Error ? error.message : "Unable to load saved website profile.");
      });
  }, []);

  return (
    <div className="grid min-w-0 gap-4 overflow-hidden">
      <DashboardCard title="Website builder" subtitle="Brand, pages, plans, offer, gallery, contact, and public subdomain preview stay synced from this workspace.">
        <div className="grid min-w-0 gap-4">
          <div className="grid gap-3 xl:grid-cols-[0.86fr_1.14fr] xl:items-start">
            <div className="grid gap-3 rounded-xl border border-[var(--lp-border)] bg-white p-3 sm:grid-cols-2 xl:grid-cols-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">URL</p>
                <p className="mt-2 break-all text-sm font-black text-slate-950">{siteHost}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">State</p>
                <p className={`mt-2 text-sm font-black ${values.published ? "text-emerald-700" : "text-amber-700"}`}>{values.published ? "Published" : "Draft"}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Pages</p>
                <p className="mt-2 text-2xl font-black text-slate-950">{enabledPages}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Quality</p>
                <p className="mt-2 text-2xl font-black text-slate-950">{qualityScore}%</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Plans</p>
                <p className="mt-2 text-sm font-black text-slate-950">{startingPlan ? `From Rs. ${startingPlan.base_amount}` : "Add public plan"}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Offer</p>
                <p className="mt-2 line-clamp-1 text-sm font-black text-slate-950">{values.highlightOffer || "No active offer"}</p>
              </div>
            </div>
            <div className="flex flex-wrap justify-start gap-2 xl:justify-end">
              <button
                type="button"
                onClick={() => setRequestedAction("save-draft")}
                className="rounded-full border border-[var(--lp-border)] bg-white px-5 py-3 text-sm font-bold text-slate-700"
              >
                Save draft
              </button>
              <button
                type="button"
                onClick={() => {
                  const confirmed = typeof window === "undefined" || window.confirm(`Publish website at ${siteHost}?`);
                  if (confirmed) {
                    setRequestedAction("publish");
                  }
                }}
                className="rounded-full bg-[var(--lp-primary)] px-5 py-3 text-sm font-bold text-white"
              >
                Publish website
              </button>
              {siteUrl ? (
                <a
                  href={siteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-[var(--lp-border)] bg-white px-5 py-3 text-sm font-bold text-slate-700"
                >
                  Open website
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="cursor-not-allowed rounded-full border border-[var(--lp-border)] bg-slate-100 px-5 py-3 text-sm font-bold text-slate-400"
                >
                  Open website
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 lg:grid-cols-10">
            {builderShortcuts.map((item) => (
              <button
                key={`${item.section}-${item.page ?? item.label}`}
                type="button"
                onClick={() => openBuilderSection(item.section, item.page)}
                className={`rounded-lg border px-3 py-2 text-sm font-black transition ${
                  activeSection === item.section && (!item.page || item.page === activePage)
                    ? "border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] text-[var(--lp-accent-strong)]"
                    : "border-[var(--lp-border)] bg-white text-slate-700 hover:border-[var(--lp-accent)] hover:text-[var(--lp-accent)]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="grid gap-2 rounded-xl border border-[var(--lp-border)] bg-white p-3 sm:grid-cols-2 lg:grid-cols-5">
            {qualityItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => openBuilderSection(item.section, item.page)}
                className={`rounded-lg px-3 py-2 text-left text-xs font-black transition ${
                  item.done ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                }`}
              >
                {item.done ? "OK" : "Missing"} · {item.label}
              </button>
            ))}
          </div>

          <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.62fr)]">
            <div className="min-w-0 overflow-hidden rounded-xl border border-[var(--lp-border)] bg-white p-3">
              <PublicProfileForm
                initialValues={values}
                requestedAction={requestedAction}
                onActionHandled={() => setRequestedAction(null)}
                activeSection={activeSection}
                onSectionChange={setActiveSection}
                activePage={activePage}
                onPageChange={setActivePage}
                onValuesChange={setValues}
                hideStatusPanel
              />
            </div>

            <div className="min-w-0 overflow-hidden rounded-xl border border-slate-900 bg-slate-950 text-white shadow-sm xl:sticky xl:top-4 xl:self-start">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Live website preview</p>
                  <p className="mt-1 truncate text-sm font-bold text-white/70">{siteHost}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${values.published ? "bg-emerald-300 text-slate-950" : "bg-amber-200 text-slate-950"}`}>
                  {values.published ? "Published" : "Draft"}
                </span>
              </div>
              <div className="relative aspect-[16/8] bg-slate-900">
              {heroPreview ? <img src={heroPreview} alt="Website hero preview" className="h-full w-full object-cover opacity-75" /> : null}
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.92),rgba(2,6,23,0.40))]" />
              <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
                <div className="flex min-w-0 items-center gap-3">
                  {logoPreview ? <img src={logoPreview} alt="Brand logo preview" className="h-10 w-10 rounded-xl object-cover ring-1 ring-white/20" /> : <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-sm font-black text-slate-950">BL</div>}
                  <p className="truncate text-sm font-black">{values.heroTitle || "Website headline"}</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-950">Student login</span>
              </div>
              <div className="absolute bottom-5 left-5 right-5 max-w-xl">
                {values.highlightOffer ? <span className="rounded-full bg-amber-300 px-3 py-1.5 text-xs font-black text-slate-950">{values.highlightOffer}</span> : null}
                <h3 className="mt-3 text-3xl font-black tracking-[-0.04em]">{values.heroTitle || "Premium public website"}</h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/72">{values.heroTagline || "Website tagline appears here."}</p>
              </div>
              </div>
              <div className="grid gap-3 p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/10 p-3">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300">Starting</p>
                  <p className="mt-2 text-lg font-black">{startingPlan ? `Rs. ${startingPlan.base_amount}` : "Add plan"}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/10 p-3">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300">Gallery</p>
                  <p className="mt-2 text-lg font-black">{values.galleryImages.length} photos</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/10 p-3">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300">Pages</p>
                  <p className="mt-2 text-lg font-black">{enabledPages} enabled</p>
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardCard>
      {loadError ? <p className="text-sm font-semibold text-rose-600">{loadError}</p> : null}
    </div>
  );
}
