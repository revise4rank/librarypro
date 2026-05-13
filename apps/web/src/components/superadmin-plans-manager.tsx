"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";
import { FormDrawer } from "./form-drawer";
import { StatCard } from "./stat-card";

const featureCatalog = [
  { key: "listing", label: "Marketplace listing" },
  { key: "seat_management", label: "Seat management" },
  { key: "scanner_download", label: "Scanner download" },
  { key: "subdomain", label: "Subdomain" },
  { key: "website_builder", label: "Website builder" },
  { key: "ads", label: "Ads and campaigns" },
  { key: "admin_creation", label: "Admin creation" },
  { key: "offers", label: "Offers" },
  { key: "coupons", label: "Coupons" },
  { key: "reports_export", label: "Reports export" },
] as const;

type FeatureKey = (typeof featureCatalog)[number]["key"];

type PlanRow = {
  plan_code: string;
  plan_name: string;
  amount: string;
  currency?: string | null;
  duration_months?: string;
  seat_limit?: string | null;
  referral_bonus?: string;
  features?: Record<FeatureKey, boolean> | null;
  is_active?: boolean | null;
  sort_order?: number | null;
  tenants: string;
  active_tenants: string;
  past_due_tenants: string;
};

type PlanForm = {
  planName: string;
  amount: string;
  currency: string;
  durationMonths: string;
  seatLimit: string;
  referralBonus: string;
  features: Record<FeatureKey, boolean>;
  isActive: boolean;
  sortOrder: string;
};

const defaultFeatures = Object.fromEntries(featureCatalog.map((feature) => [feature.key, false])) as Record<FeatureKey, boolean>;

function normalizeFeatures(features?: Record<FeatureKey, boolean> | null) {
  return {
    ...defaultFeatures,
    ...(features ?? {}),
  };
}

function formFromPlan(plan: PlanRow): PlanForm {
  return {
    planName: plan.plan_name,
    amount: plan.amount ?? "0",
    currency: plan.currency ?? "INR",
    durationMonths: plan.duration_months ?? "0",
    seatLimit: plan.seat_limit ?? "",
    referralBonus: plan.referral_bonus ?? "0",
    features: normalizeFeatures(plan.features),
    isActive: plan.is_active ?? true,
    sortOrder: String(plan.sort_order ?? 0),
  };
}

