"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, hydrateSessionFromServer } from "../lib/api";
import { resolvePublicAssetUrl } from "../lib/public-library";
import { DashboardCard } from "./dashboard-shell";
import { FormDrawer } from "./form-drawer";
import { PublicProfileImageUpload } from "./public-profile-image-upload";

type ListingProfile = {
  library_slug?: string;
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
  amenities: string[] | null;
  gallery_images: string[] | null;
  seo_title: string | null;
  seo_description: string | null;
  highlight_offer: string | null;
  offer_expires_at: string | null;
  allow_direct_contact: boolean;
  listing_published?: boolean;
};

type ListingForm = {
  brandLogoUrl: string;
  heroBannerUrl: string;
  heroTitle: string;
  heroTagline: string;
  aboutText: string;
  contactName: string;
  contactPhone: string;
  whatsappPhone: string;
  email: string;
  addressText: string;
  landmark: string;
  businessHours: string;
  amenities: string[];
  galleryImages: string[];
  seoTitle: string;
  seoDescription: string;
  highlightOffer: string;
  offerExpiresAt: string;
  allowDirectContact: boolean;
  listingPublished: boolean;
};

type OwnerPublicProfileResponse = {
  success: boolean;
  data: ListingProfile | null;
};

type StudentPlanConfig = {
  id: string;
  name: string;
  duration_months: number;
  base_amount: string;
  is_active: boolean;
};

const defaultAmenities = ["Silent zone", "AC reading hall", "WiFi", "Power backup"];

function buildDefaults(input: { libraryName?: string; address?: string; city?: string; area?: string | null }): ListingForm {
  const location = [input.area, input.city].filter(Boolean).join(", ");
  return {
    brandLogoUrl: "",
    heroBannerUrl: "",
    heroTitle: `${input.libraryName || "Library"} study space for focused students`,
    heroTagline: location ? `Located in ${location} with seats, plans, and direct owner contact.` : "Show seats, plans, facilities, and direct owner contact.",
    aboutText: "",
    contactName: input.libraryName || "",
    contactPhone: "",
    whatsappPhone: "",
    email: "",
    addressText: input.address || "",
    landmark: "",
    businessHours: "Mon-Sun, 7 AM to 10 PM",
    amenities: defaultAmenities,
    galleryImages: [],
    seoTitle: "",
    seoDescription: "",
    highlightOffer: "",
    offerExpiresAt: "",
    allowDirectContact: true,
    listingPublished: true,
  };
}

function mapProfile(profile: ListingProfile, fallback: ListingForm): ListingForm {
  return {
    brandLogoUrl: profile.brand_logo_url ?? "",
    heroBannerUrl: profile.hero_banner_url ?? "",
    heroTitle: profile.hero_title || fallback.heroTitle,
    heroTagline: profile.hero_tagline ?? fallback.heroTagline,
    aboutText: profile.about_text ?? "",
    contactName: profile.contact_name ?? fallback.contactName,
    contactPhone: profile.contact_phone ?? "",
    whatsappPhone: profile.whatsapp_phone ?? "",
    email: profile.email ?? "",
    addressText: profile.address_text || fallback.addressText,
    landmark: profile.landmark ?? "",
    businessHours: profile.business_hours ?? fallback.businessHours,
    amenities: profile.amenities?.length ? profile.amenities : fallback.amenities,
    galleryImages: profile.gallery_images ?? [],
    seoTitle: profile.seo_title ?? "",
    seoDescription: profile.seo_description ?? "",
    highlightOffer: profile.highlight_offer ?? "",
    offerExpiresAt: profile.offer_expires_at?.slice(0, 10) ?? "",
    allowDirectContact: profile.allow_direct_contact ?? true,
    listingPublished: profile.listing_published ?? false,
  };
}

function moveImage(images: string[], index: number, direction: -1 | 1) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= images.length) return images;
  const next = [...images];
  const [item] = next.splice(index, 1);
  next.splice(nextIndex, 0, item);
  return next;
}

