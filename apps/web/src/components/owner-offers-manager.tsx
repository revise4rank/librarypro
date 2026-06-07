"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, displayApiError } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";
import { FormDrawer } from "./form-drawer";
import { isPlanAccessMessage, PlanAccessNotice } from "./plan-access-notice";

type OfferCategory = { id: string; slug: string; name: string };

export function OwnerOffersManager() {
  const [categories, setCategories] = useState<OfferCategory[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
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
      .catch((loadError) => setError(displayApiError(loadError, "Unable to load categories.")));
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
      setComposerOpen(false);
    } catch (submitError) {
      setError(displayApiError(submitError, "Unable to submit offer."));
    }
  }

  return (
    <>
      <DashboardCard title="Offer workspace" subtitle="Optional promotions, discounts, and library-specific opportunities">
        <div className="grid gap-4">
          <Link href="/owner/marketing" className="w-fit rounded-full border border-[var(--lp-border)] bg-white px-3 py-2 text-xs font-black text-[var(--lp-accent)]">
            Back to Marketing
          </Link>
          <div className="rounded-2xl border border-[var(--lp-accent-soft)] bg-[linear-gradient(135deg,rgba(227,248,240,0.96),rgba(255,249,240,0.96))] p-5">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[var(--lp-accent-strong)]">Optional growth layer</p>
            <h3 className="mt-2 text-xl font-black text-[var(--lp-text)]">Keep promotions useful, limited, and easy to review.</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">Publish only the offers that add value for students or help admissions. Everything else stays outside the main workflow.</p>
          </div>
          <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Categories</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{categories.length}</p>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Flow</p>
              <p className="mt-2 text-sm font-black text-slate-950">Admin approval</p>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Placement</p>
              <p className="mt-2 text-sm font-black text-slate-950">Student offers</p>
            </div>
          </div>
          <button type="button" onClick={() => setComposerOpen(true)} className="rounded-full border border-[var(--lp-accent-soft)] bg-[var(--lp-accent-soft)] px-5 py-3 text-sm font-bold text-[var(--lp-accent-strong)]">
            Compose offer
          </button>
          {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
          {error ? isPlanAccessMessage(error) ? <PlanAccessNotice message={error} /> : <p className="text-sm font-semibold text-amber-700">{error}</p> : null}
        </div>
      </DashboardCard>

      <FormDrawer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        title="Compose offer"
        description="Submit a limited, useful student-facing promotion for admin approval."
      >
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
        <button type="button" onClick={() => void submitOffer()} className="rounded-full border border-[var(--lp-accent-soft)] bg-[var(--lp-accent-soft)] px-5 py-3 text-sm font-bold text-[var(--lp-accent-strong)]">
          Submit for approval
        </button>
        {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
        {error ? isPlanAccessMessage(error) ? <PlanAccessNotice message={error} /> : <p className="text-sm font-semibold text-amber-700">{error}</p> : null}
      </div>
      </FormDrawer>
    </>
  );
}
