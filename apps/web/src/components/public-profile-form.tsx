"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import { PublicProfileImageUpload } from "./public-profile-image-upload";

type PublicProfileFormProps = {
  initialValues: {
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
};

type SaveResponse = {
  success: boolean;
  data: {
    id: string;
    subdomain: string;
    is_published: boolean;
  };
};

function moveImage(images: string[], index: number, direction: -1 | 1) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= images.length) {
    return images;
  }

  const next = [...images];
  const [item] = next.splice(index, 1);
  next.splice(nextIndex, 0, item);
  return next;
}

export function PublicProfileForm({ initialValues }: PublicProfileFormProps) {
  const [values, setValues] = useState(initialValues);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [subdomainState, setSubdomainState] = useState<"unknown" | "available" | "taken">("unknown");

  const amenitiesInput = useMemo(() => values.amenities.join(", "), [values.amenities]);
  const galleryInput = useMemo(() => values.galleryImages.join(", "), [values.galleryImages]);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  function updateValue<Key extends keyof typeof values>(key: Key, value: (typeof values)[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function parseBudget(value: string) {
    const normalized = value.replace(/[^\d.]/g, "");
    return normalized ? Number(normalized) : 0;
  }

  async function checkAvailability() {
    setChecking(true);
    setError(null);
    setStatusMessage(null);
    try {
      const result = await apiFetch<{ success: boolean; data: { available: boolean } }>(
        `/public/subdomain-availability?subdomain=${encodeURIComponent(values.subdomain)}`,
        undefined,
        false,
      );
      setSubdomainState(result.data.available ? "available" : "taken");
      setStatusMessage(result.data.available ? "Subdomain is available." : "Subdomain is already taken.");
    } catch (availabilityError) {
      setError(availabilityError instanceof Error ? availabilityError.message : "Failed to check subdomain.");
    } finally {
      setChecking(false);
    }
  }

  async function saveProfile(isPublished: boolean) {
    setSaving(true);
    setError(null);
    setStatusMessage(null);

    try {
      await apiFetch<SaveResponse>("/owner/public-profile", {
        method: "POST",
        body: JSON.stringify({
          subdomain: values.subdomain,
          brandLogoUrl: values.brandLogoUrl,
          heroBannerUrl: values.heroBannerUrl,
          heroTitle: values.heroTitle,
          heroTagline: values.heroTagline,
          aboutText: values.aboutText,
          contactName: values.contactName,
          contactPhone: values.contactPhone,
          whatsappPhone: values.whatsappPhone,
          email: "",
          addressText: values.addressText,
          latitude: null,
          longitude: null,
          landmark: values.landmark,
          businessHours: values.businessHours,
          amenities: amenitiesInput.split(",").map((item) => item.trim()).filter(Boolean),
          galleryImages: galleryInput.split(",").map((item) => item.trim()).filter(Boolean),
          seoTitle: values.seoTitle,
          seoDescription: values.seoDescription,
          metaKeywords: "",
          showInMarketplace: true,
          allowDirectContact: true,
          adBudget: parseBudget(values.adBudget),
          highlightOffer: values.highlightOffer,
          offerExpiresAt: values.offerExpiresAt,
          themePrimary: values.themePrimary,
          themeAccent: values.themeAccent,
          themeSurface: values.themeSurface,
        }),
      });

      await apiFetch<SaveResponse>("/owner/public-profile/publish", {
        method: "PATCH",
        body: JSON.stringify({ isPublished }),
      });

      setStatusMessage(isPublished ? "Public website published successfully." : "Draft saved successfully.");
      updateValue("published", isPublished);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[2rem] border border-[var(--lp-border)] bg-[rgba(255,249,241,0.92)] p-6 shadow-[0_24px_70px_rgba(111,95,74,0.10)]">
          <h2 className="text-2xl font-black text-slate-950">Subdomain and publishing</h2>
          <p className="mt-1 text-sm text-slate-500">Premium plan libraries get this shareable public web address</p>
          <div className="mt-6 grid gap-4">
            <div className="rounded-[1.5rem] bg-slate-50 p-5">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Chosen subdomain</p>
              <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
                <input
                  value={values.subdomain}
                  onChange={(event) => updateValue("subdomain", event.target.value.toLowerCase())}
                  className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base font-bold text-slate-950 outline-none"
                />
                <button
                  type="button"
                  onClick={checkAvailability}
                  disabled={checking}
                  className="rounded-2xl bg-slate-950 px-4 py-4 text-sm font-bold text-white disabled:opacity-60"
                >
                  {checking ? "Checking..." : "Check"}
                </button>
              </div>
              <p className="mt-3 text-sm text-slate-500">
                Final URL: <span className="font-black text-slate-950">{values.subdomain}.nextlib.in</span>
              </p>
              <p className="mt-2 text-sm text-slate-500">Student login, QR entry, notices, and day-to-day student actions can run from this same subdomain.</p>
              {subdomainState !== "unknown" ? (
                <p className={`mt-2 text-sm font-semibold ${subdomainState === "available" ? "text-emerald-700" : "text-rose-600"}`}>
                  {subdomainState === "available" ? "Available" : "Taken"}
                </p>
              ) : null}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] bg-emerald-50 p-5">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-700">Status</p>
                <p className="mt-3 text-2xl font-black text-slate-950">{values.published ? "Published" : "Draft"}</p>
              </div>
              <div className="rounded-[1.5rem] bg-orange-50 p-5">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-700">Ad budget</p>
                <input
                  value={values.adBudget}
                  onChange={(event) => updateValue("adBudget", event.target.value)}
                  inputMode="numeric"
                  className="mt-3 w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 font-bold text-slate-950 outline-none"
                />
              </div>
            </div>
            <div className="rounded-[1.5rem] bg-[#fff7ef] p-5">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-[var(--lp-primary)]">Brand logo</p>
              <input
                value={values.brandLogoUrl}
                onChange={(event) => updateValue("brandLogoUrl", event.target.value)}
                className="mt-3 w-full rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3 font-medium text-slate-950 outline-none"
                placeholder="Logo image URL"
              />
              <div className="mt-3">
                <PublicProfileImageUpload onUploaded={(url) => updateValue("brandLogoUrl", url)} />
              </div>
            </div>
            <div className="rounded-[1.5rem] bg-[#eef7f5] p-5">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-[var(--lp-accent)]">Hero banner</p>
              <input
                value={values.heroBannerUrl}
                onChange={(event) => updateValue("heroBannerUrl", event.target.value)}
                className="mt-3 w-full rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3 font-medium text-slate-950 outline-none"
                placeholder="Banner image URL"
              />
              <div className="mt-3">
                <PublicProfileImageUpload onUploaded={(url) => updateValue("heroBannerUrl", url)} />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-[var(--lp-border)] bg-[rgba(255,249,241,0.92)] p-6 shadow-[0_24px_70px_rgba(111,95,74,0.10)]">
          <h2 className="text-2xl font-black text-slate-950">Hero and brand content</h2>
          <p className="mt-1 text-sm text-slate-500">What students see first</p>
          <div className="mt-6 grid gap-4">
            <input value={values.heroTitle} onChange={(event) => updateValue("heroTitle", event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none" />
            <textarea value={values.heroTagline} onChange={(event) => updateValue("heroTagline", event.target.value)} className="min-h-28 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none" />
            <textarea value={values.aboutText} onChange={(event) => updateValue("aboutText", event.target.value)} className="min-h-40 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none" />
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-4">
        <section className="rounded-[2rem] border border-[var(--lp-border)] bg-[rgba(255,249,241,0.92)] p-6 shadow-[0_24px_70px_rgba(111,95,74,0.10)]">
          <h2 className="text-2xl font-black text-slate-950">Theme builder</h2>
          <div className="mt-6 grid gap-4">
            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Primary</span>
              <input type="color" value={values.themePrimary} onChange={(event) => updateValue("themePrimary", event.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-2 py-2" />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Accent</span>
              <input type="color" value={values.themeAccent} onChange={(event) => updateValue("themeAccent", event.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-2 py-2" />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Surface</span>
              <input type="color" value={values.themeSurface} onChange={(event) => updateValue("themeSurface", event.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-2 py-2" />
            </label>
            <div className="rounded-[1.5rem] border border-slate-200 p-4" style={{ background: values.themeSurface }}>
              <div className="rounded-[1.25rem] px-4 py-4 text-white" style={{ background: values.themePrimary }}>
                <p className="text-sm font-black">Live theme preview</p>
                <p className="mt-1 text-sm opacity-90">{values.highlightOffer || values.heroTitle || "Your campaign card and hero CTA will use this tone."}</p>
              </div>
              <div className="mt-3 rounded-[1rem] px-4 py-3 text-sm font-semibold text-white" style={{ background: values.themeAccent }}>
                Accent chip for offer banners, pricing tags, and action pills
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-[var(--lp-border)] bg-[rgba(255,249,241,0.92)] p-6 shadow-[0_24px_70px_rgba(111,95,74,0.10)]">
          <h2 className="text-2xl font-black text-slate-950">Contact details</h2>
          <div className="mt-6 grid gap-4">
            <input value={values.contactName} onChange={(event) => updateValue("contactName", event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none" />
            <input value={values.contactPhone} onChange={(event) => updateValue("contactPhone", event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none" />
            <input value={values.whatsappPhone} onChange={(event) => updateValue("whatsappPhone", event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none" />
            <input value={values.businessHours} onChange={(event) => updateValue("businessHours", event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none" />
          </div>
        </section>

        <section className="rounded-[2rem] border border-[var(--lp-border)] bg-[rgba(255,249,241,0.92)] p-6 shadow-[0_24px_70px_rgba(111,95,74,0.10)]">
          <h2 className="text-2xl font-black text-slate-950">Location and SEO</h2>
          <div className="mt-6 grid gap-4">
            <input value={values.addressText} onChange={(event) => updateValue("addressText", event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none" />
            <input value={values.landmark} onChange={(event) => updateValue("landmark", event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none" />
            <input value={values.highlightOffer} onChange={(event) => updateValue("highlightOffer", event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none" />
            <input type="date" value={values.offerExpiresAt} onChange={(event) => updateValue("offerExpiresAt", event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none" />
            <input value={values.seoTitle} onChange={(event) => updateValue("seoTitle", event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none" />
            <textarea value={values.seoDescription} onChange={(event) => updateValue("seoDescription", event.target.value)} className="min-h-28 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none" />
          </div>
        </section>

        <section className="rounded-[2rem] border border-[var(--lp-border)] bg-[rgba(255,249,241,0.92)] p-6 shadow-[0_24px_70px_rgba(111,95,74,0.10)]">
          <h2 className="text-2xl font-black text-slate-950">Amenities and gallery</h2>
          <div className="mt-6 grid gap-4">
            <textarea
              value={amenitiesInput}
              onChange={(event) => updateValue("amenities", event.target.value.split(",").map((item) => item.trim()).filter(Boolean))}
              className="min-h-24 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none"
            />
            <textarea
              value={galleryInput}
              onChange={(event) => updateValue("galleryImages", event.target.value.split(",").map((item) => item.trim()).filter(Boolean))}
              className="min-h-24 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none"
            />
            <PublicProfileImageUpload onUploaded={(url) => updateValue("galleryImages", [...values.galleryImages, url])} />
            {values.galleryImages.length ? (
              <div className="grid gap-3">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Live gallery preview</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {values.galleryImages.map((url, index) => (
                    <div key={`${url}-${index}`} className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white">
                      <div className="aspect-[4/3] bg-slate-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Gallery ${index + 1}`} className="h-full w-full object-cover" />
                      </div>
                      <div className="grid gap-3 p-4">
                        <p className="truncate text-sm font-semibold text-slate-600">{url}</p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => updateValue("galleryImages", moveImage(values.galleryImages, index, -1))}
                            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
                          >
                            Move left
                          </button>
                          <button
                            type="button"
                            onClick={() => updateValue("galleryImages", moveImage(values.galleryImages, index, 1))}
                            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
                          >
                            Move right
                          </button>
                          <button
                            type="button"
                            onClick={() => updateValue("galleryImages", values.galleryImages.filter((_, imageIndex) => imageIndex !== index))}
                            className="rounded-full bg-rose-100 px-3 py-2 text-xs font-bold text-rose-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      {statusMessage ? <p className="text-sm font-semibold text-emerald-700">{statusMessage}</p> : null}
      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => saveProfile(false)}
          disabled={saving}
          className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Draft"}
        </button>
        <button
          type="button"
          onClick={() => saveProfile(true)}
          disabled={saving}
          className="rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {saving ? "Publishing..." : "Publish Website"}
        </button>
      </div>
    </div>
  );
}