export function OwnerMarketplaceListingManager({
  libraryName,
  address,
  city,
  area,
}: {
  libraryName?: string;
  address?: string;
  city?: string;
  area?: string | null;
}) {
  const defaults = useMemo(() => buildDefaults({ libraryName, address, city, area }), [libraryName, address, city, area]);
  const [form, setForm] = useState<ListingForm>(defaults);
  const [slug, setSlug] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [plans, setPlans] = useState<StudentPlanConfig[]>([]);
  const amenitiesInput = form.amenities.join(", ");
  const logoPreview = resolvePublicAssetUrl(form.brandLogoUrl);
  const heroPreview = resolvePublicAssetUrl(form.heroBannerUrl);
  const listingPath = slug ? `/libraries/${slug}` : "/marketplace";
  const activePlans = plans.filter((plan) => plan.is_active);
  const startingPlan = activePlans.reduce<StudentPlanConfig | null>((lowest, plan) => {
    if (!lowest) return plan;
    return Number(plan.base_amount || "0") < Number(lowest.base_amount || "0") ? plan : lowest;
  }, null);
  const qualityChecks = [
    form.heroTitle,
    form.heroTagline,
    form.heroBannerUrl,
    form.brandLogoUrl,
    form.contactPhone || form.whatsappPhone,
    form.addressText,
    form.amenities.length >= 3,
    form.galleryImages.length >= 2,
    activePlans.length > 0,
    form.highlightOffer,
  ];
  const qualityScore = Math.round((qualityChecks.filter(Boolean).length / qualityChecks.length) * 100);

  useEffect(() => {
    setForm(defaults);
  }, [defaults]);

  useEffect(() => {
    hydrateSessionFromServer()
      .then((session) => {
        if (!session?.user || session.user.role !== "LIBRARY_OWNER") return null;
        return Promise.all([
          apiFetch<OwnerPublicProfileResponse>("/owner/public-profile"),
          apiFetch<{ success: boolean; data: StudentPlanConfig[] }>("/owner/student-plans").catch(() => ({ success: false, data: [] })),
        ]);
      })
      .then((response) => {
        if (response?.[0]?.data) {
          setForm(mapProfile(response[0].data, defaults));
          setSlug(response[0].data.library_slug ?? "");
        }
        if (response?.[1]?.data) {
          setPlans(response[1].data);
        }
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load marketplace listing.");
      })
      .finally(() => setLoading(false));
  }, [defaults]);

  function update<Key extends keyof ListingForm>(key: Key, value: ListingForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveListing(nextPublished = form.listingPublished) {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch("/owner/marketplace-listing", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          listingPublished: nextPublished,
          latitude: null,
          longitude: null,
        }),
      });
      update("listingPublished", nextPublished);
      setMessage(nextPublished ? "Marketplace listing is live." : "Marketplace listing saved as hidden.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save marketplace listing.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading marketplace listing...</p>;
  }

  return (
    <div className="grid gap-3">
      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
      {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}

      <DashboardCard title="Marketplace listing" subtitle="This listing syncs media, offer, active public plans, contact details, and public website CTA into marketplace search.">
        <div className="grid gap-3">
          <div className="grid gap-2 rounded-lg border border-[var(--lp-border)] bg-white p-3 sm:grid-cols-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">State</p>
              <p className={`mt-1 text-sm font-black ${form.listingPublished ? "text-emerald-700" : "text-amber-700"}`}>{form.listingPublished ? "Published" : "Hidden"}</p>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Quality</p>
              <p className="mt-1 text-xl font-black text-slate-950">{qualityScore}%</p>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Plans</p>
              <p className="mt-1 text-sm font-black text-slate-950">{startingPlan ? `From Rs. ${startingPlan.base_amount}` : "Add plan"}</p>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Gallery</p>
              <p className="mt-1 text-xl font-black text-slate-950">{form.galleryImages.length}</p>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Contact</p>
              <p className="mt-1 text-sm font-black text-slate-950">{form.allowDirectContact ? "Enabled" : "Hidden"}</p>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-base font-black text-slate-950">{form.heroTitle || "Listing title"}</p>
            <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600">{form.heroTagline || "Short marketplace pitch will appear here."}</p>
            {form.highlightOffer ? <p className="mt-2 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">{form.highlightOffer}</p> : null}
          </div>
          <button type="button" onClick={() => setDetailsOpen(true)} className="rounded-lg border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--lp-accent)]">
            Edit listing details
          </button>
        </div>
      </DashboardCard>

      <FormDrawer
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title="Edit listing details"
        description="Manage listing title, pitch, amenities, contact, address, and current offer."
        widthClassName="sm:w-[min(96vw,56rem)] sm:max-w-5xl"
      >
        <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="grid gap-4">
            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Listing title</span>
              <input value={form.heroTitle} onChange={(event) => update("heroTitle", event.target.value)} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-3 outline-none" />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Short pitch</span>
              <textarea value={form.heroTagline} onChange={(event) => update("heroTagline", event.target.value)} className="min-h-24 rounded-lg border border-[var(--lp-border)] bg-white px-4 py-3 outline-none" />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">About listing</span>
              <textarea value={form.aboutText} onChange={(event) => update("aboutText", event.target.value)} className="min-h-28 rounded-lg border border-[var(--lp-border)] bg-white px-4 py-3 outline-none" placeholder="Facilities, environment, seating style, exam prep support" />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Amenities</span>
              <textarea
                value={amenitiesInput}
                onChange={(event) => update("amenities", event.target.value.split(",").map((item) => item.trim()).filter(Boolean))}
                className="min-h-20 rounded-lg border border-[var(--lp-border)] bg-white px-4 py-3 outline-none"
              />
            </label>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Contact name</span>
                <input value={form.contactName} onChange={(event) => update("contactName", event.target.value)} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-3 outline-none" />
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Phone</span>
                <input value={form.contactPhone} onChange={(event) => update("contactPhone", event.target.value)} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-3 outline-none" />
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">WhatsApp</span>
                <input value={form.whatsappPhone} onChange={(event) => update("whatsappPhone", event.target.value)} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-3 outline-none" />
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Email</span>
                <input value={form.email} onChange={(event) => update("email", event.target.value)} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-3 outline-none" />
              </label>
            </div>
            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Address</span>
              <textarea value={form.addressText} onChange={(event) => update("addressText", event.target.value)} className="min-h-20 rounded-lg border border-[var(--lp-border)] bg-white px-4 py-3 outline-none" />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <input value={form.landmark} onChange={(event) => update("landmark", event.target.value)} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-3 outline-none" placeholder="Landmark" />
              <input value={form.businessHours} onChange={(event) => update("businessHours", event.target.value)} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-3 outline-none" placeholder="Business hours" />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <input value={form.highlightOffer} onChange={(event) => update("highlightOffer", event.target.value)} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-3 outline-none" placeholder="Listing offer text" />
              <input type="date" value={form.offerExpiresAt} onChange={(event) => update("offerExpiresAt", event.target.value)} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-3 outline-none" />
            </div>
            <label className="flex items-center gap-3 rounded-lg border border-[var(--lp-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--lp-text)]">
              <input type="checkbox" checked={form.allowDirectContact} onChange={(event) => update("allowDirectContact", event.target.checked)} />
              Allow direct call/WhatsApp/contact leads from marketplace
            </label>
          </div>
        </div>
      </FormDrawer>

      <div className="grid gap-3 xl:grid-cols-[0.52fr_1.48fr]">
        <DashboardCard title="Listing media" subtitle="Upload real photos; URLs are generated automatically after upload.">
          <div className="grid gap-2.5">
            <div className="rounded-lg border border-[var(--lp-border)] bg-white p-2.5">
              <div className="flex items-center gap-3">
                <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-100 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  {logoPreview ? <img src={logoPreview} alt="Listing logo" className="h-full w-full object-cover" /> : "Logo"}
                </div>
                <div className="min-w-0 flex-1">
                  <PublicProfileImageUpload label="Upload logo" helperText="Square logo works best" onUploaded={(url) => update("brandLogoUrl", url)} />
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-[var(--lp-border)] bg-white p-2.5">
              <div className="flex items-center gap-3">
                <div className="grid h-16 w-24 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-100 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  {heroPreview ? <img src={heroPreview} alt="Listing banner" className="h-full w-full object-cover" /> : "Cover"}
                </div>
                <div className="min-w-0 flex-1">
                  <PublicProfileImageUpload label="Upload cover" helperText="Wide library photo recommended" onUploaded={(url) => update("heroBannerUrl", url)} />
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-dashed border-[var(--lp-border)] bg-white p-2.5">
              <PublicProfileImageUpload label="Upload gallery photo" helperText="Add study hall, desk, reception, exterior" onUploaded={(url) => update("galleryImages", [...form.galleryImages, url])} />
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title="Listing preview" subtitle="Students see this through Marketplace and the detail page.">
          <div className="grid gap-3">
            <div className="overflow-hidden rounded-lg border border-[var(--lp-border)] bg-white">
              <div className="grid h-32 place-items-center bg-slate-100">
                {heroPreview ? (
                  <img src={heroPreview} alt="Marketplace cover preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="text-center">
                    <p className="text-sm font-black text-slate-500">Cover photo pending</p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">Upload a real library photo for marketplace cards.</p>
                  </div>
                )}
              </div>
              <div className="grid gap-2.5 p-3">
                <div className="flex items-start gap-3">
                  {logoPreview ? <img src={logoPreview} alt="Logo preview" className="h-11 w-11 rounded-lg object-cover ring-1 ring-slate-200" /> : null}
                  <div>
                    <p className="text-base font-black text-slate-950">{form.heroTitle || "Listing title"}</p>
                    <p className="line-clamp-2 text-sm leading-5 text-slate-600">{form.heroTagline || "Short pitch"}</p>
                  </div>
                </div>
                <p className="line-clamp-2 text-sm leading-5 text-slate-600">{form.aboutText || "About text will appear here."}</p>
                <div className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700">Plans from</p>
                    <p className="mt-1 text-lg font-black text-slate-950">{startingPlan ? `Rs. ${startingPlan.base_amount}` : "Add owner plan"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-700">Offer</p>
                    <p className="mt-1 line-clamp-1 text-sm font-black text-slate-950">{form.highlightOffer || "No active offer"}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.amenities.slice(0, 8).map((amenity) => (
                    <span key={amenity} className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{amenity}</span>
                  ))}
                </div>
              </div>
            </div>

            {form.galleryImages.length ? (
              <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {form.galleryImages.map((url, index) => (
                  <div key={`${url}-${index}`} className="overflow-hidden rounded-lg border border-[var(--lp-border)] bg-white">
                    <div className="aspect-[16/10] bg-slate-100">
                      <img src={resolvePublicAssetUrl(url) ?? url} alt={`Gallery ${index + 1}`} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex flex-wrap gap-1.5 border-t border-[var(--lp-border)] bg-white p-2">
                      <button type="button" onClick={() => update("galleryImages", moveImage(form.galleryImages, index, -1))} className="rounded-md border border-[var(--lp-border)] bg-white px-2.5 py-1.5 text-xs font-bold">Left</button>
                      <button type="button" onClick={() => update("galleryImages", moveImage(form.galleryImages, index, 1))} className="rounded-md border border-[var(--lp-border)] bg-white px-2.5 py-1.5 text-xs font-bold">Right</button>
                      <button type="button" onClick={() => update("galleryImages", form.galleryImages.filter((_, imageIndex) => imageIndex !== index))} className="rounded-md bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </DashboardCard>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void saveListing(true)} disabled={saving} className="rounded-lg bg-[var(--lp-primary)] px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
          {saving ? "Saving..." : "Publish marketplace listing"}
        </button>
        <button type="button" onClick={() => void saveListing(false)} disabled={saving} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 text-sm font-bold text-[var(--lp-text)] disabled:opacity-60">
          Save hidden
        </button>
        <a href={listingPath} target="_blank" rel="noreferrer" className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 text-sm font-bold text-[var(--lp-primary)]">
          Open public detail
        </a>
      </div>
    </div>
  );
}
