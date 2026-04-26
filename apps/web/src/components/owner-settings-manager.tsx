"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { apiFetch, clearClientSession, logoutSession, saveSession, type SessionState, type SessionUser } from "../lib/api";
import { OwnerAdminsManager } from "./owner-admins-manager";
import { DashboardCard } from "./dashboard-shell";
import { OwnerWebsiteBuilder } from "./owner-website-builder";

type SettingsResponse = {
  success: boolean;
  data: {
    library_id: string;
    library_name: string;
    address: string;
    city: string;
    area: string | null;
    wifi_name: string | null;
    wifi_password: string | null;
    notice_message: string | null;
    allow_offline_checkin: boolean;
    qr_key_id: string;
    qr_payload: string;
    subscription_plan: string | null;
    subscription_status: string | null;
    renewal_date: string | null;
  };
};

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

export type OwnerSettingsTab = "profile" | "plans" | "account" | "website" | "team" | "billing";

const settingsTabs: Array<{ id: OwnerSettingsTab; label: string; summary: string }> = [
  { id: "profile", label: "Library Setup", summary: "Core library profile, QR access, WiFi, and notices." },
  { id: "plans", label: "Plans & Coupons", summary: "Reusable admission plans, pricing overrides, and coupon rules." },
  { id: "account", label: "Account", summary: "Personal profile, password, and current session controls." },
  { id: "website", label: "Website", summary: "Public site editing and publishing inside the same setup desk." },
  { id: "team", label: "Team", summary: "Head admin access, permissions, and audit visibility." },
  { id: "billing", label: "Billing", summary: "Subscription plan, renewal state, and payment visibility." },
];

const settingsGroups: Array<{
  id: "setup" | "pricing" | "account" | "team" | "billing";
  label: string;
  summary: string;
  tabs: OwnerSettingsTab[];
}> = [
  { id: "setup", label: "Library Setup", summary: "Core library identity, QR access, and public website controls.", tabs: ["profile", "website"] },
  { id: "pricing", label: "Plans & Coupons", summary: "Admission pricing, reusable plans, and coupon rules.", tabs: ["plans"] },
  { id: "account", label: "Account", summary: "Owner profile, password, and session controls.", tabs: ["account"] },
  { id: "team", label: "Team", summary: "Admin access and operator permissions.", tabs: ["team"] },
  { id: "billing", label: "Billing", summary: "Subscription state and renewals.", tabs: ["billing"] },
];

function getSettingsGroupForTab(tab: OwnerSettingsTab) {
  return settingsGroups.find((group) => group.tabs.includes(tab)) ?? settingsGroups[0];
}

function buildQrImageUrl(payload: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=12&data=${encodeURIComponent(payload)}`;
}

function SettingsTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[0.5rem] border px-4 py-2 text-sm font-semibold transition ${
        active
          ? "border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] text-[var(--lp-accent)]"
          : "border-[var(--lp-border)] bg-white text-[var(--lp-text-soft)]"
      }`}
    >
      {children}
    </button>
  );
}

function computePreviewAmount(baseAmount: string, discountType: DiscountType | "", discountValue: string) {
  const base = Number(baseAmount || "0");
  const discount = Number(discountValue || "0");
  if (!base || !discountType || !discount) {
    return base;
  }
  if (discountType === "PERCENTAGE") {
    return Math.max(0, base - Math.round((base * discount) / 100));
  }
  return Math.max(0, base - discount);
}

