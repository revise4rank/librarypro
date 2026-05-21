"use client";

import { useEffect, useState } from "react";
import { apiFetch, hydrateSessionFromServer } from "../lib/api";
import { formatLibraryHost } from "../lib/domain";
import { resolvePublicAssetUrl } from "../lib/public-library";
import { DashboardCard } from "./dashboard-shell";
import { FormDrawer } from "./form-drawer";
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
  const [loadMessage, setLoadMessage] = useState<string | null>(null);
  const [requestedAction, setRequestedAction] = useState<"save-draft" | "publish" | null>(null);
  const [editorOpen, setEditorOpen] = useState(defaultEditorOpen);
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
  const qualityChecks = [
    values.brandLogoUrl,
    values.heroBannerUrl,
    values.heroTitle,
    values.heroTagline,
    values.aboutText,
    values.contactPhone || values.whatsappPhone,
    values.addressText,
    values.galleryImages.length >= 2,
    activePlans.length > 0,
    values.highlightOffer,
  ];
  const qualityScore = Math.round((qualityChecks.filter(Boolean).length / qualityChecks.length) * 100);

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
          setLoadMessage("Saved website profile loaded from API.");
        }
        if (response?.[1]?.data) {
          setPlans(response[1].data);
        }
      })
      .catch((error) => {
        setLoadMessage(error instanceof Error ? error.message : "Unable to load saved website profile.");
      });
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const action = (event as CustomEvent<"save-draft" | "publish">).detail;
      if (action === "publish" || action === "save-draft") {
        setRequestedAction(action);
      }
    };

    window.addEventListener("booklib:owner-website-action", handler as EventListener);
    return () => window.removeEventListener("booklib:owner-website-action", handler as EventListener);
  });

  return (
    <div className="grid gap-4">
      <DashboardCard title="Website builder" subtitle="Brand, pages, plans, offer, gallery, contact, and public subdomain preview stay synced from this workspace.">
        <div className="grid gap-4 xl:grid-cols-[0.78fr_1.22fr]">
          <div className="grid gap-3">
            <div className="grid gap-3 rounded-xl border border-[var(--lp-border)] bg-white p-4 sm:grid-cols-2">
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
                <p className="mt-2 text-2xl font-black text-slate-950">{enabledPages || 6}</p>
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
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {["Brand", "Home", "Sections", "Pages", "Theme", "SEO"].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setEditorOpen(true)}
                  className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm font-black text-slate-700 hover:border-[var(--lp-accent)] hover:text-[var(--lp-accent)]"
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setEditorOpen(true)}
                className="rounded-full border border-[var(--lp-accent-soft)] bg-[var(--lp-accent-soft)] px-5 py-3 text-sm font-bold text-[var(--lp-accent-strong)]"
              >
                Edit website
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditorOpen(true);
                  setRequestedAction("save-draft");
                }}
                className="rounded-full border border-[var(--lp-border)] bg-white px-5 py-3 text-sm font-bold text-slate-700"
              >
                Save draft
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditorOpen(true);
                  setRequestedAction("publish");
                }}
                className="rounded-full bg-[var(--lp-primary)] px-5 py-3 text-sm font-bold text-white"
              >
                Publish
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-900 bg-slate-950 text-white shadow-sm">
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
                  <p className="mt-2 text-lg font-black">{enabledPages || 6} enabled</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardCard>
      {loadMessage ? <p className="text-sm font-semibold text-slate-600">{loadMessage}</p> : null}

      <FormDrawer
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title="Edit website"
        description="Edit identity, pages, media, theme, contact, SEO, and publishing settings."
        widthClassName="sm:w-[min(96vw,56rem)] sm:max-w-5xl"
      >
        <PublicProfileForm initialValues={values} requestedAction={requestedAction} onActionHandled={() => setRequestedAction(null)} />
      </FormDrawer>
    </div>
  );
}
