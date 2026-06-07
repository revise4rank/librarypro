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
  plan_type?: "MONTHLY" | "DAY_WISE" | "SHIFT_HOURS";
  duration_months: number;
  duration_days?: number | null;
  shift_start_time?: string | null;
  shift_end_time?: string | null;
  allowed_hours?: string | null;
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
  planType: "MONTHLY" as "MONTHLY" | "DAY_WISE" | "SHIFT_HOURS",
  durationMonths: "1",
  durationDays: "",
  shiftStartTime: "",
  shiftEndTime: "",
  allowedHours: "",
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
  const activePlans = plans.filter((plan) => plan.is_active);
  const inactivePlans = plans.length - activePlans.length;
  const lowestPlanAmount = plans.reduce((min, plan) => {
    const amount = Number(plan.base_amount || "0");
    return min === 0 ? amount : Math.min(min, amount);
  }, 0);
  const longestDuration = plans.reduce((max, plan) => Math.max(max, Number(plan.duration_months || 0)), 0);

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
          planType: planForm.planType,
          durationMonths: Number(planForm.durationMonths || "1"),
          durationDays: planForm.durationDays ? Number(planForm.durationDays) : undefined,
          shiftStartTime: planForm.shiftStartTime || undefined,
          shiftEndTime: planForm.shiftEndTime || undefined,
          allowedHours: planForm.allowedHours ? Number(planForm.allowedHours) : undefined,
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
      planType: plan.plan_type ?? "MONTHLY",
      durationMonths: String(plan.duration_months),
      durationDays: plan.duration_days ? String(plan.duration_days) : "",
      shiftStartTime: plan.shift_start_time?.slice(0, 5) ?? "",
      shiftEndTime: plan.shift_end_time?.slice(0, 5) ?? "",
      allowedHours: plan.allowed_hours ? String(plan.allowed_hours) : "",
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
        <DashboardCard title="Plan performance desk" subtitle="Reusable admission pricing, duration, and discount setup.">
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-[var(--lp-border)] bg-white p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--lp-text-soft)]">Active</p>
                <p className="mt-2 text-2xl font-black text-[var(--lp-text)]">{activePlans.length}</p>
              </div>
              <div className="rounded-lg border border-[var(--lp-border)] bg-white p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--lp-text-soft)]">Inactive</p>
                <p className="mt-2 text-2xl font-black text-[var(--lp-text)]">{inactivePlans}</p>
              </div>
              <div className="rounded-lg border border-[var(--lp-border)] bg-white p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--lp-text-soft)]">Lowest fee</p>
                <p className="mt-2 text-2xl font-black text-[var(--lp-text)]">Rs. {lowestPlanAmount.toLocaleString("en-IN")}</p>
              </div>
              <div className="rounded-lg border border-[var(--lp-border)] bg-white p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--lp-text-soft)]">Longest</p>
                <p className="mt-2 text-2xl font-black text-[var(--lp-text)]">{longestDuration} mo</p>
              </div>
            </div>
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
          </div>
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
            <div className="grid gap-2 rounded-lg border border-[var(--lp-border)] bg-white p-3">
              <p className="text-xs font-black uppercase tracking-[0.08em] text-[var(--lp-text-soft)]">Plan type</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {(["MONTHLY", "DAY_WISE", "SHIFT_HOURS"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setPlanForm((current) => ({ ...current, planType: type }))}
                    className={`rounded-lg border px-3 py-2 text-left text-xs font-black ${planForm.planType === type ? "border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] text-[var(--lp-accent)]" : "border-[var(--lp-border)] bg-white text-[var(--lp-text-soft)]"}`}
                  >
                    {type === "MONTHLY" ? "Monthly" : type === "DAY_WISE" ? "Day-wise" : "Shift hours"}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <input type="number" min="1" value={planForm.durationMonths} onChange={(event) => setPlanForm((current) => ({ ...current, durationMonths: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Duration months" />
              <input type="number" min="0" value={planForm.baseAmount} onChange={(event) => setPlanForm((current) => ({ ...current, baseAmount: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Base amount" />
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <input type="number" min="1" value={planForm.durationDays} onChange={(event) => setPlanForm((current) => ({ ...current, durationDays: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Duration days" />
              <input type="time" value={planForm.shiftStartTime} onChange={(event) => setPlanForm((current) => ({ ...current, shiftStartTime: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" />
              <input type="time" value={planForm.shiftEndTime} onChange={(event) => setPlanForm((current) => ({ ...current, shiftEndTime: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" />
              <input type="number" min="1" step="0.5" value={planForm.allowedHours} onChange={(event) => setPlanForm((current) => ({ ...current, allowedHours: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Hours/day" />
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
