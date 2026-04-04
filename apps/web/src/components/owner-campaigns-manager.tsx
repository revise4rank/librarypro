"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";

type CampaignProfile = {
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
    email: string | null;
    address_text: string;
    landmark: string | null;
    business_hours: string | null;
    highlight_offer: string | null;
    offer_expires_at: string | null;
    seo_title: string | null;
    seo_description: string | null;
    ad_budget: string;
    amenities: string[] | null;
    gallery_images: string[] | null;
    show_in_marketplace: boolean;
    allow_direct_contact: boolean;
    theme_primary: string | null;
    theme_accent: string | null;
    theme_surface: string | null;
    is_published: boolean;
  } | null;
};

export function OwnerCampaignsManager() {
  const [profile, setProfile] = useState<CampaignProfile["data"] | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadProfile() {
    try {
      const response = await apiFetch<CampaignProfile>("/owner/public-profile");
      setProfile(response.data);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load campaign profile.");
    }
  }

  useEffect(() => {
    void loadProfile();
  }, []);

  async function saveCampaign() {
    if (!profile) {
      return;
    }

    setSaving(true);
    try {
      await apiFetch("/owner/public-profile", {
        method: "POST",
        body: JSON.stringify({
          subdomain: profile.subdomain,
          brandLogoUrl: profile.brand_logo_url ?? "",
          heroBannerUrl: profile.hero_banner_url ?? "",
          heroTitle: profile.hero_title,
          heroTagline: profile.hero_tagline ?? "",
          aboutText: profile.about_text ?? "",
          contactName: profile.contact_name ?? "",
          contactPhone: profile.contact_phone ?? "",
          whatsappPhone: profile.whatsapp_phone ?? "",
          email: profile.email ?? "",
          addressText: profile.address_text,
          latitude: null,
          longitude: null,
          landmark: profile.landmark ?? "",
          businessHours: profile.business_hours ?? "",
          amenities: profile.amenities ?? [],
          galleryImages: profile.gallery_images ?? [],
          seoTitle: profile.seo_title ?? "",
          seoDescription: profile.seo_description ?? "",
          metaKeywords: "",
          showInMarketplace: profile.show_in_marketplace,
          allowDirectContact: profile.allow_direct_contact,
          adBudget: Number(profile.ad_budget || "0"),
          highlightOffer: profile.highlight_offer ?? "",
          offerExpiresAt: profile.offer_expires_at?.slice(0, 10) ?? "",
          themePrimary: profile.theme_primary ?? "#d2723d",
          themeAccent: profile.theme_accent ?? "#2f8f88",
          themeSurface: profile.theme_surface ?? "#fff9f0",
        }),
      });
      setStatus("Campaign settings saved to marketplace and public website.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save campaign settings.");
    } finally {
      setSaving(false);
    }
  }

  async function triggerDueRecovery() {
    try {
      const response = await apiFetch<{ success: boolean; data: { recipientCount: number; channels: string[] } }>("/owner/campaigns/due-recovery", {
        method: "POST",
        body: JSON.stringify({}),
      });
      setStatus(`Due recovery automation sent to ${response.data.recipientCount} students via ${response.data.channels.join(", ")}.`);
    } catch (triggerError) {
      setError(triggerError instanceof Error ? triggerError.message : "Unable to trigger due recovery.");
    }
  }

  if (!profile) {
    return <p className="text-sm text-slate-500">{error ?? "Loading campaign center..."}</p>;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <DashboardCard title="Campaign center" subtitle="Publish offers that show up on marketplace cards and your subdomain hero">
        <div className="grid gap-4">
          <input
            value={profile.highlight_offer ?? ""}
            onChange={(event) => setProfile((current) => current ? { ...current, highlight_offer: event.target.value } : current)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none"
            placeholder="Example: Free trial day + first week discount"
          />
          <input
            type="date"
            value={profile.offer_expires_at?.slice(0, 10) ?? ""}
            onChange={(event) => setProfile((current) => current ? { ...current, offer_expires_at: event.target.value } : current)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none"
          />
          <input
            value={profile.ad_budget}
            onChange={(event) => setProfile((current) => current ? { ...current, ad_budget: event.target.value } : current)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none"
            placeholder="Monthly ad budget"
          />
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={profile.show_in_marketplace}
              onChange={(event) => setProfile((current) => current ? { ...current, show_in_marketplace: event.target.checked } : current)}
            />
            Show this library in marketplace discovery
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={profile.allow_direct_contact}
              onChange={(event) => setProfile((current) => current ? { ...current, allow_direct_contact: event.target.checked } : current)}
            />
            Allow direct contact leads from marketplace and subdomain
          </label>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => void saveCampaign()} disabled={saving} className="rounded-full bg-[var(--lp-primary)] px-5 py-3 text-sm font-bold text-white disabled:opacity-60">
              {saving ? "Saving..." : "Save campaign"}
            </button>
            <button type="button" onClick={() => void triggerDueRecovery()} className="rounded-full border border-[var(--lp-border)] bg-[var(--lp-surface)] px-5 py-3 text-sm font-bold text-[var(--lp-text)]">
              Send due recovery
            </button>
          </div>
          {status ? <p className="text-sm font-semibold text-emerald-700">{status}</p> : null}
          {error ? <p className="text-sm font-semibold text-amber-700">{error}</p> : null}
        </div>
      </DashboardCard>

      <DashboardCard title="Campaign preview" subtitle="How your marketplace offer and theme direction will feel to students">
        <div className="rounded-[1.75rem] border border-[var(--lp-border)] p-5" style={{ background: profile.theme_surface ?? "#fff9f0" }}>
          <div className="rounded-[1.5rem] p-5 text-white" style={{ background: profile.theme_primary ?? "#d2723d" }}>
            <p className="text-xs font-black uppercase tracking-[0.24em] opacity-80">Marketplace highlight</p>
            <p className="mt-3 text-2xl font-black">{profile.highlight_offer ?? "Publish an offer to boost conversion."}</p>
            {profile.offer_expires_at ? <p className="mt-2 text-xs font-semibold opacity-80">Offer valid till {profile.offer_expires_at.slice(0, 10)}</p> : null}
          </div>
          <div className="mt-4 rounded-[1.25rem] p-4 text-white" style={{ background: profile.theme_accent ?? "#2f8f88" }}>
            Campaign accent card for trust badges, CTA strips, and theme sections
          </div>
          <div className="mt-4 rounded-[1.25rem] border border-slate-200 bg-white p-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Subdomain</p>
            <p className="mt-2 text-lg font-black text-slate-950">{profile.subdomain}.librarypro.com</p>
            <p className="mt-2 text-sm text-slate-500">Students see this offer on marketplace and continue to your own website for login, QR, and daily actions.</p>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
