"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import { formatLibraryHost } from "../lib/domain";
import { resolvePublicAssetUrl } from "../lib/public-library";
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
    sitePages: SitePagesConfig;
    published: boolean;
  };
  requestedAction?: "save-draft" | "publish" | null;
  onActionHandled?: () => void;
};

type SaveResponse = {
  success: boolean;
  data: {
    id: string;
    subdomain: string;
    is_published: boolean;
  };
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

const pageOrder: { key: SitePageKey; label: string; path: string; source: string }[] = [
  { key: "home", label: "Home", path: "/", source: "Landing copy, offer, quick gallery" },
  { key: "features", label: "Features", path: "/features", source: "Facilities, student flow, feature cards" },
  { key: "gallery", label: "Gallery", path: "/gallery", source: "Photo tour headline and layout" },
  { key: "pricing", label: "Pricing", path: "/pricing", source: "Plan cards and offer explanation" },
  { key: "about", label: "About", path: "/about", source: "Library story and trust points" },
  { key: "contact", label: "Contact", path: "/contact", source: "Contact page intro and visit CTA" },
];

const defaultPageConfigs: Record<SitePageKey, SitePageConfig> = {
  home: {
    enabled: true,
    navLabel: "Home",
    title: "Why students choose us",
    subtitle: "A calmer study day, from seat to check-in.",
    body: "",
    layout: "split",
    items: [],
  },
  features: {
    enabled: true,
    navLabel: "Features",
    title: "Everything students expect from a serious study space.",
    subtitle: "Facilities, access, and daily student workflows are published from this page.",
    body: "",
    layout: "classic",
    items: [
      { title: "Silent study zone", detail: "Focused seating and a calm study environment." },
      { title: "Student access", detail: "Login, QR entry, dues, and notices from the same subdomain." },
    ],
  },
  gallery: {
    enabled: true,
    navLabel: "Gallery",
    title: "A full visual tour before students visit.",
    subtitle: "Show reception, desks, reading areas, and exterior photos.",
    body: "",
    layout: "spotlight",
    items: [],
  },
  pricing: {
    enabled: true,
    navLabel: "Pricing",
    title: "Starting plans and current offers",
    subtitle: "Students can understand the starting price before contacting the owner.",
    body: "",
    layout: "split",
    items: [
      { title: "Monthly seat", detail: "Owner confirms exact plan and availability during admission." },
      { title: "Included access", detail: "Student login, QR entry support, and notices." },
    ],
  },
  about: {
    enabled: true,
    navLabel: "About",
    title: "About the library",
    subtitle: "Tell students what makes this study space reliable.",
    body: "",
    layout: "classic",
    items: [],
  },
  contact: {
    enabled: true,
    navLabel: "Contact",
    title: "Talk to the library owner.",
    subtitle: "Students can call, WhatsApp, or visit after checking the address.",
    body: "",
    layout: "compact",
    items: [],
  },
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

function normalizeSitePages(input: SitePagesConfig = {}): SitePagesConfig {
  return pageOrder.reduce<SitePagesConfig>((acc, page) => {
    acc[page.key] = {
      ...defaultPageConfigs[page.key],
      ...(input[page.key] ?? {}),
      items: input[page.key]?.items?.length ? input[page.key]?.items ?? [] : defaultPageConfigs[page.key].items,
    };
    return acc;
  }, {});
}

function itemsToLines(items: SitePageConfig["items"]) {
  return items.map((item) => `${item.title} | ${item.detail}`).join("\n");
}

function linesToItems(value: string) {
  return value
    .split("\n")
    .map((line) => {
      const [title, ...detailParts] = line.split("|");
      return { title: title.trim(), detail: detailParts.join("|").trim() };
    })
    .filter((item) => item.title || item.detail);
}

export function PublicProfileForm({ initialValues, requestedAction = null, onActionHandled }: PublicProfileFormProps) {
  const [values, setValues] = useState({ ...initialValues, sitePages: normalizeSitePages(initialValues.sitePages) });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [subdomainState, setSubdomainState] = useState<"unknown" | "available" | "taken">("unknown");
  const [activeSection, setActiveSection] = useState<"identity" | "hero" | "pages" | "theme" | "contact" | "seo" | "gallery">("identity");
  const [activePage, setActivePage] = useState<SitePageKey>("home");

  const amenitiesInput = useMemo(() => values.amenities.join(", "), [values.amenities]);
  const galleryInput = useMemo(() => values.galleryImages.join(", "), [values.galleryImages]);
  const siteHost = values.subdomain ? formatLibraryHost(values.subdomain) : "";
  const normalizedPages = useMemo(() => normalizeSitePages(values.sitePages), [values.sitePages]);
  const currentPage = normalizedPages[activePage] ?? defaultPageConfigs[activePage];
  const enabledPageCount = pageOrder.filter((item) => normalizedPages[item.key]?.enabled !== false).length;
  const brandLogoPreviewUrl = resolvePublicAssetUrl(values.brandLogoUrl);
  const heroBannerPreviewUrl = resolvePublicAssetUrl(values.heroBannerUrl);
  const sections = [
    ["identity", "Identity"],
    ["hero", "Hero"],
    ["pages", "Pages"],
    ["theme", "Theme"],
    ["contact", "Contact"],
    ["seo", "SEO"],
    ["gallery", "Gallery"],
  ] as const;

  useEffect(() => {
    setValues({ ...initialValues, sitePages: normalizeSitePages(initialValues.sitePages) });
  }, [initialValues]);

  useEffect(() => {
    if (!requestedAction || saving) {
      return;
    }

    void saveProfile(requestedAction === "publish").finally(() => {
      onActionHandled?.();
    });
  }, [requestedAction]);

  function updateValue<Key extends keyof typeof values>(key: Key, value: (typeof values)[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function updatePageValue<Key extends keyof SitePageConfig>(key: SitePageKey, field: Key, value: SitePageConfig[Key]) {
    setValues((current) => ({
      ...current,
      sitePages: {
        ...normalizeSitePages(current.sitePages),
        [key]: {
          ...(normalizeSitePages(current.sitePages)[key] ?? defaultPageConfigs[key]),
          [field]: value,
        },
      },
    }));
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
          sitePages: normalizedPages,
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
    <div className="lp-density-surface grid gap-4">
      <div className="rounded-xl border border-[var(--lp-border)] bg-white px-4 py-4">
        <div className="flex flex-wrap gap-2">
          {sections.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveSection(key)}
              className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.18em] ${
                activeSection === key ? "border border-[var(--lp-accent-soft)] bg-[var(--lp-accent-soft)] text-[var(--lp-accent-strong)]" : "border border-slate-200 bg-white text-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="sticky top-4 z-10 grid gap-3 rounded-xl border border-[var(--lp-border)] bg-white/95 px-4 py-4 backdrop-blur">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Subdomain</p>
            <p className="mt-2 text-sm font-bold text-slate-950">{values.subdomain || "Pending"}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">State</p>
            <p className="mt-2 text-sm font-bold text-slate-950">{values.published ? "Published" : "Draft"}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Budget</p>
            <p className="mt-2 text-sm font-bold text-slate-950">Rs. {values.adBudget || "0"}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Pages</p>
            <p className="mt-2 text-sm font-bold text-slate-950">{enabledPageCount} active / {pageOrder.length} total</p>
          </div>
        </div>
        {statusMessage ? <p className="text-sm font-semibold text-emerald-700">{statusMessage}</p> : null}
        {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
        {siteHost ? (
          <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-3 lg:grid-cols-6">
            {pageOrder.map((item) => (
              <a
                key={item.key}
                href={`https://${siteHost}${item.path === "/" ? "" : item.path}`}
                target="_blank"
                rel="noreferrer"
                className={`rounded-lg border px-3 py-2 text-xs font-black transition ${
                  normalizedPages[item.key]?.enabled === false
                    ? "border-slate-200 bg-slate-100 text-slate-400"
                    : "border-slate-200 bg-white text-slate-700 hover:border-[var(--lp-accent)] hover:text-[var(--lp-accent-strong)]"
                }`}
              >
                {normalizedPages[item.key]?.navLabel || item.label}
              </a>
            ))}
          </div>
        ) : null}
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
            className="rounded-full border border-[var(--lp-accent-soft)] bg-[var(--lp-accent-soft)] px-5 py-3 text-sm font-bold text-[var(--lp-accent-strong)] disabled:opacity-60"
          >
            {saving ? "Publishing..." : "Publish Website"}
          </button>
        </div>
      </div>

      {activeSection === "identity" ? (
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-2xl border border-[var(--lp-border)] bg-[rgba(255,249,241,0.92)] p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">Subdomain and publishing</h2>
            <p className="mt-1 text-sm text-slate-500">Premium plan libraries get this shareable public web address</p>
            <div className="mt-6 grid gap-4">
              <div className="rounded-xl bg-slate-50 p-5">
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
                    className="rounded-2xl border border-[var(--lp-accent-soft)] bg-[var(--lp-accent-soft)] px-4 py-4 text-sm font-bold text-[var(--lp-accent-strong)] disabled:opacity-60"
                  >
                    {checking ? "Checking..." : "Check"}
                  </button>
                </div>
                <p className="mt-3 text-sm text-slate-500">
                  Final URL: <span className="font-black text-slate-950">{formatLibraryHost(values.subdomain)}</span>
                </p>
                <p className="mt-2 text-sm text-slate-500">Student login, QR entry, notices, and day-to-day student actions can run from this same subdomain.</p>
                {subdomainState !== "unknown" ? (
                  <p className={`mt-2 text-sm font-semibold ${subdomainState === "available" ? "text-emerald-700" : "text-rose-600"}`}>
                    {subdomainState === "available" ? "Available" : "Taken"}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-emerald-50 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-700">Status</p>
                  <p className="mt-3 text-2xl font-black text-slate-950">{values.published ? "Published" : "Draft"}</p>
                </div>
                <div className="rounded-xl bg-orange-50 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-700">Ad budget</p>
                  <input
                    value={values.adBudget}
                    onChange={(event) => updateValue("adBudget", event.target.value)}
                    inputMode="numeric"
                    className="mt-3 w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 font-bold text-slate-950 outline-none"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--lp-border)] bg-[rgba(255,249,241,0.92)] p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">Brand assets</h2>
            <p className="mt-1 text-sm text-slate-500">Manage logo and banner assets from one calm media panel.</p>
            <div className="mt-6 grid gap-4">
              <div className="rounded-xl bg-[#fff7ef] p-5">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[var(--lp-primary)]">Brand logo</p>
                {brandLogoPreviewUrl ? (
                  <div className="mt-3 flex items-center gap-4 rounded-2xl border border-[var(--lp-border)] bg-white p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={brandLogoPreviewUrl} alt="Brand logo preview" className="h-16 w-16 rounded-2xl object-cover ring-1 ring-slate-200" />
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-950">Logo ready</p>
                      <p className="truncate text-xs font-semibold text-slate-500">{values.brandLogoUrl}</p>
                    </div>
                  </div>
                ) : null}
                <input
                  value={values.brandLogoUrl}
                  onChange={(event) => updateValue("brandLogoUrl", event.target.value)}
                  className="mt-3 w-full rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3 font-medium text-slate-950 outline-none"
                  placeholder="Logo image URL"
                />
                <div className="mt-3">
                  <PublicProfileImageUpload
                    label="Upload logo"
                    helperText="Square logo works best"
                    onUploaded={(url) => updateValue("brandLogoUrl", url)}
                  />
                </div>
              </div>
              <div className="rounded-xl bg-[#eef7f5] p-5">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[var(--lp-accent)]">Hero banner</p>
                {heroBannerPreviewUrl ? (
                  <div className="mt-3 overflow-hidden rounded-2xl border border-[var(--lp-border)] bg-white p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={heroBannerPreviewUrl} alt="Hero banner preview" className="aspect-[16/7] w-full rounded-xl object-cover" />
                  </div>
                ) : null}
                <input
                  value={values.heroBannerUrl}
                  onChange={(event) => updateValue("heroBannerUrl", event.target.value)}
                  className="mt-3 w-full rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3 font-medium text-slate-950 outline-none"
                  placeholder="Banner image URL"
                />
                <div className="mt-3">
                  <PublicProfileImageUpload
                    label="Upload hero banner"
                    helperText="Wide image, 1600 x 900 recommended"
                    onUploaded={(url) => updateValue("heroBannerUrl", url)}
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {activeSection === "hero" ? (
        <section className="rounded-2xl border border-[var(--lp-border)] bg-[rgba(255,249,241,0.92)] p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">Hero and brand content</h2>
          <p className="mt-1 text-sm text-slate-500">What students see first</p>
          <div className="mt-6 grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Hero image</p>
              <div className="mt-3 overflow-hidden rounded-xl bg-slate-100">
                {heroBannerPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={heroBannerPreviewUrl} alt="Hero banner preview" className="aspect-[16/10] w-full object-cover" />
                ) : (
                  <div className="grid aspect-[16/10] place-items-center px-4 text-center text-sm font-semibold text-slate-500">
                    Upload a wide banner to make the public site look premium.
                  </div>
                )}
              </div>
              <div className="mt-3">
                <PublicProfileImageUpload
                  label="Change hero image"
                  helperText="This is the main landing page background"
                  onUploaded={(url) => updateValue("heroBannerUrl", url)}
                />
              </div>
            </div>
            <div className="grid gap-4">
              <input value={values.heroTitle} onChange={(event) => updateValue("heroTitle", event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none" />
              <textarea value={values.heroTagline} onChange={(event) => updateValue("heroTagline", event.target.value)} className="min-h-28 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none" />
              <textarea value={values.aboutText} onChange={(event) => updateValue("aboutText", event.target.value)} className="min-h-40 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none" />
            </div>
          </div>
        </section>
      ) : null}

      {activeSection === "pages" ? (
        <section className="rounded-2xl border border-[var(--lp-border)] bg-[rgba(255,249,241,0.92)] p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-950">Public website pages</h2>
              <p className="mt-1 text-sm text-slate-500">Set each page copy, nav label, cards, and layout before publishing to the subdomain.</p>
            </div>
            <div className="rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              Editing {currentPage.navLabel || pageOrder.find((item) => item.key === activePage)?.label}
            </div>
          </div>

          <div className="mt-6 grid gap-5 xl:grid-cols-[280px_1fr]">
            <div className="grid gap-2 self-start rounded-xl border border-slate-200 bg-white p-3">
              {pageOrder.map((item) => {
                const pageConfig = normalizedPages[item.key] ?? defaultPageConfigs[item.key];
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActivePage(item.key)}
                    className={`rounded-xl border px-3 py-3 text-left transition ${
                      activePage === item.key ? "border-[var(--lp-accent)] bg-[var(--lp-accent-soft)]" : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-sm font-black text-slate-950">{pageConfig.navLabel || item.label}</span>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${pageConfig.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {pageConfig.enabled ? "On" : "Off"}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">{item.source}</span>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-[1fr_170px_150px]">
                <label className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Navigation label</span>
                  <input
                    value={currentPage.navLabel}
                    onChange={(event) => updatePageValue(activePage, "navLabel", event.target.value)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-950 outline-none"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Layout</span>
                  <select
                    value={currentPage.layout}
                    onChange={(event) => updatePageValue(activePage, "layout", event.target.value as SitePageConfig["layout"])}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-950 outline-none"
                  >
                    <option value="classic">Classic</option>
                    <option value="split">Split</option>
                    <option value="spotlight">Spotlight</option>
                    <option value="compact">Compact</option>
                  </select>
                </label>
                <label className="flex items-end gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <input
                    type="checkbox"
                    checked={currentPage.enabled}
                    onChange={(event) => updatePageValue(activePage, "enabled", event.target.checked)}
                    className="h-5 w-5 rounded border-slate-300"
                  />
                  <span className="text-sm font-black text-slate-800">Show page</span>
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Page heading</span>
                <input
                  value={currentPage.title}
                  onChange={(event) => updatePageValue(activePage, "title", event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-lg font-black text-slate-950 outline-none"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Subtitle</span>
                <textarea
                  value={currentPage.subtitle}
                  onChange={(event) => updatePageValue(activePage, "subtitle", event.target.value)}
                  className="min-h-24 rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Main body</span>
                <textarea
                  value={currentPage.body}
                  onChange={(event) => updatePageValue(activePage, "body", event.target.value)}
                  className="min-h-32 rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none"
                  placeholder="Optional longer copy for this page."
                />
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Cards / bullets</span>
                <textarea
                  value={itemsToLines(currentPage.items)}
                  onChange={(event) => updatePageValue(activePage, "items", linesToItems(event.target.value))}
                  className="min-h-32 rounded-2xl border border-slate-200 bg-white px-4 py-4 font-mono text-sm outline-none"
                  placeholder="Title | Detail, one item per line"
                />
              </label>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Live page preview</p>
                <div className={`mt-4 grid gap-4 ${currentPage.layout === "split" ? "md:grid-cols-[1fr_0.8fr]" : ""}`}>
                  <div className={currentPage.layout === "spotlight" ? "rounded-xl bg-slate-950 p-5 text-white" : "rounded-xl bg-slate-50 p-5"}>
                    <h3 className="text-xl font-black">{currentPage.title || "Page heading"}</h3>
                    <p className={`mt-2 text-sm leading-6 ${currentPage.layout === "spotlight" ? "text-white/70" : "text-slate-600"}`}>
                      {currentPage.subtitle || "Subtitle preview appears here."}
                    </p>
                    {currentPage.body ? <p className={`mt-3 text-sm leading-6 ${currentPage.layout === "spotlight" ? "text-white/70" : "text-slate-600"}`}>{currentPage.body}</p> : null}
                  </div>
                  {currentPage.items.length ? (
                    <div className={`grid gap-3 ${currentPage.layout === "compact" ? "sm:grid-cols-2" : ""}`}>
                      {currentPage.items.slice(0, 4).map((item, index) => (
                        <div key={`${item.title}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-sm font-black text-slate-950">{item.title || `Item ${index + 1}`}</p>
                          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{item.detail}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {activeSection === "theme" ? (
        <section className="rounded-2xl border border-[var(--lp-border)] bg-[rgba(255,249,241,0.92)] p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">Theme builder</h2>
          <div className="mt-6 grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
            <div className="grid gap-4">
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
            </div>
            <div className="rounded-xl border border-slate-200 p-4" style={{ background: values.themeSurface }}>
              <div className="rounded-xl px-4 py-4 text-white" style={{ background: values.themePrimary }}>
                <p className="text-sm font-black">Live theme preview</p>
                <p className="mt-1 text-sm opacity-90">{values.highlightOffer || values.heroTitle || "Your campaign card and hero CTA will use this tone."}</p>
              </div>
              <div className="mt-3 rounded-xl px-4 py-3 text-sm font-semibold text-white" style={{ background: values.themeAccent }}>
                Accent chip for offer banners, pricing tags, and action pills
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {activeSection === "contact" ? (
        <section className="rounded-2xl border border-[var(--lp-border)] bg-[rgba(255,249,241,0.92)] p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">Contact details</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <input value={values.contactName} onChange={(event) => updateValue("contactName", event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none" />
            <input value={values.contactPhone} onChange={(event) => updateValue("contactPhone", event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none" />
            <input value={values.whatsappPhone} onChange={(event) => updateValue("whatsappPhone", event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none" />
            <input value={values.businessHours} onChange={(event) => updateValue("businessHours", event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none" />
          </div>
        </section>
      ) : null}

      {activeSection === "seo" ? (
        <section className="rounded-2xl border border-[var(--lp-border)] bg-[rgba(255,249,241,0.92)] p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">Location and SEO</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <input value={values.addressText} onChange={(event) => updateValue("addressText", event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none" />
            <input value={values.landmark} onChange={(event) => updateValue("landmark", event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none" />
            <input value={values.highlightOffer} onChange={(event) => updateValue("highlightOffer", event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none" />
            <input type="date" value={values.offerExpiresAt} onChange={(event) => updateValue("offerExpiresAt", event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none" />
            <input value={values.seoTitle} onChange={(event) => updateValue("seoTitle", event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none md:col-span-2" />
            <textarea value={values.seoDescription} onChange={(event) => updateValue("seoDescription", event.target.value)} className="min-h-28 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none md:col-span-2" />
          </div>
        </section>
      ) : null}

      {activeSection === "gallery" ? (
        <section className="rounded-2xl border border-[var(--lp-border)] bg-[rgba(255,249,241,0.92)] p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">Amenities and gallery</h2>
          <div className="mt-6 grid gap-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {pageOrder.map((item) => (
                <div key={item.key} className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-black text-slate-950">{normalizedPages[item.key]?.navLabel || item.label}</p>
                  <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{item.source}</p>
                  <p className="mt-3 truncate text-xs font-bold text-[var(--lp-accent-strong)]">{siteHost ? `${siteHost}${item.path === "/" ? "" : item.path}` : "Add subdomain first"}</p>
                </div>
              ))}
            </div>
            <textarea
              value={amenitiesInput}
              onChange={(event) => updateValue("amenities", event.target.value.split(",").map((item) => item.trim()).filter(Boolean))}
              className="min-h-24 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none"
              placeholder="Amenities for Features/About pages, comma separated"
            />
            <textarea
              value={galleryInput}
              onChange={(event) => updateValue("galleryImages", event.target.value.split(",").map((item) => item.trim()).filter(Boolean))}
              className="min-h-24 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none"
              placeholder="Gallery image URLs for Gallery/Home/Contact pages, comma separated"
            />
            <PublicProfileImageUpload
              label="Upload gallery photo"
              helperText="Add reception, desks, study hall, or exterior photos"
              onUploaded={(url) => updateValue("galleryImages", [...values.galleryImages, url])}
            />
            {values.galleryImages.length ? (
              <div className="grid gap-3">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Live gallery preview</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {values.galleryImages.map((url, index) => (
                    <div key={`${url}-${index}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                      <div className="aspect-[4/3] bg-slate-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={resolvePublicAssetUrl(url) ?? url} alt={`Gallery ${index + 1}`} className="h-full w-full object-cover" />
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
      ) : null}
    </div>
  );
}
