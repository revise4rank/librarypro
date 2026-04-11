"use client";

import { useEffect, useState } from "react";
import { apiFetch, hydrateSessionFromServer } from "../lib/api";
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
  published: boolean;
};

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
    published: profile.is_published,
  };
}

export function OwnerWebsiteBuilder({
  initialValues,
}: {
  initialValues: PublicProfileFormValues;
}) {
  const [values, setValues] = useState(initialValues);
  const [loadMessage, setLoadMessage] = useState<string | null>(null);
  const [requestedAction, setRequestedAction] = useState<"save-draft" | "publish" | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

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

    window.addEventListener("nextlib:owner-website-action", handler as EventListener);
    return () => window.removeEventListener("nextlib:owner-website-action", handler as EventListener);
  });

  return (
    <div className="grid gap-4">
      <div className="rounded-[1.25rem] border border-[var(--lp-border)] bg-white px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-slate-950">Website editor</p>
            <p className="mt-1 text-sm text-slate-500">
              {values.subdomain ? `${values.subdomain}.nextlib.in` : "Subdomain pending"} | {values.published ? "Published" : "Draft"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditorOpen((current) => !current)}
            className="rounded-full border border-[var(--lp-border)] bg-slate-50 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--lp-primary)]"
          >
            {editorOpen ? "Hide editor" : "Open editor"}
          </button>
        </div>
      </div>
      {loadMessage ? <p className="text-sm font-semibold text-slate-600">{loadMessage}</p> : null}
      {editorOpen ? (
        <PublicProfileForm initialValues={values} requestedAction={requestedAction} onActionHandled={() => setRequestedAction(null)} />
      ) : (
        <div className="rounded-[1rem] border border-dashed border-[var(--lp-border)] bg-white px-4 py-5 text-sm text-slate-500">
          Website editor hidden hai. Jab content edit ya publish karna ho tab isko open karo.
        </div>
      )}
    </div>
  );
}
