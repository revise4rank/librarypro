"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";
import { FormDrawer } from "./form-drawer";

type DiscountType = "PERCENTAGE" | "FLAT";

type StudentPlanConfig = {
  id: string;
  name: string;
  target_audience: string | null;
  description: string | null;
  duration_months: number;
  base_amount: string;
  default_discount_type: DiscountType | null;
  default_discount_value: string | null;
  is_active: boolean;
  created_at: string;
};

function computePreviewAmount(baseAmount: string, discountType: DiscountType | "", discountValue: string) {
  const base = Number(baseAmount || "0");
  const discount = Number(discountValue || "0");
  if (!base || !discountType || !discount) return base;
  if (discountType === "PERCENTAGE") return Math.max(0, base - Math.round((base * discount) / 100));
  return Math.max(0, base - discount);
}

const emptyPlanForm = {
  name: "",
  targetAudience: "",
  description: "",
  durationMonths: "1",
  baseAmount: "999",
  defaultDiscountType: "" as DiscountType | "",
  defaultDiscountValue: "",
  isActive: true,
};

export function OwnerPlansManager() {
  const [plans, setPlans] = useState<StudentPlanConfig[]>([]);
  const [planForm, setPlanForm] = useState(emptyPlanForm);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  async function loadPlans() {
    setLoading(true);
    try {
      const response = await apiFetch<{ success: boolean; data: StudentPlanConfig[] }>("/owner/student-plans");
      setPlans(response.data);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load plans.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPlans();
  }, []);

  const planPreview = useMemo(
    () => computePreviewAmount(planForm.baseAmount, planForm.defaultDiscountType, planForm.defaultDiscountValue),
    [planForm.baseAmount, planForm.defaultDiscountType, planForm.defaultDiscountValue],
  );

  async function savePlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await apiFetch(editingPlanId ? `/owner/student-plans/${editingPlanId}` : "/owner/student-plans", {
        method: editingPlanId ? "PATCH" : "POST",
        body: JSON.stringify({
          name: planForm.name,
          targetAudience: planForm.targetAudience,
          description: planForm.description,
          durationMonths: Number(planForm.durationMonths || "1"),
          baseAmount: Number(planForm.baseAmount || "0"),
          defaultDiscountType: planForm.defaultDiscountType || undefined,
          defaultDiscountValue: planForm.defaultDiscountValue ? Number(planForm.defaultDiscountValue) : undefined,
          isActive: planForm.isActive,
        }),
      });
      setMessage(editingPlanId ? "Plan updated." : "Plan created.");
      setEditingPlanId(null);
      setPlanForm(emptyPlanForm);
      await loadPlans();
      setFormOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save plan.");
    } finally {
      setSaving(false);
    }
  }

  function editPlan(plan: StudentPlanConfig) {
    setEditingPlanId(plan.id);
    setPlanForm({
      name: plan.name,
      targetAudience: plan.target_audience ?? "",
      description: plan.description ?? "",
      durationMonths: String(plan.duration_months),
      baseAmount: String(plan.base_amount),
      defaultDiscountType: (plan.default_discount_type as DiscountType | null) ?? "",
      defaultDiscountValue: plan.default_discount_value ?? "",
      isActive: plan.is_active,
    });
    setFormOpen(true);
  }

  return (
    <div className="grid gap-4">
      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
      {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <DashboardCard title="Create student plan" subtitle="Reusable admission pricing, duration, and default discount setup.">
          <button
            type="button"
            onClick={() => {
              setEditingPlanId(null);
              setPlanForm(emptyPlanForm);
              setFormOpen(true);
            }}
            className="rounded-lg border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] px-4 py-3 text-sm font-bold text-[var(--lp-accent)]"
          >
            Create student admission plan
          </button>
        </DashboardCard>

        <FormDrawer
          open={formOpen}
          onClose={() => setFormOpen(false)}
          title={editingPlanId ? "Edit student admission plan" : "Create student admission plan"}
          description="Plan amount, duration, default discount, and active state appear in the admissions flow."
        >
          <form className="grid gap-3" onSubmit={savePlan}>
            <div className="grid gap-3 md:grid-cols-2">
              <input value={planForm.name} onChange={(event) => setPlanForm((current) => ({ ...current, name: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Plan name" />
              <input value={planForm.targetAudience} onChange={(event) => setPlanForm((current) => ({ ...current, targetAudience: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Target audience / label" />
            </div>
            <textarea value={planForm.description} onChange={(event) => setPlanForm((current) => ({ ...current, description: event.target.value }))} className="min-h-24 rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Description" />
            <div className="grid gap-3 md:grid-cols-2">
              <input type="number" min="1" value={planForm.durationMonths} onChange={(event) => setPlanForm((current) => ({ ...current, durationMonths: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Duration months" />
              <input type="number" min="0" value={planForm.baseAmount} onChange={(event) => setPlanForm((current) => ({ ...current, baseAmount: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Base amount" />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <select value={planForm.defaultDiscountType} onChange={(event) => setPlanForm((current) => ({ ...current, defaultDiscountType: event.target.value as DiscountType | "" }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none">
                <option value="">No default discount</option>
                <option value="PERCENTAGE">Percentage</option>
                <option value="FLAT">Flat</option>
              </select>
              <input type="number" min="0" value={planForm.defaultDiscountValue} onChange={(event) => setPlanForm((current) => ({ ...current, defaultDiscountValue: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Discount value" />
            </div>
            <label className="flex items-center gap-3 rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 text-sm font-medium text-[var(--lp-text)]">
              <input type="checkbox" checked={planForm.isActive} onChange={(event) => setPlanForm((current) => ({ ...current, isActive: event.target.checked }))} />
              Active for new admissions
            </label>
            <div className="rounded-lg border border-[var(--lp-border)] bg-[var(--lp-surface)] px-4 py-3 text-sm text-[var(--lp-text-soft)]">
              Final preview: <span className="font-semibold text-[var(--lp-text)]">Rs. {planPreview.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <button disabled={saving} className="rounded-lg border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--lp-accent)] disabled:opacity-60">
                {saving ? "Saving admission plan..." : editingPlanId ? "Update admission plan" : "Create admission plan"}
              </button>
              {editingPlanId ? (
                <button type="button" onClick={() => { setEditingPlanId(null); setPlanForm(emptyPlanForm); }} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--lp-text-soft)]">
                  Reset plan form
                </button>
              ) : null}
            </div>
          </form>
        </FormDrawer>

        <DashboardCard title="Saved plans" subtitle="These plans appear directly inside admissions.">
          <div className="grid gap-3">
            {loading ? <p className="text-sm text-[var(--lp-text-soft)]">Loading plans...</p> : null}
            {plans.map((plan) => (
              <div key={plan.id} className="rounded-lg border border-[var(--lp-border)] bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--lp-text)]">{plan.name}</p>
                    <p className="text-sm text-[var(--lp-text-soft)]">{plan.target_audience ?? "General admissions"} | {plan.duration_months} month(s)</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${plan.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {plan.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="mt-3 text-sm text-[var(--lp-text-soft)]">{plan.description ?? "No description added yet."}</p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--lp-text-soft)]">
                  <span>Base Rs. {Number(plan.base_amount).toLocaleString("en-IN")}</span>
                  <button type="button" onClick={() => editPlan(plan)} className="rounded-lg border border-[var(--lp-border)] bg-[var(--lp-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--lp-text)]">
                    Edit admission plan
                  </button>
                </div>
              </div>
            ))}
            {!loading && plans.length === 0 ? <p className="text-sm text-[var(--lp-text-soft)]">No plans created yet.</p> : null}
          </div>
        </DashboardCard>
      </div>
    </div>
  );
}
