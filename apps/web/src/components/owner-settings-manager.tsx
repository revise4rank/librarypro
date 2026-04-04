"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { Surface } from "./shell";

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
    subscription_plan: string | null;
    subscription_status: string | null;
    renewal_date: string | null;
  };
};

export function OwnerSettingsManager() {
  const [data, setData] = useState<SettingsResponse["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
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

  async function loadSettings() {
    try {
      const response = await apiFetch<SettingsResponse>("/owner/settings");
      setData(response.data);
      setForm({
        libraryName: response.data.library_name,
        address: response.data.address,
        city: response.data.city,
        area: response.data.area ?? "",
        wifiName: response.data.wifi_name ?? "",
        wifiPassword: response.data.wifi_password ?? "",
        noticeMessage: response.data.notice_message ?? "",
        allowOfflineCheckin: response.data.allow_offline_checkin,
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

  if (!data) {
    return <p className="text-sm text-slate-500">{error ?? "Loading owner settings..."}</p>;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {error ? <p className="xl:col-span-2 text-sm font-semibold text-rose-600">{error}</p> : null}
      {message ? <p className="xl:col-span-2 text-sm font-semibold text-emerald-700">{message}</p> : null}

      <Surface title="Library profile" subtitle="Basic customer-facing information">
        <form className="grid gap-4" onSubmit={saveSettings}>
          <input value={form.libraryName} onChange={(event) => setForm((current) => ({ ...current, libraryName: event.target.value }))} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none" placeholder="Library name" />
          <input value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none" placeholder="Address" />
          <div className="grid gap-4 md:grid-cols-2">
            <input value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none" placeholder="City" />
            <input value={form.area} onChange={(event) => setForm((current) => ({ ...current, area: event.target.value }))} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none" placeholder="Area / Locality" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <input value={form.wifiName} onChange={(event) => setForm((current) => ({ ...current, wifiName: event.target.value }))} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none" placeholder="WiFi name" />
            <input value={form.wifiPassword} onChange={(event) => setForm((current) => ({ ...current, wifiPassword: event.target.value }))} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none" placeholder="WiFi password" />
          </div>
          <textarea value={form.noticeMessage} onChange={(event) => setForm((current) => ({ ...current, noticeMessage: event.target.value }))} className="min-h-36 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none" placeholder="Notice message" />
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={form.allowOfflineCheckin}
              onChange={(event) => setForm((current) => ({ ...current, allowOfflineCheckin: event.target.checked }))}
            />
            Allow offline QR sync
          </label>
          <button disabled={saving} className="rounded-2xl bg-[var(--lp-primary)] px-5 py-4 text-sm font-bold text-white disabled:opacity-60">
            {saving ? "Saving..." : "Save settings"}
          </button>
        </form>
      </Surface>

      <div className="grid gap-6">
        <Surface title="QR entry" subtitle="Library-level QR validation state">
          <div className="space-y-3 text-sm text-slate-700">
            <p>Active QR key: <span className="font-black text-slate-950">{data.qr_key_id}</span></p>
            <p>Offline check-in: <span className="font-black text-slate-950">{data.allow_offline_checkin ? "Enabled" : "Disabled"}</span></p>
            <button onClick={() => void regenerateQr()} className="rounded-2xl bg-slate-950 px-5 py-4 text-sm font-bold text-white">Regenerate QR key</button>
          </div>
        </Surface>

        <Surface title="Subscription access control" subtitle="Platform plan and renewal state">
          <div className="space-y-3 text-sm text-slate-700">
            <p>Current plan: <span className="font-black text-slate-950">{data.subscription_plan ?? "No active plan"}</span></p>
            <p>Status: <span className="font-black text-emerald-700">{data.subscription_status ?? "-"}</span></p>
            <p>Renewal date: <span className="font-black text-slate-950">{data.renewal_date ?? "-"}</span></p>
            <Link href="/owner/billing" className="inline-flex rounded-2xl bg-amber-400 px-5 py-4 text-sm font-bold text-slate-950">
              Open renew plan flow
            </Link>
          </div>
        </Surface>
      </div>
    </div>
  );
}
