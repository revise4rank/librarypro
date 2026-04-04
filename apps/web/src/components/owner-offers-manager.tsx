"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";

type OfferCategory = { id: string; slug: string; name: string };

export function OwnerOffersManager() {
  const [categories, setCategories] = useState<OfferCategory[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    categoryId: "",
    title: "",
    shortDescription: "",
    validUntil: "",
    ctaLabel: "View Details",
    ctaUrl: "",
  });

  useEffect(() => {
    apiFetch<{ success: boolean; data: OfferCategory[] }>("/offers/categories")
      .then((response) => setCategories(response.data))
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load categories."));
  }, []);

  async function submitOffer() {
    try {
      await apiFetch("/owner/offers", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          imageUrl: "",
          longDescription: "",
          city: "",
          area: "",
          targetLibraryId: "",
          contactPhone: "",
        }),
      });
      setMessage("Offer submitted for admin approval.");
      setForm({
        categoryId: categories[0]?.id ?? "",
        title: "",
        shortDescription: "",
        validUntil: "",
        ctaLabel: "View Details",
        ctaUrl: "",
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit offer.");
    }
  }

  return (
    <DashboardCard title="Owner offers" subtitle="Optional promotions, discounts, and library-specific opportunities">
      <div className="grid gap-4">
        <select value={form.categoryId} onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none">
          <option value="">Select category</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none" placeholder="Offer title" />
        <textarea value={form.shortDescription} onChange={(event) => setForm((current) => ({ ...current, shortDescription: event.target.value }))} className="min-h-28 rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none" placeholder="Short description" />
        <div className="grid gap-4 md:grid-cols-2">
          <select value={form.ctaLabel} onChange={(event) => setForm((current) => ({ ...current, ctaLabel: event.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none">
            <option value="View Details">View Details</option>
            <option value="Contact">Contact</option>
            <option value="Apply">Apply</option>
          </select>
          <input type="date" value={form.validUntil} onChange={(event) => setForm((current) => ({ ...current, validUntil: event.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none" />
        </div>
        <input value={form.ctaUrl} onChange={(event) => setForm((current) => ({ ...current, ctaUrl: event.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none" placeholder="https://..." />
        <button type="button" onClick={() => void submitOffer()} className="rounded-full bg-[var(--lp-primary)] px-5 py-3 text-sm font-bold text-white">
          Submit for approval
        </button>
        {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
        {error ? <p className="text-sm font-semibold text-amber-700">{error}</p> : null}
      </div>
    </DashboardCard>
  );
}