export function OwnerSettingsManager({ initialTab = "profile" }: { initialTab?: OwnerSettingsTab }) {
  const [activeTab, setActiveTab] = useState<OwnerSettingsTab>(initialTab);
  const [data, setData] = useState<SettingsResponse["data"] | null>(null);
  const [plans, setPlans] = useState<StudentPlanConfig[]>([]);
  const [coupons, setCoupons] = useState<CouponConfig[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [accountSaving, setAccountSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [planSaving, setPlanSaving] = useState(false);
  const [couponSaving, setCouponSaving] = useState(false);
  const [account, setAccount] = useState<SessionUser | null>(null);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [form, setForm] = useState({
    libraryName: "",
    address: "",
    city: "",
    area: "",
    wifiName: "",
    wifiPassword: "",
    noticeMessage: "",
    allowOfflineCheckin: true,
  });
  const [accountForm, setAccountForm] = useState({
    fullName: "",
    email: "",
    phone: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    nextPassword: "",
  });
  const [planForm, setPlanForm] = useState({
    name: "",
    targetAudience: "",
    description: "",
    durationMonths: "1",
    baseAmount: "999",
    defaultDiscountType: "" as DiscountType | "",
    defaultDiscountValue: "",
    isActive: true,
  });
  const [couponForm, setCouponForm] = useState({
    code: "",
    studentPlanId: "",
    discountType: "PERCENTAGE" as DiscountType,
    discountValue: "",
    validFrom: "",
    validUntil: "",
    usageLimit: "",
    isActive: true,
  });

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const session = typeof window !== "undefined" ? window.sessionStorage.getItem("nextlib_session") : null;
    if (!session) return;

    try {
      const parsed = JSON.parse(session) as SessionState;
      setAccount(parsed.user);
      setAccountForm({
        fullName: parsed.user.fullName ?? "",
        email: parsed.user.email ?? "",
        phone: parsed.user.phone ?? "",
      });
    } catch {
      // Ignore invalid cache.
    }
  }, []);

  async function loadSettings() {
    try {
      const [settingsResponse, plansResponse, couponsResponse] = await Promise.all([
        apiFetch<SettingsResponse>("/owner/settings"),
        apiFetch<{ success: boolean; data: StudentPlanConfig[] }>("/owner/student-plans"),
        apiFetch<{ success: boolean; data: CouponConfig[] }>("/owner/coupons"),
      ]);
      setData(settingsResponse.data);
      setPlans(plansResponse.data);
      setCoupons(couponsResponse.data);
      setForm({
        libraryName: settingsResponse.data.library_name,
        address: settingsResponse.data.address,
        city: settingsResponse.data.city,
        area: settingsResponse.data.area ?? "",
        wifiName: settingsResponse.data.wifi_name ?? "",
        wifiPassword: settingsResponse.data.wifi_password ?? "",
        noticeMessage: settingsResponse.data.notice_message ?? "",
        allowOfflineCheckin: settingsResponse.data.allow_offline_checkin,
      });
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load settings.");
    }
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await apiFetch<SettingsResponse>("/owner/settings", {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      setData(response.data);
      setMessage("Settings updated successfully.");
      setError(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save settings.");
    } finally {
      setSaving(false);
    }
  }

  async function regenerateQr() {
    try {
      await apiFetch("/owner/settings/regenerate-qr", { method: "POST" });
      setMessage("Library QR key regenerated.");
      await loadSettings();
    } catch (regenerateError) {
      setError(regenerateError instanceof Error ? regenerateError.message : "Unable to regenerate QR.");
    }
  }

  async function saveAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccountSaving(true);
    try {
      const response = await apiFetch<{ success: boolean; data: SessionUser & { csrfToken?: string } }>("/auth/me", {
        method: "PATCH",
        body: JSON.stringify(accountForm),
      });
      const nextSession = {
        user: {
          id: response.data.id,
          fullName: response.data.fullName,
          email: response.data.email,
          phone: response.data.phone,
          studentCode: response.data.studentCode,
          role: response.data.role,
          libraryIds: response.data.libraryIds,
        },
        csrfToken: response.data.csrfToken,
      } satisfies SessionState;
      saveSession(nextSession);
      setAccount(nextSession.user);
      setMessage("Account profile updated.");
      setError(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update account.");
    } finally {
      setAccountSaving(false);
    }
  }

  async function updatePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordSaving(true);
    try {
      await apiFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify(passwordForm),
      });
      await logoutSession();
      clearClientSession();
      window.location.href = "/owner/login";
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to change password.");
    } finally {
      setPasswordSaving(false);
    }
  }

  async function savePlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPlanSaving(true);
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
      setPlanForm({
        name: "",
        targetAudience: "",
        description: "",
        durationMonths: "1",
        baseAmount: "999",
        defaultDiscountType: "",
        defaultDiscountValue: "",
        isActive: true,
      });
      await loadSettings();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save plan.");
    } finally {
      setPlanSaving(false);
    }
  }

  async function saveCoupon(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCouponSaving(true);
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
      setCouponForm({
        code: "",
        studentPlanId: "",
        discountType: "PERCENTAGE",
        discountValue: "",
        validFrom: "",
        validUntil: "",
        usageLimit: "",
        isActive: true,
      });
      await loadSettings();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save coupon.");
    } finally {
      setCouponSaving(false);
    }
  }

  const planPreview = useMemo(
    () => computePreviewAmount(planForm.baseAmount, planForm.defaultDiscountType, planForm.defaultDiscountValue),
    [planForm.baseAmount, planForm.defaultDiscountType, planForm.defaultDiscountValue],
  );

  if (!data) {
    return <p className="text-sm text-slate-500">{error ?? "Loading owner settings..."}</p>;
  }

  const activeConfig = settingsTabs.find((tab) => tab.id === activeTab) ?? settingsTabs[0];
  const activeGroup = getSettingsGroupForTab(activeTab);
  const visibleTabs = settingsTabs.filter((tab) => activeGroup.tabs.includes(tab.id));

  return (
    <div className="grid gap-4">
      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
      {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}

      <DashboardCard title="Settings hub" subtitle="Keep setup, pricing, account, team, and billing inside one owner workspace.">
        <div className="grid gap-4">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
            {settingsGroups.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => setActiveTab(group.tabs[0])}
                className={`rounded-[0.75rem] border px-3 py-3 text-left transition ${
                  activeGroup.id === group.id
                    ? "border-[var(--lp-accent-soft)] bg-[var(--lp-accent-soft)]/45"
                    : "border-[var(--lp-border)] bg-white"
                }`}
              >
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--lp-accent)]">{group.label}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--lp-text-soft)]">{group.summary}</p>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {visibleTabs.map((tab) => (
              <SettingsTabButton key={tab.id} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}>
                {tab.label}
              </SettingsTabButton>
            ))}
          </div>
          <p className="text-sm leading-6 text-[var(--lp-muted)]">
            {visibleTabs.length > 1 ? `${activeGroup.summary} Open ${activeConfig.label.toLowerCase()} below.` : activeConfig.summary}
          </p>
        </div>
      </DashboardCard>

      {activeTab === "profile" ? (
        <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <DashboardCard title="Library profile" subtitle="Basic customer-facing information and operational defaults.">
            <form className="grid gap-3" onSubmit={saveSettings}>
              <input value={form.libraryName} onChange={(event) => setForm((current) => ({ ...current, libraryName: event.target.value }))} className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Library name" />
              <input value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Address" />
              <div className="grid gap-3 md:grid-cols-2">
                <input value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="City" />
                <input value={form.area} onChange={(event) => setForm((current) => ({ ...current, area: event.target.value }))} className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Area / Locality" />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <input value={form.wifiName} onChange={(event) => setForm((current) => ({ ...current, wifiName: event.target.value }))} className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="WiFi name" />
                <input value={form.wifiPassword} onChange={(event) => setForm((current) => ({ ...current, wifiPassword: event.target.value }))} className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="WiFi password" />
              </div>
              <textarea value={form.noticeMessage} onChange={(event) => setForm((current) => ({ ...current, noticeMessage: event.target.value }))} className="min-h-28 rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Notice message" />
              <label className="flex items-center gap-3 rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 text-sm font-medium text-[var(--lp-text)]">
                <input
                  type="checkbox"
                  checked={form.allowOfflineCheckin}
                  onChange={(event) => setForm((current) => ({ ...current, allowOfflineCheckin: event.target.checked }))}
                />
                Allow offline QR sync
              </label>
              <button disabled={saving} className="rounded-[0.5rem] border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--lp-accent)] disabled:opacity-60">
                {saving ? "Saving..." : "Save settings"}
              </button>
            </form>
          </DashboardCard>

          <DashboardCard title="QR access" subtitle="Library-level QR validation state and entry image.">
            <div className="grid gap-3 text-sm text-[var(--lp-text-soft)]">
              <div className="overflow-hidden rounded-[0.5rem] border border-[var(--lp-border)] bg-white p-4">
                <img
                  src={buildQrImageUrl(data.qr_payload)}
                  alt={`${data.library_name} library QR`}
                  className="mx-auto h-52 w-52 rounded-[0.5rem] bg-white object-cover"
                />
              </div>
              <p>Active QR key: <span className="font-semibold text-[var(--lp-text)]">{data.qr_key_id}</span></p>
              <p>Offline check-in: <span className="font-semibold text-[var(--lp-text)]">{data.allow_offline_checkin ? "Enabled" : "Disabled"}</span></p>
              <button onClick={() => void regenerateQr()} className="rounded-[0.5rem] border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--lp-accent)]">
                Regenerate QR key
              </button>
            </div>
          </DashboardCard>
        </div>
      ) : null}

      {activeTab === "plans" ? (
        <div className="grid gap-4">
          <div className="grid gap-4 xl:grid-cols-2">
            <DashboardCard title="Student plans" subtitle="Create reusable pricing and duration templates before admitting students.">
              <form className="grid gap-3" onSubmit={savePlan}>
                <div className="grid gap-3 md:grid-cols-2">
                  <input value={planForm.name} onChange={(event) => setPlanForm((current) => ({ ...current, name: event.target.value }))} className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Plan name" />
                  <input value={planForm.targetAudience} onChange={(event) => setPlanForm((current) => ({ ...current, targetAudience: event.target.value }))} className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Target audience / label" />
                </div>
                <textarea value={planForm.description} onChange={(event) => setPlanForm((current) => ({ ...current, description: event.target.value }))} className="min-h-24 rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Description" />
                <div className="grid gap-3 md:grid-cols-2">
                  <input type="number" min="1" value={planForm.durationMonths} onChange={(event) => setPlanForm((current) => ({ ...current, durationMonths: event.target.value }))} className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Duration (months)" />
                  <input type="number" min="0" value={planForm.baseAmount} onChange={(event) => setPlanForm((current) => ({ ...current, baseAmount: event.target.value }))} className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Base amount" />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <select value={planForm.defaultDiscountType} onChange={(event) => setPlanForm((current) => ({ ...current, defaultDiscountType: event.target.value as DiscountType | "" }))} className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none">
                    <option value="">No default discount</option>
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FLAT">Flat</option>
                  </select>
                  <input type="number" min="0" value={planForm.defaultDiscountValue} onChange={(event) => setPlanForm((current) => ({ ...current, defaultDiscountValue: event.target.value }))} className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Discount value" />
                </div>
                <label className="flex items-center gap-3 rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 text-sm font-medium text-[var(--lp-text)]">
                  <input type="checkbox" checked={planForm.isActive} onChange={(event) => setPlanForm((current) => ({ ...current, isActive: event.target.checked }))} />
                  Active for new admissions
                </label>
                <div className="rounded-[0.5rem] border border-[var(--lp-border)] bg-[var(--lp-surface)] px-4 py-3 text-sm text-[var(--lp-text-soft)]">
                  Final preview: <span className="font-semibold text-[var(--lp-text)]">Rs. {planPreview.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button disabled={planSaving} className="rounded-[0.5rem] border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--lp-accent)] disabled:opacity-60">
                    {planSaving ? "Saving..." : editingPlanId ? "Update plan" : "Create plan"}
                  </button>
                  {editingPlanId ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPlanId(null);
                        setPlanForm({
                          name: "",
                          targetAudience: "",
                          description: "",
                          durationMonths: "1",
                          baseAmount: "999",
                          defaultDiscountType: "",
                          defaultDiscountValue: "",
                          isActive: true,
                        });
                      }}
                      className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--lp-text-soft)]"
                    >
                      Reset
                    </button>
                  ) : null}
                </div>
              </form>
            </DashboardCard>

            <DashboardCard title="Coupons" subtitle="Optional one-code discounts for admissions. Keep them separate from marketing offers.">
              <form className="grid gap-3" onSubmit={saveCoupon}>
                <div className="grid gap-3 md:grid-cols-2">
                  <input value={couponForm.code} onChange={(event) => setCouponForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Coupon code" />
                  <select value={couponForm.studentPlanId} onChange={(event) => setCouponForm((current) => ({ ...current, studentPlanId: event.target.value }))} className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none">
                    <option value="">All plans</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>{plan.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <select value={couponForm.discountType} onChange={(event) => setCouponForm((current) => ({ ...current, discountType: event.target.value as DiscountType }))} className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none">
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FLAT">Flat</option>
                  </select>
                  <input type="number" min="0" value={couponForm.discountValue} onChange={(event) => setCouponForm((current) => ({ ...current, discountValue: event.target.value }))} className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Discount value" />
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <input type="date" value={couponForm.validFrom} onChange={(event) => setCouponForm((current) => ({ ...current, validFrom: event.target.value }))} className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" />
                  <input type="date" value={couponForm.validUntil} onChange={(event) => setCouponForm((current) => ({ ...current, validUntil: event.target.value }))} className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" />
                  <input type="number" min="1" value={couponForm.usageLimit} onChange={(event) => setCouponForm((current) => ({ ...current, usageLimit: event.target.value }))} className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Usage limit" />
                </div>
                <label className="flex items-center gap-3 rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 text-sm font-medium text-[var(--lp-text)]">
                  <input type="checkbox" checked={couponForm.isActive} onChange={(event) => setCouponForm((current) => ({ ...current, isActive: event.target.checked }))} />
                  Coupon is active
                </label>
                <div className="flex flex-wrap gap-3">
                  <button disabled={couponSaving} className="rounded-[0.5rem] border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--lp-accent)] disabled:opacity-60">
                    {couponSaving ? "Saving..." : editingCouponId ? "Update coupon" : "Create coupon"}
                  </button>
                  {editingCouponId ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCouponId(null);
                        setCouponForm({
                          code: "",
                          studentPlanId: "",
                          discountType: "PERCENTAGE",
                          discountValue: "",
                          validFrom: "",
                          validUntil: "",
                          usageLimit: "",
                          isActive: true,
                        });
                      }}
                      className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--lp-text-soft)]"
                    >
                      Reset
                    </button>
                  ) : null}
                </div>
              </form>
            </DashboardCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <DashboardCard title="Saved plans" subtitle="These plans appear directly inside admissions.">
              <div className="grid gap-3">
                {plans.map((plan) => (
                  <div key={plan.id} className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[var(--lp-text)]">{plan.name}</p>
                        <p className="text-sm text-[var(--lp-text-soft)]">{plan.target_audience ?? "General admissions"} • {plan.duration_months} month(s)</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${plan.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {plan.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-[var(--lp-text-soft)]">{plan.description ?? "No description added yet."}</p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--lp-text-soft)]">
                      <span>Base Rs. {Number(plan.base_amount).toLocaleString("en-IN")}</span>
                      <button
                        type="button"
                        onClick={() => {
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
                        }}
                        className="rounded-[0.5rem] border border-[var(--lp-border)] bg-[var(--lp-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--lp-text)]"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
                {plans.length === 0 ? <p className="text-sm text-[var(--lp-text-soft)]">No plans created yet.</p> : null}
              </div>
            </DashboardCard>

            <DashboardCard title="Coupon bank" subtitle="One coupon code per admission in v1.">
              <div className="grid gap-3">
                {coupons.map((coupon) => (
                  <div key={coupon.id} className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[var(--lp-text)]">{coupon.code}</p>
                        <p className="text-sm text-[var(--lp-text-soft)]">{coupon.discount_type} • {coupon.discount_value}</p>
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
                      <button
                        type="button"
                        onClick={() => {
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
                        }}
                        className="rounded-[0.5rem] border border-[var(--lp-border)] bg-[var(--lp-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--lp-text)]"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
                {coupons.length === 0 ? <p className="text-sm text-[var(--lp-text-soft)]">No coupons created yet.</p> : null}
              </div>
            </DashboardCard>
          </div>
        </div>
      ) : null}

      {activeTab === "account" ? (
        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <DashboardCard title="Account profile" subtitle="Update your own name, email, and phone from one place.">
            <form className="grid gap-3" onSubmit={saveAccount}>
              <input value={accountForm.fullName} onChange={(event) => setAccountForm((current) => ({ ...current, fullName: event.target.value }))} className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Full name" />
              <input value={accountForm.email} onChange={(event) => setAccountForm((current) => ({ ...current, email: event.target.value }))} className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Email" />
              <input value={accountForm.phone} onChange={(event) => setAccountForm((current) => ({ ...current, phone: event.target.value }))} className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Phone" />
              <button disabled={accountSaving} className="rounded-[0.5rem] border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--lp-accent)] disabled:opacity-60">
                {accountSaving ? "Saving..." : "Save account profile"}
              </button>
            </form>
          </DashboardCard>

          <div className="grid gap-4">
            <DashboardCard title="Security" subtitle="Password updates will sign you out on success for safety.">
              <form className="grid gap-3" onSubmit={updatePassword}>
                <input type="password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))} className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Current password" />
                <input type="password" value={passwordForm.nextPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, nextPassword: event.target.value }))} className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="New password" />
                <button disabled={passwordSaving} className="rounded-[0.5rem] border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--lp-accent)] disabled:opacity-60">
                  {passwordSaving ? "Updating..." : "Change password"}
                </button>
              </form>
            </DashboardCard>

            <DashboardCard title="Current session" subtitle="Quick identity summary and safe logout.">
              <div className="grid gap-3 text-sm text-[var(--lp-text-soft)]">
                <p>Name: <span className="font-semibold text-[var(--lp-text)]">{account?.fullName ?? "-"}</span></p>
                <p>Email: <span className="font-semibold text-[var(--lp-text)]">{account?.email ?? "-"}</span></p>
                <p>Phone: <span className="font-semibold text-[var(--lp-text)]">{account?.phone ?? "-"}</span></p>
                <p>Role: <span className="font-semibold text-[var(--lp-text)]">{account?.role ?? "-"}</span></p>
                <button
                  type="button"
                  onClick={async () => {
                    await logoutSession();
                    clearClientSession();
                    window.location.href = "/owner/login";
                  }}
                  className="inline-flex w-fit rounded-[0.5rem] border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700"
                >
                  Logout
                </button>
              </div>
            </DashboardCard>
          </div>
        </div>
      ) : null}

      {activeTab === "website" ? (
        <OwnerWebsiteBuilder
          defaultEditorOpen
          initialValues={{
            subdomain: "",
            brandLogoUrl: "",
            heroBannerUrl: "",
            heroTitle: "",
            heroTagline: "",
            aboutText: "",
            contactName: "",
            contactPhone: "",
            whatsappPhone: "",
            addressText: "",
            landmark: "",
            businessHours: "",
            highlightOffer: "",
            offerExpiresAt: "",
            seoTitle: "",
            seoDescription: "",
            adBudget: "0",
            themePrimary: "#d2723d",
            themeAccent: "#2f8f88",
            themeSurface: "#fff9f0",
            amenities: [],
            galleryImages: [],
            published: false,
          }}
        />
      ) : null}

      {activeTab === "team" ? <OwnerAdminsManager /> : null}

      {activeTab === "billing" ? (
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <DashboardCard title="Subscription status" subtitle="Platform plan and renewal state.">
            <div className="grid gap-3 text-sm text-[var(--lp-text-soft)]">
              <p>Current plan: <span className="font-semibold text-[var(--lp-text)]">{data.subscription_plan ?? "No active plan"}</span></p>
              <p>Status: <span className="font-semibold text-[var(--lp-text)]">{data.subscription_status ?? "-"}</span></p>
              <p>Renewal date: <span className="font-semibold text-[var(--lp-text)]">{data.renewal_date ?? "-"}</span></p>
              <Link href="/owner/billing" className="inline-flex w-fit rounded-[0.5rem] border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--lp-accent)]">
                Open renew plan flow
              </Link>
            </div>
          </DashboardCard>

          <DashboardCard title="Settings summary" subtitle="One place for pricing, profile, website, team, and renewal actions.">
            <div className="grid gap-3 text-sm leading-6 text-[var(--lp-text-soft)]">
              <p>Use profile for WiFi, notices, and QR behavior.</p>
              <p>Use Plans & Coupons to define reusable pricing before admissions.</p>
              <p>Use website for public publishing and team for permissions and audit review.</p>
              <p>Renewal state stays visible here so setup and billing never feel disconnected.</p>
            </div>
          </DashboardCard>
        </div>
      ) : null}
    </div>
  );
}
