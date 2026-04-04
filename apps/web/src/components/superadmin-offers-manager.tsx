"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";

type OfferCategory = { id: string; slug: string; name: string };
type OfferRow = {
  id: string;
  category_id: string;
  category_name: string;
  title: string;
  short_description: string;
  city: string | null;
  valid_until: string | null;
  status: string;
  is_featured: boolean;
  total_views?: string;
  total_clicks?: string;
  source_type: string;
};

export function SuperadminOffersManager() {
  const [categories, setCategories] = useState<OfferCategory[]>([]);
  const [rows, setRows] = useState<OfferRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    categoryId: "",
    title: "",
    shortDescription: "",
    city: "",
    validUntil: "",
    ctaLabel: "View Details",
    ctaUrl: "",
    isFeatured: false,
  });

  async function load() {
    try {
      const [categoriesResponse, offersResponse] = await Promise.all([
        apiFetch<{ success: boolean; data: OfferCategory[] }>("/offers/categories"),
        apiFetch<{ success: boolean; data: OfferRow[] }>("/admin/offers"),
      ]);
      setCategories(categoriesResponse.data);
      setRows(offersResponse.data);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load offers.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createOffer() {
    try {
      await apiFetch("/admin/offers", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          imageUrl: "",
          longDescription: "",
          area: "",
          contactPhone: "",
          targetLibraryId: "",
          status: "APPROVED",
        }),
      });
      setMessage("Offer created and approved.");
      setForm({
        categoryId: categories[0]?.id ?? "",
        title: "",
        shortDescription: "",
        city: "",
        validUntil: "",
        ctaLabel: "View Details",
        ctaUrl: "",
        isFeatured: false,
      });
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to create offer.");
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
      <DashboardCard title="Create platform offer" subtitle="Student-first opportunities feed, not ad spam">
        <div className="grid gap-4">
          <select value={form.categoryId} onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none">
            <option value="">Select category</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none" placeholder="Offer title" />
          <textarea value={form.shortDescription} onChange={(event) => setForm((current) => ({ ...current, shortDescription: event.target.value }))} className="min-h-28 rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none" placeholder="Short description" />
          <div className="grid gap-4 md:grid-cols-2">
            <input value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none" placeholder="City" />
            <input type="date" value={form.validUntil} onChange={(event) => setForm((current) => ({ ...current, validUntil: event.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <select value={form.ctaLabel} onChange={(event) => setForm((current) => ({ ...current, ctaLabel: event.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none">
              <option value="View Details">View Details</option>
              <option value="Contact">Contact</option>
              <option value="Apply">Apply</option>
            </select>
            <input value={form.ctaUrl} onChange={(event) => setForm((current) => ({ ...current, ctaUrl: event.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none" placeholder="https://..." />
          </div>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold">
            <input type="checkbox" checked={form.isFeatured} onChange={(event) => setForm((current) => ({ ...current, isFeatured: event.target.checked }))} />
            Mark as featured
          </label>
          <button type="button" onClick={() => void createOffer()} className="rounded-full bg-[var(--lp-primary)] px-5 py-3 text-sm font-bold text-white">
            Create offer
          </button>
          {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
          {error ? <p className="text-sm font-semibold text-amber-700">{error}</p> : null}
        </div>
      </DashboardCard>

      <DashboardCard title="Offer moderation" subtitle="Views, clicks, and approval state">
        <div className="grid gap-3">
          {rows.map((row) => (
            <div key={row.id} className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-black text-slate-950">{row.title}</p>
                  <p className="text-sm text-slate-500">{row.category_name} • {row.city ?? "All cities"} • {row.source_type}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">{row.status}</span>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-600">{row.short_description}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
                <span className="rounded-full bg-emerald-100 px-3 py-2 text-emerald-700">{row.total_views ?? "0"} views</span>
                <span className="rounded-full bg-cyan-100 px-3 py-2 text-cyan-700">{row.total_clicks ?? "0"} clicks</span>
                {row.is_featured ? <span className="rounded-full bg-amber-100 px-3 py-2 text-amber-700">Featured</span> : null}
              </div>
            </div>
          ))}
          {rows.length === 0 ? <p className="text-sm text-slate-500">No offers yet.</p> : null}
        </div>
      </DashboardCard>
    </div>
  );
}