export function SuperadminPlansManager() {
  const [rows, setRows] = useState<PlanRow[]>([]);
  const [forms, setForms] = useState<Record<string, PlanForm>>({});
  const [savingPlanCode, setSavingPlanCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingPlanCode, setEditingPlanCode] = useState<string | null>(null);

  async function loadPlans() {
    try {
      const response = await apiFetch<{ success: boolean; data: PlanRow[] }>("/admin/plans");
      setRows(response.data);
      setForms(Object.fromEntries(response.data.map((plan) => [plan.plan_code, formFromPlan(plan)])));
      setError(null);
    } catch (loadError) {
      setRows([]);
      setError(loadError instanceof Error ? loadError.message : "Unable to load plan data.");
    }
  }

  useEffect(() => {
    void loadPlans();
  }, []);

  function updateForm(planCode: string, patch: Partial<PlanForm>) {
    setForms((current) => ({
      ...current,
      [planCode]: {
        ...(current[planCode] ?? formFromPlan(rows.find((row) => row.plan_code === planCode)!)),
        ...patch,
      },
    }));
  }

  function updateFeature(planCode: string, feature: FeatureKey, enabled: boolean) {
    const current = forms[planCode];
    if (!current) return;
    updateForm(planCode, {
      features: {
        ...current.features,
        [feature]: enabled,
      },
    });
  }

  async function savePlan(planCode: string) {
    const form = forms[planCode];
    if (!form) return;

    setSavingPlanCode(planCode);
    setMessage(null);
    setError(null);
    try {
      await apiFetch(`/admin/plans/${encodeURIComponent(planCode)}`, {
        method: "PATCH",
        body: JSON.stringify({
          planName: form.planName,
          amount: Number(form.amount || "0"),
          currency: form.currency || "INR",
          durationMonths: Number(form.durationMonths || "0"),
          seatLimit: form.seatLimit ? Number(form.seatLimit) : null,
          referralBonus: Number(form.referralBonus || "0"),
          features: form.features,
          isActive: form.isActive,
          sortOrder: Number(form.sortOrder || "0"),
        }),
      });
      setMessage(`${form.planName} updated. Owner access rules now use this configuration.`);
      await loadPlans();
      setEditingPlanCode(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save plan.");
    } finally {
      setSavingPlanCode(null);
    }
  }

  const activePlans = rows.filter((plan) => forms[plan.plan_code]?.isActive ?? plan.is_active ?? true);
  const tenantsTotal = rows.reduce((sum, plan) => sum + Number(plan.tenants || 0), 0);
  const pastDueTotal = rows.reduce((sum, plan) => sum + Number(plan.past_due_tenants || 0), 0);
  const enabledFeaturesTotal = rows.reduce((sum, plan) => {
    const form = forms[plan.plan_code] ?? formFromPlan(plan);
    return sum + Object.values(form.features).filter(Boolean).length;
  }, 0);
  const editingPlan = editingPlanCode ? rows.find((plan) => plan.plan_code === editingPlanCode) ?? null : null;
  const editingForm = editingPlanCode ? forms[editingPlanCode] ?? (editingPlan ? formFromPlan(editingPlan) : null) : null;

  return (
    <div className="grid gap-5">
      {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm font-semibold text-amber-700">{error}</p> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active plans" value={activePlans.length} note="Visible for owner billing." />
        <StatCard label="Total tenants" value={tenantsTotal} note="Libraries mapped to plans." />
        <StatCard label="Past due" value={pastDueTotal} note="Needs billing attention." />
        <StatCard label="Feature toggles" value={enabledFeaturesTotal} note="Enabled across all plans." />
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        {rows.map((plan) => {
          const form = forms[plan.plan_code] ?? formFromPlan(plan);
          const enabledCount = Object.values(form.features).filter(Boolean).length;
          return (
            <DashboardCard key={plan.plan_code} title={form.planName} subtitle={plan.plan_code}>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-[var(--lp-border)] bg-white p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Price</p>
                    <p className="mt-1 text-lg font-black text-slate-950">Rs. {Number(form.amount || "0").toLocaleString("en-IN")}</p>
                  </div>
                  <div className="rounded-lg border border-[var(--lp-border)] bg-white p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Duration</p>
                    <p className="mt-1 text-lg font-black text-slate-950">{form.durationMonths || 0} mo</p>
                  </div>
                  <div className="rounded-lg border border-[var(--lp-border)] bg-white p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Seats</p>
                    <p className="mt-1 text-lg font-black text-slate-950">{form.seatLimit || "Unlimited"}</p>
                  </div>
                  <div className="rounded-lg border border-[var(--lp-border)] bg-white p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Referral</p>
                    <p className="mt-1 text-lg font-black text-slate-950">Rs. {Number(form.referralBonus || "0").toLocaleString("en-IN")}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-[var(--lp-border)] bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Access enabled</p>
                    <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-500">{enabledCount}/{featureCatalog.length}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {featureCatalog.filter((feature) => form.features[feature.key]).slice(0, 5).map((feature) => (
                      <span key={feature.key} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600">{feature.label}</span>
                    ))}
                    {enabledCount > 5 ? <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600">+{enabledCount - 5}</span> : null}
                    {enabledCount === 0 ? <span className="text-sm text-slate-500">No features enabled.</span> : null}
                  </div>
                </div>

                <div className="grid gap-2 rounded-lg border border-[var(--lp-border)] bg-white p-3 text-xs leading-5 text-slate-500">
                  <p><span className="font-black text-slate-700">Tenants:</span> {plan.tenants}</p>
                  <p><span className="font-black text-slate-700">Active:</span> {plan.active_tenants}</p>
                  <p><span className="font-black text-slate-700">Past due:</span> {plan.past_due_tenants}</p>
                </div>

                <button
                  type="button"
                  onClick={() => setEditingPlanCode(plan.plan_code)}
                  className="rounded-lg bg-[var(--lp-primary)] px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
                >
                  Edit plan access
                </button>
              </div>
            </DashboardCard>
          );
        })}
      </div>

      {rows.length === 0 ? <p className="text-sm text-slate-500">No plan summaries found.</p> : null}

      <FormDrawer
        open={Boolean(editingPlan && editingForm)}
        onClose={() => setEditingPlanCode(null)}
        title={editingForm?.planName ?? "Edit plan access"}
        description="Super admin controls price, duration, seat access, referral bonus, and every entitlement from here."
        widthClassName="sm:w-[min(96vw,56rem)] sm:max-w-5xl"
      >
        {editingPlan && editingForm ? (
          <div className="grid gap-5">
            <div className="grid gap-3">
              <input
                value={editingForm.planName}
                onChange={(event) => updateForm(editingPlan.plan_code, { planName: event.target.value })}
                className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm font-bold text-slate-950 outline-none"
              />
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <label className="grid gap-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Price</span>
                  <input type="number" min="0" value={editingForm.amount} onChange={(event) => updateForm(editingPlan.plan_code, { amount: event.target.value })} className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm outline-none" />
                </label>
                <label className="grid gap-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Currency</span>
                  <input value={editingForm.currency} onChange={(event) => updateForm(editingPlan.plan_code, { currency: event.target.value.toUpperCase() })} className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm outline-none" />
                </label>
                <label className="grid gap-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Months</span>
                  <input type="number" min="0" value={editingForm.durationMonths} onChange={(event) => updateForm(editingPlan.plan_code, { durationMonths: event.target.value })} className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm outline-none" />
                </label>
                <label className="grid gap-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Seats</span>
                  <input type="number" min="1" value={editingForm.seatLimit} onChange={(event) => updateForm(editingPlan.plan_code, { seatLimit: event.target.value })} className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm outline-none" placeholder="Unlimited" />
                </label>
                <label className="grid gap-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Referral</span>
                  <input type="number" min="0" value={editingForm.referralBonus} onChange={(event) => updateForm(editingPlan.plan_code, { referralBonus: event.target.value })} className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm outline-none" />
                </label>
                <label className="grid gap-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Order</span>
                  <input type="number" min="0" value={editingForm.sortOrder} onChange={(event) => updateForm(editingPlan.plan_code, { sortOrder: event.target.value })} className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm outline-none" />
                </label>
              </div>
              <label className="flex items-center gap-3 rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={editingForm.isActive} onChange={(event) => updateForm(editingPlan.plan_code, { isActive: event.target.checked })} />
                Active for owner billing and entitlement checks
              </label>
            </div>

            <div className="rounded-lg border border-[var(--lp-border)] bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Feature access toggles</p>
                <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-500">
                  {Object.values(editingForm.features).filter(Boolean).length}/{featureCatalog.length}
                </span>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {featureCatalog.map((feature) => (
                  <label key={feature.key} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                    <span>{feature.label}</span>
                    <input type="checkbox" checked={editingForm.features[feature.key]} onChange={(event) => updateFeature(editingPlan.plan_code, feature.key, event.target.checked)} />
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-2 rounded-lg border border-[var(--lp-border)] bg-white p-3 text-xs leading-5 text-slate-500 sm:grid-cols-3">
              <p><span className="font-black text-slate-700">Tenants:</span> {editingPlan.tenants}</p>
              <p><span className="font-black text-slate-700">Active:</span> {editingPlan.active_tenants}</p>
              <p><span className="font-black text-slate-700">Past due:</span> {editingPlan.past_due_tenants}</p>
            </div>

            <button
              type="button"
              onClick={() => void savePlan(editingPlan.plan_code)}
              disabled={savingPlanCode === editingPlan.plan_code}
              className="rounded-lg bg-[var(--lp-primary)] px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              {savingPlanCode === editingPlan.plan_code ? "Saving plan access..." : "Save plan access"}
            </button>
          </div>
        ) : null}
      </FormDrawer>
    </div>
  );
}
