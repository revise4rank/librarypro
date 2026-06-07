"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { apiFetch, clearClientSession, logoutSession, saveSession, type SessionState, type SessionUser } from "../lib/api";
import { buildQrImageUrl } from "../lib/branded-qr";
import { OwnerAdminsManager } from "./owner-admins-manager";
import { DashboardCard } from "./dashboard-shell";

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

type OwnerPublicProfileResponse = {
  success: boolean;
  data: {
    contact_name: string | null;
    contact_phone: string | null;
    whatsapp_phone: string | null;
    allow_direct_contact: boolean;
  } | null;
};

export type OwnerSettingsTab = "profile" | "account" | "team" | "billing";

function normalizeSettingsTab(tab: OwnerSettingsTab): OwnerSettingsTab {
  return tab;
}

const settingsTabs: Array<{ id: OwnerSettingsTab; label: string; summary: string }> = [
  { id: "profile", label: "Library Setup", summary: "Core library profile, QR access, WiFi, and notices." },
  { id: "account", label: "Account", summary: "Personal profile, password, and current session controls." },
  { id: "team", label: "Team", summary: "Head admin access, permissions, and audit visibility." },
  { id: "billing", label: "Billing", summary: "Subscription plan, renewal state, and payment visibility." },
];

const settingsGroups: Array<{
  id: "setup" | "account" | "team" | "billing";
  label: string;
  summary: string;
  tabs: OwnerSettingsTab[];
}> = [
  { id: "setup", label: "Library Setup", summary: "Core library identity, QR access, WiFi, and operating defaults.", tabs: ["profile"] },
  { id: "account", label: "Account", summary: "Owner profile, password, and session controls.", tabs: ["account"] },
  { id: "team", label: "Team", summary: "Admin access and operator permissions.", tabs: ["team"] },
  { id: "billing", label: "Billing", summary: "Subscription state and renewals.", tabs: ["billing"] },
];

