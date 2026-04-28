"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { defaultMarketplaceSettings, type MarketplaceBannerSlide, type PlatformMarketplaceSettings } from "../lib/marketplace-settings";
import { DashboardCard } from "./dashboard-shell";

const toneOptions: MarketplaceBannerSlide["tone"][] = ["slate", "emerald", "amber", "blue"];

function emptySlide(index: number): MarketplaceBannerSlide {
  return {
    eyebrow: `Slide ${index + 1}`,
    title: "",
    cta: "Open",
    href: "#marketplace-search",
    tone: "slate",
  };
}

export function SuperadminMarketplaceManager() {
  const [settings, setSettings] = useState<PlatformMarketplaceSettings>(defaultMarketplaceSettings);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await apiFetch<{ success: boolean; data: PlatformMarketplaceSettings }>("/admin/marketplace-settings");
        setSettings({
          ...response.data,
          bannerSlides: response.data.bannerSlides.length > 0 ? response.data.bannerSlides : defaultMarketplaceSettings.bannerSlides,
        });
        setError(null);
      } catch (loadError) {
        setSettings(defaultMarketplaceSettings);
        setError(loadError instanceof Error ? loadError.message : "Unable to load marketplace settings.");
      }
    }

    void loadSettings();
  }, []);

  function updateSlide(index: number, patch: Partial<MarketplaceBannerSlide>) {
    setSettings((current) => ({
      ...current,
      bannerSlides: current.bannerSlides.map((slide, slideIndex) => (
        slideIndex === index ? { ...slide, ...patch } : slide
      )),
    }));
  }

  function addSlide() {
    setSettings((current) => ({
      ...current,
      bannerSlides: [...current.bannerSlides, emptySlide(current.bannerSlides.length)].slice(0, 4),
    }));
  }

  function removeSlide(index: number) {
    setSettings((current) => ({
      ...current,
      bannerSlides: current.bannerSlides.filter((_, slideIndex) => slideIndex !== index),
    }));
  }

  async function saveSettings() {
    setSaving(true);
    setStatus(null);
    setError(null);
    try {
      const response = await apiFetch<{ success: boolean; data: PlatformMarketplaceSettings }>("/admin/marketplace-settings", {
        method: "PATCH",
        body: JSON.stringify(settings),
      });
      setSettings(response.data);
      setStatus("Marketplace banner saved. Public marketplace will use this content now.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save marketplace settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_0.86fr]">
      <DashboardCard title="Marketplace banner" subtitle="Controls the public marketplace headline and the compact auto-sliding banner. Keep each slide short.">
        <div className="grid gap-3">
          <label className="grid gap-1 text-sm font-semibold text-[var(--lp-text)]">
            Headline
            <input
              value={settings.headline}
              onChange={(event) => setSettings((current) => ({ ...current, headline: event.target.value }))}
              className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--lp-accent)]"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-[var(--lp-text)]">
            Subheadline
            <textarea
              value={settings.subheadline}
              onChange={(event) => setSettings((current) => ({ ...current, subheadline: event.target.value }))}
              className="min-h-20 rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--lp-accent)]"
            />
          </label>

          <div className="grid gap-3">
            {settings.bannerSlides.map((slide, index) => (
              <div key={`${slide.eyebrow}-${index}`} className="rounded-lg border border-[var(--lp-border)] bg-[var(--lp-surface-muted)] p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--lp-muted)]">Slide {index + 1}</p>
                  <button
                    type="button"
                    onClick={() => removeSlide(index)}
                    disabled={settings.bannerSlides.length === 1}
                    className="rounded-md border border-[var(--lp-border)] bg-white px-2 py-1 text-xs font-semibold text-[var(--lp-text)] disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <input value={slide.eyebrow} onChange={(event) => updateSlide(index, { eyebrow: event.target.value })} className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm outline-none" placeholder="Eyebrow" />
                  <select value={slide.tone} onChange={(event) => updateSlide(index, { tone: event.target.value as MarketplaceBannerSlide["tone"] })} className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm outline-none">
                    {toneOptions.map((tone) => <option key={tone} value={tone}>{tone}</option>)}
                  </select>
                  <input value={slide.cta} onChange={(event) => updateSlide(index, { cta: event.target.value })} className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm outline-none" placeholder="CTA label" />
                  <input value={slide.href} onChange={(event) => updateSlide(index, { href: event.target.value })} className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm outline-none" placeholder="/owner/register or #marketplace-search" />
                </div>
                <textarea value={slide.title} onChange={(event) => updateSlide(index, { title: event.target.value })} className="mt-2 min-h-16 w-full rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm outline-none" placeholder="Short slide title" />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={addSlide} disabled={settings.bannerSlides.length >= 4} className="lp-button disabled:opacity-40">
              Add slide
            </button>
            <button type="button" onClick={() => void saveSettings()} disabled={saving} className="lp-button lp-button-primary disabled:opacity-50">
              {saving ? "Saving..." : "Save marketplace"}
            </button>
          </div>
          {status ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{status}</p> : null}
          {error ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">{error}</p> : null}
        </div>
      </DashboardCard>

      <DashboardCard title="Live preview" subtitle="This is the same compact style used on the public marketplace page.">
        <div className="rounded-lg border border-slate-200 bg-[#0F172A] p-4 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Marketplace</p>
          <h2 className="mt-2 text-2xl font-black leading-tight tracking-[-0.04em]">{settings.headline}</h2>
          <p className="mt-2 text-sm leading-6 text-white/72">{settings.subheadline}</p>
        </div>
        <div className="mt-3 grid gap-3">
          {settings.bannerSlides.map((slide, index) => (
            <div key={`${slide.title}-${index}`} className="rounded-lg border border-[var(--lp-border)] bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--lp-accent)]">{slide.eyebrow}</p>
              <p className="mt-1 text-sm font-bold text-[var(--lp-text)]">{slide.title || "Slide title"}</p>
              <p className="mt-2 text-xs text-[var(--lp-muted)]">{slide.cta} {"->"} {slide.href}</p>
            </div>
          ))}
        </div>
      </DashboardCard>
    </div>
  );
}
