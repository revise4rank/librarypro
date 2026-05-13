"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";

type IntegrationSettings = {
  googleOAuthClientId: string;
  googleOAuthRedirectUrl: string;
  googleOAuthClientSecretSet: boolean;
  razorpayKeyId: string;
  razorpayKeySecretSet: boolean;
  razorpayWebhookSecretSet: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  reportFromEmail: string;
  smtpPassSet: boolean;
  updatedAt: string | null;
  updatedByName: string | null;
};

type IntegrationForm = {
  googleOAuthClientId: string;
  googleOAuthClientSecret: string;
  googleOAuthRedirectUrl: string;
  razorpayKeyId: string;
  razorpayKeySecret: string;
  razorpayWebhookSecret: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  reportFromEmail: string;
};

function formFromSettings(settings: IntegrationSettings): IntegrationForm {
  return {
    googleOAuthClientId: settings.googleOAuthClientId ?? "",
    googleOAuthClientSecret: "",
    googleOAuthRedirectUrl: settings.googleOAuthRedirectUrl ?? "",
    razorpayKeyId: settings.razorpayKeyId ?? "",
    razorpayKeySecret: "",
    razorpayWebhookSecret: "",
    smtpHost: settings.smtpHost ?? "",
    smtpPort: String(settings.smtpPort ?? 587),
    smtpUser: settings.smtpUser ?? "",
    smtpPass: "",
    reportFromEmail: settings.reportFromEmail ?? "",
  };
}

function SecretHint({ active }: { active: boolean }) {
  return <span className={`text-xs font-bold ${active ? "text-emerald-700" : "text-amber-700"}`}>{active ? "Saved" : "Not set"}</span>;
}

function ReadinessPill({ ready }: { ready: boolean }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${ready ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
      {ready ? "Ready" : "Needs setup"}
    </span>
  );
}