function getSettingsGroupForTab(tab: OwnerSettingsTab) {
  return settingsGroups.find((group) => group.tabs.includes(tab)) ?? settingsGroups[0];
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
      className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
        active
          ? "border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] text-[var(--lp-accent)]"
          : "border-[var(--lp-border)] bg-white text-[var(--lp-text-soft)]"
      }`}
    >
      {children}
    </button>
  );
}

export function OwnerSettingsManager({ initialTab = "profile" }: { initialTab?: OwnerSettingsTab }) {
  const [activeTab, setActiveTab] = useState<OwnerSettingsTab>(normalizeSettingsTab(initialTab));
  const [data, setData] = useState<SettingsResponse["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publicContactSaving, setPublicContactSaving] = useState(false);
  const [accountSaving, setAccountSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [account, setAccount] = useState<SessionUser | null>(null);
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
  const [publicContactForm, setPublicContactForm] = useState({
    contactName: "",
    contactPhone: "",
    whatsappPhone: "",
    allowDirectContact: true,
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
  useEffect(() => {
    setActiveTab(normalizeSettingsTab(initialTab));
  }, [initialTab]);

  useEffect(() => {
    const session = typeof window !== "undefined" ? window.sessionStorage.getItem("booklib_session") : null;
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
      const [settingsResponse, publicProfileResponse] = await Promise.all([
        apiFetch<SettingsResponse>("/owner/settings"),
        apiFetch<OwnerPublicProfileResponse>("/owner/public-profile").catch(() => null),
      ]);
      setData(settingsResponse.data);
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
      setPublicContactForm({
        contactName: publicProfileResponse?.data?.contact_name ?? settingsResponse.data.library_name,
        contactPhone: publicProfileResponse?.data?.contact_phone ?? "",
        whatsappPhone: publicProfileResponse?.data?.whatsapp_phone ?? "",
        allowDirectContact: publicProfileResponse?.data?.allow_direct_contact ?? true,
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

  async function savePublicContact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPublicContactSaving(true);
    try {
      const response = await apiFetch<OwnerPublicProfileResponse>("/owner/public-profile/contact", {
        method: "PATCH",
        body: JSON.stringify(publicContactForm),
      });
      setPublicContactForm({
        contactName: response.data?.contact_name ?? publicContactForm.contactName,
        contactPhone: response.data?.contact_phone ?? publicContactForm.contactPhone,
        whatsappPhone: response.data?.whatsapp_phone ?? publicContactForm.whatsappPhone,
        allowDirectContact: response.data?.allow_direct_contact ?? publicContactForm.allowDirectContact,
      });
      setMessage("Public contact updated for marketplace and subdomain website.");
      setError(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save public contact.");
    } finally {
      setPublicContactSaving(false);
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
                className={`rounded-lg border px-3 py-3 text-left transition ${
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

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          { href: "/owner/plans", label: "Open admission plans", detail: "Create and edit pricing plans on the dedicated page." },
          { href: "/owner/coupons", label: "Open coupons", detail: "Manage discount codes without duplicating settings." },
          { href: "/owner/listing", label: "Open marketplace listing", detail: "Edit public listing media and discovery content." },
          { href: "/owner/website", label: "Open website builder", detail: "Customize public pages and subdomain content." },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="rounded-lg border border-[var(--lp-border)] bg-white p-4 transition hover:border-[var(--lp-accent-soft)] hover:bg-[var(--lp-accent-soft)]/25">
            <p className="text-sm font-black text-[var(--lp-text)]">{item.label}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--lp-text-soft)]">{item.detail}</p>
          </Link>
        ))}
      </section>

      {activeTab === "profile" ? (
        <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <DashboardCard title="Library profile" subtitle="Basic customer-facing information and operational defaults.">
            <form className="grid gap-3" onSubmit={saveSettings}>
              <input value={form.libraryName} onChange={(event) => setForm((current) => ({ ...current, libraryName: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Library name" />
              <input value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Address" />
              <div className="grid gap-3 md:grid-cols-2">
                <input value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="City" />
                <input value={form.area} onChange={(event) => setForm((current) => ({ ...current, area: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Area / Locality" />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <input value={form.wifiName} onChange={(event) => setForm((current) => ({ ...current, wifiName: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="WiFi name" />
                <input value={form.wifiPassword} onChange={(event) => setForm((current) => ({ ...current, wifiPassword: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="WiFi password" />
              </div>
              <textarea value={form.noticeMessage} onChange={(event) => setForm((current) => ({ ...current, noticeMessage: event.target.value }))} className="min-h-28 rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Notice message" />
              <label className="flex items-center gap-3 rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 text-sm font-medium text-[var(--lp-text)]">
                <input
                  type="checkbox"
                  checked={form.allowOfflineCheckin}
                  onChange={(event) => setForm((current) => ({ ...current, allowOfflineCheckin: event.target.checked }))}
                />
                Allow offline QR sync
              </label>
              <button disabled={saving} className="rounded-lg border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--lp-accent)] disabled:opacity-60">
                {saving ? "Saving..." : "Save settings"}
              </button>
            </form>
          </DashboardCard>

          <div className="grid gap-4">
            <DashboardCard title="Public contact" subtitle="This appears on your subdomain website and marketplace contact actions.">
              <form className="grid gap-3" onSubmit={savePublicContact}>
                <input
                  value={publicContactForm.contactName}
                  onChange={(event) => setPublicContactForm((current) => ({ ...current, contactName: event.target.value }))}
                  className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none"
                  placeholder="Contact person"
                />
                <input
                  value={publicContactForm.contactPhone}
                  onChange={(event) => setPublicContactForm((current) => ({ ...current, contactPhone: event.target.value }))}
                  className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none"
                  placeholder="Public call number"
                />
                <input
                  value={publicContactForm.whatsappPhone}
                  onChange={(event) => setPublicContactForm((current) => ({ ...current, whatsappPhone: event.target.value }))}
                  className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none"
                  placeholder="Public WhatsApp number"
                />
                <label className="flex items-center gap-3 rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 text-sm font-medium text-[var(--lp-text)]">
                  <input
                    type="checkbox"
                    checked={publicContactForm.allowDirectContact}
                    onChange={(event) => setPublicContactForm((current) => ({ ...current, allowDirectContact: event.target.checked }))}
                  />
                  Allow public contact buttons and WhatsApp leads
                </label>
                <button disabled={publicContactSaving} className="rounded-lg border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--lp-accent)] disabled:opacity-60">
                  {publicContactSaving ? "Saving..." : "Save public contact"}
                </button>
              </form>
            </DashboardCard>

            <DashboardCard title="QR access" subtitle="Library-level QR validation state and entry image.">
              <div className="grid gap-3 text-sm text-[var(--lp-text-soft)]">
                <div className="overflow-hidden rounded-lg border border-emerald-100 bg-[linear-gradient(180deg,#ecfdf5,#ffffff)] p-4 text-center">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-sm ring-1 ring-emerald-100">
                    <img src="/icons/booklib-mark.png" alt="" className="h-5 w-5 rounded object-contain" />
                    <span className="text-[11px] font-black text-emerald-700">BookLib QR</span>
                  </div>
                  <img
                    src={buildQrImageUrl(data.qr_payload, 360)}
                    alt={`${data.library_name} library QR`}
                    className="mx-auto h-52 w-52 rounded-lg bg-white object-cover shadow-sm ring-1 ring-slate-200"
                  />
                  <p className="mt-3 text-xs font-bold text-slate-500">Download branded poster from Attendance.</p>
                </div>
                <p>Active QR key: <span className="font-semibold text-[var(--lp-text)]">{data.qr_key_id}</span></p>
                <p>Offline check-in: <span className="font-semibold text-[var(--lp-text)]">{data.allow_offline_checkin ? "Enabled" : "Disabled"}</span></p>
                <button onClick={() => void regenerateQr()} className="rounded-lg border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--lp-accent)]">
                  Regenerate QR key
                </button>
              </div>
            </DashboardCard>
          </div>
        </div>
      ) : null}

      {activeTab === "account" ? (
        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <DashboardCard title="Account profile" subtitle="Update your own name, email, and phone from one place.">
            <form className="grid gap-3" onSubmit={saveAccount}>
              <input value={accountForm.fullName} onChange={(event) => setAccountForm((current) => ({ ...current, fullName: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Full name" />
              <input value={accountForm.email} onChange={(event) => setAccountForm((current) => ({ ...current, email: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Email" />
              <input value={accountForm.phone} onChange={(event) => setAccountForm((current) => ({ ...current, phone: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Phone" />
              <button disabled={accountSaving} className="rounded-lg border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--lp-accent)] disabled:opacity-60">
                {accountSaving ? "Saving..." : "Save account profile"}
              </button>
            </form>
          </DashboardCard>

          <div className="grid gap-4">
            <DashboardCard title="Security" subtitle="Password updates will sign you out on success for safety.">
              <form className="grid gap-3" onSubmit={updatePassword}>
                <input type="password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Current password" />
                <input type="password" value={passwordForm.nextPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, nextPassword: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="New password" />
                <button disabled={passwordSaving} className="rounded-lg border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--lp-accent)] disabled:opacity-60">
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
                  className="inline-flex w-fit rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700"
                >
                  Logout
                </button>
              </div>
            </DashboardCard>
          </div>
        </div>
      ) : null}

      {activeTab === "team" ? <OwnerAdminsManager /> : null}

      {activeTab === "billing" ? (
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <DashboardCard title="Subscription status" subtitle="Platform plan and renewal state.">
            <div className="grid gap-3 text-sm text-[var(--lp-text-soft)]">
              <p>Current plan: <span className="font-semibold text-[var(--lp-text)]">{data.subscription_plan ?? "No active plan"}</span></p>
              <p>Status: <span className="font-semibold text-[var(--lp-text)]">{data.subscription_status ?? "-"}</span></p>
              <p>Renewal date: <span className="font-semibold text-[var(--lp-text)]">{data.renewal_date ?? "-"}</span></p>
              <Link href="/owner/billing" className="inline-flex w-fit rounded-lg border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--lp-accent)]">
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

