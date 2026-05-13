"use client";

import { useEffect, useState } from "react";
import { apiFetch, displayApiError } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";
import { FormDrawer } from "./form-drawer";
import { isPlanAccessMessage, PlanAccessNotice } from "./plan-access-notice";

type DiscountType = "PERCENTAGE" | "FLAT";

type StudentPlanConfig = {
  id: string;
  name: string;
};

type CouponConfig = {
  id: string;
  student_plan_id: string | null;
  code: string;
  discount_type: DiscountType;
  discount_value: string;
  valid_from: string | null;
  valid_until: string | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  created_at: string;
};

const emptyCouponForm = {
  code: "",
  studentPlanId: "",
  discountType: "PERCENTAGE" as DiscountType,
  discountValue: "",
  validFrom: "",
  validUntil: "",
  usageLimit: "",
  isActive: true,
};

export function OwnerCouponsManager() {
  const [plans, setPlans] = useState<StudentPlanConfig[]>([]);
  const [coupons, setCoupons] = useState<CouponConfig[]>([]);
  const [couponForm, setCouponForm] = useState(emptyCouponForm);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [plansResponse, couponsResponse] = await Promise.all([
        apiFetch<{ success: boolean; data: StudentPlanConfig[] }>("/owner/student-plans"),
        apiFetch<{ success: boolean; data: CouponConfig[] }>("/owner/coupons"),
      ]);
      setPlans(plansResponse.data);
      setCoupons(couponsResponse.data);
      setError(null);
    } catch (loadError) {
      setError(displayApiError(loadError, "Unable to load coupons."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function saveCoupon(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await apiFetch(editingCouponId ? `/owner/coupons/${editingCouponId}` : "/owner/coupons", {
        method: editingCouponId ? "PATCH" : "POST",
        body: JSON.stringify({
          code: couponForm.code,
          studentPlanId: couponForm.studentPlanId || undefined,
          discountType: couponForm.discountType,
          discountValue: Number(couponForm.discountValue || "0"),
          validFrom: couponForm.validFrom || undefined,
          validUntil: couponForm.validUntil || undefined,
          usageLimit: couponForm.usageLimit ? Number(couponForm.usageLimit) : undefined,
          isActive: couponForm.isActive,
        }),
      });
      setMessage(editingCouponId ? "Coupon updated." : "Coupon created.");
      setEditingCouponId(null);
      setCouponForm(emptyCouponForm);
      await loadData();
      setFormOpen(false);
    } catch (saveError) {
      setError(displayApiError(saveError, "Unable to save coupon."));
    } finally {
      setSaving(false);
    }
  }

  function editCoupon(coupon: CouponConfig) {
    setEditingCouponId(coupon.id);
    setCouponForm({
      code: coupon.code,
      studentPlanId: coupon.student_plan_id ?? "",
      discountType: coupon.discount_type,
      discountValue: coupon.discount_value,
      validFrom: coupon.valid_from ? coupon.valid_from.slice(0, 10) : "",
      validUntil: coupon.valid_until ? coupon.valid_until.slice(0, 10) : "",
      usageLimit: coupon.usage_limit ? String(coupon.usage_limit) : "",
      isActive: coupon.is_active,
    });
    setFormOpen(true);
  }

  return (
    <div className="grid gap-4">
      {error ? isPlanAccessMessage(error) ? <PlanAccessNotice message={error} /> : <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
      {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <DashboardCard title="Create coupon" subtitle="Admission coupons stay separate from owner plans and marketing offers.">
          <button
            type="button"
            onClick={() => {
              setEditingCouponId(null);
              setCouponForm(emptyCouponForm);
              setFormOpen(true);
            }}
            className="rounded-lg border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] px-4 py-3 text-sm font-bold text-[var(--lp-accent)]"
          >
            Create admission coupon
          </button>
        </DashboardCard>

        <FormDrawer
          open={formOpen}
          onClose={() => setFormOpen(false)}
          title={editingCouponId ? "Edit admission coupon" : "Create admission coupon"}
          description="Coupons are applied during admission checkout and stay separate from public marketing offers."
        >
          <form className="grid gap-3" onSubmit={saveCoupon}>
            <div className="grid gap-3 md:grid-cols-2">
              <input value={couponForm.code} onChange={(event) => setCouponForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Coupon code" />
              <select value={couponForm.studentPlanId} onChange={(event) => setCouponForm((current) => ({ ...current, studentPlanId: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none">
                <option value="">All plans</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>{plan.name}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <select value={couponForm.discountType} onChange={(event) => setCouponForm((current) => ({ ...current, discountType: event.target.value as DiscountType }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none">
                <option value="PERCENTAGE">Percentage</option>
                <option value="FLAT">Flat</option>
              </select>
              <input type="number" min="0" value={couponForm.discountValue} onChange={(event) => setCouponForm((current) => ({ ...current, discountValue: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Discount value" />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <input type="date" value={couponForm.validFrom} onChange={(event) => setCouponForm((current) => ({ ...current, validFrom: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" />
              <input type="date" value={couponForm.validUntil} onChange={(event) => setCouponForm((current) => ({ ...current, validUntil: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" />
              <input type="number" min="1" value={couponForm.usageLimit} onChange={(event) => setCouponForm((current) => ({ ...current, usageLimit: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Usage limit" />
            </div>
            <label className="flex items-center gap-3 rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 text-sm font-medium text-[var(--lp-text)]">
              <input type="checkbox" checked={couponForm.isActive} onChange={(event) => setCouponForm((current) => ({ ...current, isActive: event.target.checked }))} />
              Coupon is active
            </label>
            <div className="flex flex-wrap gap-3">
              <button disabled={saving} className="rounded-lg border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--lp-accent)] disabled:opacity-60">
                {saving ? "Saving admission coupon..." : editingCouponId ? "Update admission coupon" : "Create admission coupon"}
              </button>
              {editingCouponId ? (
                <button type="button" onClick={() => { setEditingCouponId(null); setCouponForm(emptyCouponForm); }} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--lp-text-soft)]">
                  Reset coupon form
                </button>
              ) : null}
            </div>
          </form>
        </FormDrawer>

        <DashboardCard title="Coupon bank" subtitle="Codes created here are available in admission checkout.">
          <div className="grid gap-3">
            {loading ? <p className="text-sm text-[var(--lp-text-soft)]">Loading coupons...</p> : null}
            {coupons.map((coupon) => (
              <div key={coupon.id} className="rounded-lg border border-[var(--lp-border)] bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--lp-text)]">{coupon.code}</p>
                    <p className="text-sm text-[var(--lp-text-soft)]">{coupon.discount_type} | {coupon.discount_value}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${coupon.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {coupon.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="mt-3 text-sm text-[var(--lp-text-soft)]">
                  Used {coupon.used_count}{coupon.usage_limit ? ` / ${coupon.usage_limit}` : ""} times
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--lp-text-soft)]">
                  <span>{coupon.valid_until ? `Valid till ${new Date(coupon.valid_until).toLocaleDateString()}` : "No expiry"}</span>
                  <button type="button" onClick={() => editCoupon(coupon)} className="rounded-lg border border-[var(--lp-border)] bg-[var(--lp-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--lp-text)]">
                    Edit coupon
                  </button>
                </div>
              </div>
            ))}
            {!loading && coupons.length === 0 ? <p className="text-sm text-[var(--lp-text-soft)]">No coupons created yet.</p> : null}
          </div>
        </DashboardCard>
      </div>
    </div>
  );
}