export function SuperadminIntegrationsManager() {
  const [settings, setSettings] = useState<IntegrationSettings | null>(null);
  const [form, setForm] = useState<IntegrationForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadSettings() {
    try {
      const response = await apiFetch<{ success: boolean; data: IntegrationSettings }>("/admin/integration-settings");
      setSettings(response.data);
      setForm(formFromSettings(response.data));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load integration settings.");
    }
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  function update(patch: Partial<IntegrationForm>) {
    setForm((current) => (current ? { ...current, ...patch } : current));
  }

  async function saveSettings() {
    if (!form) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await apiFetch<{ success: boolean; data: IntegrationSettings }>("/admin/integration-settings", {
        method: "PATCH",
        body: JSON.stringify({
          ...form,
          smtpPort: Number(form.smtpPort || 587),
        }),
      });
      setSettings(response.data);
      setForm(formFromSettings(response.data));
      setMessage("Integration settings saved. New requests will use these values.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save integration settings.");
    } finally {
      setSaving(false);
    }
  }

  if (!form || !settings) return <p className="text-sm text-[var(--lp-muted)]">{error ?? "Loading integration settings..."}</p>;

  const googleReady = Boolean(settings.googleOAuthClientId && settings.googleOAuthRedirectUrl && settings.googleOAuthClientSecretSet);
  const razorpayReady = Boolean(settings.razorpayKeyId && settings.razorpayKeySecretSet && settings.razorpayWebhookSecretSet);
  const smtpReady = Boolean(settings.smtpHost && settings.smtpUser && settings.smtpPassSet && settings.reportFromEmail);

  return (
    <div className="grid gap-4">
      {message ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">{error}</p> : null}

      <section className="grid gap-3 rounded-lg border border-[var(--lp-border)] bg-white p-4 md:grid-cols-3">
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-black text-[var(--lp-text)]">Google login</p>
            <ReadinessPill ready={googleReady} />
          </div>
          <p className="mt-2 text-xs leading-5 text-[var(--lp-muted)]">Owner and student OAuth use this client and callback URL.</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-black text-[var(--lp-text)]">Razorpay billing</p>
            <ReadinessPill ready={razorpayReady} />
          </div>
          <p className="mt-2 break-all text-xs leading-5 text-[var(--lp-muted)]">Webhook: https://api.booklib.in/v1/billing/razorpay/webhook</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-black text-[var(--lp-text)]">SMTP reset mail</p>
            <ReadinessPill ready={smtpReady} />
          </div>
          <p className="mt-2 text-xs leading-5 text-[var(--lp-muted)]">Forgot-password delivery needs host, user, password, and from email.</p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <DashboardCard title="Google Auth" subtitle="Owner and student Google login credentials.">
          <div className="grid gap-3">
            <input value={form.googleOAuthClientId} onChange={(event) => update({ googleOAuthClientId: event.target.value })} className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm outline-none" placeholder="Google OAuth client ID" />
            <input value={form.googleOAuthRedirectUrl} onChange={(event) => update({ googleOAuthRedirectUrl: event.target.value })} className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm outline-none" placeholder="Redirect URL" />
            <label className="grid gap-1 text-sm font-semibold text-[var(--lp-text)]">
              Client secret <SecretHint active={settings.googleOAuthClientSecretSet} />
              <input type="password" value={form.googleOAuthClientSecret} onChange={(event) => update({ googleOAuthClientSecret: event.target.value })} className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm outline-none" placeholder="Leave blank to keep existing" />
            </label>
          </div>
        </DashboardCard>

        <DashboardCard title="Razorpay" subtitle="Checkout and webhook credentials for owner renewals.">
          <div className="grid gap-3">
            <input value={form.razorpayKeyId} onChange={(event) => update({ razorpayKeyId: event.target.value })} className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm outline-none" placeholder="Razorpay key ID" />
            <label className="grid gap-1 text-sm font-semibold text-[var(--lp-text)]">
              Key secret <SecretHint active={settings.razorpayKeySecretSet} />
              <input type="password" value={form.razorpayKeySecret} onChange={(event) => update({ razorpayKeySecret: event.target.value })} className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm outline-none" placeholder="Leave blank to keep existing" />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-[var(--lp-text)]">
              Webhook secret <SecretHint active={settings.razorpayWebhookSecretSet} />
              <input type="password" value={form.razorpayWebhookSecret} onChange={(event) => update({ razorpayWebhookSecret: event.target.value })} className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm outline-none" placeholder="Leave blank to keep existing" />
            </label>
          </div>
        </DashboardCard>

        <DashboardCard title="SMTP" subtitle="Password reset mail delivery configuration.">
          <div className="grid gap-3">
            <input value={form.smtpHost} onChange={(event) => update({ smtpHost: event.target.value })} className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm outline-none" placeholder="SMTP host" />
            <input value={form.smtpPort} onChange={(event) => update({ smtpPort: event.target.value })} className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm outline-none" placeholder="SMTP port" />
            <input value={form.smtpUser} onChange={(event) => update({ smtpUser: event.target.value })} className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm outline-none" placeholder="SMTP user" />
            <label className="grid gap-1 text-sm font-semibold text-[var(--lp-text)]">
              SMTP password <SecretHint active={settings.smtpPassSet} />
              <input type="password" value={form.smtpPass} onChange={(event) => update({ smtpPass: event.target.value })} className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm outline-none" placeholder="Leave blank to keep existing" />
            </label>
            <input value={form.reportFromEmail} onChange={(event) => update({ reportFromEmail: event.target.value })} className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm outline-none" placeholder="From email" />
          </div>
        </DashboardCard>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--lp-border)] bg-white p-4">
        <p className="text-sm font-semibold text-[var(--lp-muted)]">
          Last updated: {settings.updatedAt ? settings.updatedAt.slice(0, 16).replace("T", " ") : "Env fallback"} {settings.updatedByName ? `by ${settings.updatedByName}` : ""}
        </p>
        <button type="button" onClick={() => void saveSettings()} disabled={saving} className="rounded-full bg-[var(--lp-primary)] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
          {saving ? "Saving..." : "Save integration settings"}
        </button>
      </div>
    </div>
  );
}
