"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { defaultLandingBanners, type LandingBanner } from "../lib/public-site-settings";
import { DashboardCard } from "./dashboard-shell";
import { FormDrawer } from "./form-drawer";

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
  supportWhatsappNumber: string;
  demoWhatsappNumber: string;
  supportWhatsappMessage: string;
  demoWhatsappMessage: string;
  enableFloatingWhatsapp: boolean;
  enableBookDemoCta: boolean;
  landingBanners: LandingBanner[];
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
  supportWhatsappNumber: string;
  demoWhatsappNumber: string;
  supportWhatsappMessage: string;
  demoWhatsappMessage: string;
  enableFloatingWhatsapp: boolean;
  enableBookDemoCta: boolean;
  landingBanners: LandingBanner[];
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
    supportWhatsappNumber: settings.supportWhatsappNumber ?? "",
    demoWhatsappNumber: settings.demoWhatsappNumber ?? "",
    supportWhatsappMessage: settings.supportWhatsappMessage ?? "",
    demoWhatsappMessage: settings.demoWhatsappMessage ?? "",
    enableFloatingWhatsapp: settings.enableFloatingWhatsapp ?? true,
    enableBookDemoCta: settings.enableBookDemoCta ?? true,
    landingBanners: settings.landingBanners?.length ? settings.landingBanners : defaultLandingBanners,
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
  const [editorOpen, setEditorOpen] = useState(false);
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

  function updateBanner(index: number, patch: Partial<LandingBanner>) {
    setForm((current) => {
      if (!current) return current;
      const landingBanners = current.landingBanners.map((banner, bannerIndex) =>
        bannerIndex === index ? { ...banner, ...patch } : banner,
      );
      return { ...current, landingBanners };
    });
  }

  function addBanner() {
    setForm((current) => {
      if (!current) return current;
      if (current.landingBanners.length >= 6) return current;
      return {
        ...current,
        landingBanners: [
          ...current.landingBanners,
          {
            eyebrow: "New banner",
            title: "Add your BookLib campaign headline",
            subtitle: "Use this slide for offers, new features, demos, or owner announcements.",
            imageUrl: "",
            ctaLabel: "Learn more",
            ctaHref: "/owner/register",
            tone: "navy",
          },
        ],
      };
    });
  }

  function removeBanner(index: number) {
    setForm((current) => {
      if (!current || current.landingBanners.length <= 1) return current;
      return { ...current, landingBanners: current.landingBanners.filter((_, bannerIndex) => bannerIndex !== index) };
    });
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
      setEditorOpen(false);
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
  const whatsappReady = Boolean(settings.supportWhatsappNumber || settings.demoWhatsappNumber);

  return (
    <div className="grid gap-4">
      {message ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">{error}</p> : null}

      <section className="grid gap-3 rounded-lg border border-[var(--lp-border)] bg-white p-4 md:grid-cols-4">
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
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-black text-[var(--lp-text)]">WhatsApp CTAs</p>
            <ReadinessPill ready={whatsappReady} />
          </div>
          <p className="mt-2 text-xs leading-5 text-[var(--lp-muted)]">Landing support and demo buttons use these public-safe numbers.</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 md:col-span-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-black text-[var(--lp-text)]">Landing banners</p>
            <ReadinessPill ready={settings.landingBanners.length > 0} />
          </div>
          <p className="mt-2 text-xs leading-5 text-[var(--lp-muted)]">
            {settings.landingBanners.length} active hero slide(s). Admin can update text, image URLs, CTA, and color tone anytime.
          </p>
        </div>
      </section>

      <DashboardCard title="Credential editor" subtitle="Sensitive integration values open in a right drawer so the status page stays readable.">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--lp-border)] bg-slate-50 p-4">
          <div>
            <p className="text-sm font-black text-[var(--lp-text)]">Edit Google, Razorpay, SMTP, and WhatsApp settings</p>
            <p className="mt-1 text-sm text-[var(--lp-muted)]">
              Last updated: {settings.updatedAt ? settings.updatedAt.slice(0, 16).replace("T", " ") : "Env fallback"} {settings.updatedByName ? `by ${settings.updatedByName}` : ""}
            </p>
          </div>
          <button type="button" onClick={() => setEditorOpen(true)} className="rounded-full bg-[var(--lp-primary)] px-5 py-3 text-sm font-bold text-white">
            Open integration editor
          </button>
        </div>
      </DashboardCard>

      <FormDrawer
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title="Integration editor"
        description="Update platform credentials. Leave secret fields blank to keep the saved value."
        widthClassName="sm:w-[min(96vw,56rem)] max-w-4xl"
      >
      <section className="grid gap-4 xl:grid-cols-2">
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

        <DashboardCard title="WhatsApp and demo CTAs" subtitle="Control landing support and Book Demo routing without code changes.">
          <div className="grid gap-3">
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700">
              <input type="checkbox" checked={form.enableFloatingWhatsapp} onChange={(event) => update({ enableFloatingWhatsapp: event.target.checked })} />
              Floating WhatsApp support enabled
            </label>
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700">
              <input type="checkbox" checked={form.enableBookDemoCta} onChange={(event) => update({ enableBookDemoCta: event.target.checked })} />
              Book Demo CTA enabled
            </label>
            <input value={form.supportWhatsappNumber} onChange={(event) => update({ supportWhatsappNumber: event.target.value })} className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm outline-none" placeholder="Support WhatsApp number, e.g. +919389987466" />
            <textarea value={form.supportWhatsappMessage} onChange={(event) => update({ supportWhatsappMessage: event.target.value })} className="min-h-20 rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm outline-none" placeholder="Support WhatsApp default message" />
            <input value={form.demoWhatsappNumber} onChange={(event) => update({ demoWhatsappNumber: event.target.value })} className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm outline-none" placeholder="Demo WhatsApp number. Empty uses support number." />
            <textarea value={form.demoWhatsappMessage} onChange={(event) => update({ demoWhatsappMessage: event.target.value })} className="min-h-20 rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm outline-none" placeholder="Book demo WhatsApp default message" />
          </div>
        </DashboardCard>

        <DashboardCard title="Landing banner carousel" subtitle="These large hero slides appear on the landing page. Add image URLs now or keep the built-in app illustrations.">
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold text-[var(--lp-muted)]">Slides auto-rotate on the public landing page.</p>
              <button
                type="button"
                onClick={addBanner}
                disabled={form.landingBanners.length >= 6}
                className="rounded-full border border-[var(--lp-border)] px-3 py-2 text-xs font-black text-[var(--lp-primary)] disabled:opacity-50"
              >
                Add slide
              </button>
            </div>
            {form.landingBanners.map((banner, index) => (
              <div key={`${banner.title}-${index}`} className="grid gap-2 rounded-lg border border-[var(--lp-border)] bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-[var(--lp-text)]">Slide {index + 1}</p>
                  <button
                    type="button"
                    onClick={() => removeBanner(index)}
                    disabled={form.landingBanners.length <= 1}
                    className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-700 disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>
                <input
                  value={banner.eyebrow}
                  onChange={(event) => updateBanner(index, { eyebrow: event.target.value })}
                  className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm outline-none"
                  placeholder="Eyebrow, e.g. Owner workspace"
                />
                <input
                  value={banner.title}
                  onChange={(event) => updateBanner(index, { title: event.target.value })}
                  className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm outline-none"
                  placeholder="Banner headline"
                />
                <textarea
                  value={banner.subtitle}
                  onChange={(event) => updateBanner(index, { subtitle: event.target.value })}
                  className="min-h-16 rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm outline-none"
                  placeholder="Short supporting copy"
                />
                <input
                  value={banner.imageUrl}
                  onChange={(event) => updateBanner(index, { imageUrl: event.target.value })}
                  className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm outline-none"
                  placeholder="Optional banner image URL. Empty uses BookLib app illustration."
                />
                <div className="grid gap-2 sm:grid-cols-[1fr_1.5fr_0.8fr]">
                  <input
                    value={banner.ctaLabel}
                    onChange={(event) => updateBanner(index, { ctaLabel: event.target.value })}
                    className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm outline-none"
                    placeholder="CTA label"
                  />
                  <input
                    value={banner.ctaHref}
                    onChange={(event) => updateBanner(index, { ctaHref: event.target.value })}
                    className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm outline-none"
                    placeholder="/owner/register"
                  />
                  <select
                    value={banner.tone}
                    onChange={(event) => updateBanner(index, { tone: event.target.value as LandingBanner["tone"] })}
                    className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm font-bold outline-none"
                  >
                    <option value="navy">Navy</option>
                    <option value="steel">Steel</option>
                    <option value="copper">Copper</option>
                  </select>
                </div>
              </div>
            ))}
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
      </FormDrawer>
    </div>
  );
}
