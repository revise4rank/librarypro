"use client";

import { useEffect, useState } from "react";
import { apiFetch, hydrateSessionFromServer } from "../lib/api";
import { formatLibraryHost } from "../lib/domain";
import { resolvePublicAssetUrl } from "../lib/public-library";
import { DashboardCard } from "./dashboard-shell";
import { FormDrawer } from "./form-drawer";
import { PublicProfileForm } from "./public-profile-form";

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
  const heroPreview = resolvePublicAssetUrl(values.heroBannerUrl);
  const logoPreview = resolvePublicAssetUrl(values.brandLogoUrl);
  const enabledPages = Object.values(values.sitePages ?? {}).filter((page) => page?.enabled !== false).length;
  const siteHost = values.subdomain ? formatLibraryHost(values.subdomain) : "Subdomain pending";

  useEffect(() => {
    hydrateSessionFromServer()
      .then((session) => {
        if (!session?.user || session.user.role !== "LIBRARY_OWNER") {
          return null;
        }

        return apiFetch<OwnerPublicProfileResponse>("/owner/public-profile");
      })
      .then((response) => {
        if (response?.data) {
          setValues(mapProfileToFormValues(response.data));
          setLoadMessage("Saved website profile loaded from API.");
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
      <DashboardCard title="Website workspace" subtitle="Public subdomain, page content, media, and publishing stay editable from one focused drawer.">
        <div className="grid gap-4 xl:grid-cols-[0.86fr_1.14fr]">
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
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Gallery</p>
                <p className="mt-2 text-2xl font-black text-slate-950">{values.galleryImages.length}</p>
              </div>
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

          <div className="overflow-hidden rounded-xl border border-[var(--lp-border)] bg-white">
            <div className="aspect-[16/7] bg-slate-100">
              {heroPreview ? <img src={heroPreview} alt="Website hero preview" className="h-full w-full object-cover" /> : null}
            </div>
            <div className="grid gap-3 p-4">
              <div className="flex items-start gap-3">
                {logoPreview ? <img src={logoPreview} alt="Brand logo preview" className="h-12 w-12 rounded-lg object-cover ring-1 ring-slate-200" /> : null}
                <div className="min-w-0">
                  <p className="truncate text-lg font-black text-slate-950">{values.heroTitle || "Website headline"}</p>
                  <p className="line-clamp-2 text-sm leading-6 text-slate-600">{values.heroTagline || "Website tagline appears here."}</p>
                </div>
              </div>
              <p className="line-clamp-3 text-sm leading-6 text-slate-600">{values.aboutText || "About section preview appears after the owner adds public copy."}</p>
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
