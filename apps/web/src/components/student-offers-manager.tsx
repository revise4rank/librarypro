"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";

type OfferCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
};

type OfferRow = {
  id: string;
  category_id: string;
  category_name: string;
  title: string;
  image_url: string | null;
  short_description: string;
  long_description: string | null;
  city: string | null;
  area: string | null;
  valid_until: string | null;
  cta_label: string;
  cta_url: string | null;
  contact_phone: string | null;
  is_featured: boolean;
  status: string;
  source_type: string;
  owner_library_name: string | null;
};

type CategoriesResponse = { success: boolean; data: OfferCategory[] };
type OffersResponse = {
  success: boolean;
  data: OfferRow[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

async function trackAction(offerId: string, actionType: "VIEW_DETAILS" | "CONTACT" | "APPLY") {
  try {
    await apiFetch("/offers/click", {
      method: "POST",
      body: JSON.stringify({ offerId, actionType }),
    }, false);
  } catch {
    // non-blocking analytics
  }
}

export function StudentOffersManager() {
  const [categories, setCategories] = useState<OfferCategory[]>([]);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<OffersResponse["meta"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCategories, setShowCategories] = useState(false);

  async function loadCategories() {
    const response = await apiFetch<CategoriesResponse>("/offers/categories", undefined, false);
    setCategories(response.data);
  }

  async function loadOffers(nextCategory = category, nextPage = page) {
    try {
      const query = new URLSearchParams();
      if (nextCategory) query.set("category", nextCategory);
      query.set("page", String(nextPage));
      query.set("limit", "9");
      const response = await apiFetch<OffersResponse>(`/offers?${query.toString()}`, undefined, false);
      setOffers(response.data);
      setMeta(response.meta);
      setError(null);
      await Promise.all(response.data.map((offer) => apiFetch(`/offers/${offer.id}/view`, { method: "POST" }, false).catch(() => undefined)));
    } catch (loadError) {
      setOffers([]);
      setError(loadError instanceof Error ? loadError.message : "Unable to load opportunities.");
    }
  }

  useEffect(() => {
    void loadCategories();
  }, []);

  useEffect(() => {
    void loadOffers();
  }, [page]);

  return (
    <div className="grid gap-6">
      <DashboardCard
        title="Explore opportunities"
        subtitle="Optional discovery section. Study flow se intentionally separate."
      >
        <div className="grid gap-4">
          <button type="button" onClick={() => setShowCategories((current) => !current)} className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-slate-700">
            {showCategories ? "Hide category filters" : "Show category filters"}
          </button>
          {showCategories ? (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setCategory("");
                  setPage(1);
                  void loadOffers("", 1);
                }}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${category === "" ? "border border-[var(--lp-accent-soft)] bg-[var(--lp-accent-soft)] text-[var(--lp-accent-strong)]" : "border border-[var(--lp-border)] bg-white text-[var(--lp-text)]"}`}
              >
                All
              </button>
              {categories.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setCategory(item.slug);
                    setPage(1);
                    void loadOffers(item.slug, 1);
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${category === item.slug ? "border border-[var(--lp-accent-soft)] bg-[var(--lp-accent-soft)] text-[var(--lp-accent-strong)]" : "border border-[var(--lp-border)] bg-white text-[var(--lp-text)]"}`}
                >
                  {item.name}
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 text-sm text-slate-600">
              Filters stay hidden unless you want to narrow down coaching, courses, colleges, or discounts.
            </div>
          )}
          {error ? <p className="text-sm font-semibold text-amber-700">{error}</p> : null}
        </div>
      </DashboardCard>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr_1fr]">
        {offers.map((offer) => (
          <DashboardCard key={offer.id} title={offer.title} subtitle={`${offer.category_name} | ${offer.city ?? "India"}${offer.area ? ` | ${offer.area}` : ""}`}>
            <div className="grid gap-4">
              <div className="aspect-[16/10] overflow-hidden rounded-[1.5rem] bg-[linear-gradient(135deg,#f7e6d8,#fff8ef_50%,#dff1ec)]">
                {offer.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={offer.image_url} alt={offer.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-center text-sm font-semibold text-slate-500">
                    Opportunity preview
                  </div>
                )}
              </div>
              <p className="text-sm leading-7 text-slate-600">{offer.short_description}</p>
              <div className="flex flex-wrap gap-2">
                {offer.is_featured ? <span className="rounded-full bg-amber-100 px-3 py-2 text-xs font-black text-amber-700">Featured</span> : null}
                {offer.owner_library_name ? <span className="rounded-full bg-emerald-100 px-3 py-2 text-xs font-black text-emerald-700">{offer.owner_library_name}</span> : null}
                {offer.valid_until ? <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">Valid till {offer.valid_until.slice(0, 10)}</span> : null}
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => void trackAction(offer.id, "VIEW_DETAILS")} className="rounded-full border border-[var(--lp-border)] bg-white px-4 py-2 text-sm font-bold text-[var(--lp-text)]">
                  View details
                </button>
                <button type="button" onClick={() => void trackAction(offer.id, "CONTACT")} className="rounded-full border border-[var(--lp-border)] bg-white px-4 py-2 text-sm font-bold text-[var(--lp-text)]">
                  Contact
                </button>
                <a
                  href={offer.cta_url ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => void trackAction(offer.id, "APPLY")}
                  className="rounded-full bg-[var(--lp-primary)] px-4 py-2 text-sm font-bold text-white"
                >
                  {offer.cta_label}
                </a>
              </div>
            </div>
          </DashboardCard>
        ))}
      </section>

      {meta ? (
        <div className="flex items-center justify-between gap-4 rounded-[1.5rem] border border-[var(--lp-border)] bg-white px-5 py-4">
          <p className="text-sm text-slate-600">Page {meta.page} of {meta.totalPages}</p>
          <div className="flex gap-3">
            <button type="button" disabled={meta.page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-full border border-[var(--lp-border)] bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50">
              Previous
            </button>
            <button type="button" disabled={meta.page >= meta.totalPages} onClick={() => setPage((current) => current + 1)} className="rounded-full border border-[var(--lp-border)] bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50">
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
