"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";

type CheckinRow = {
  id: string;
  student_name: string;
  seat_number: string | null;
  checked_in_at: string;
  checked_out_at: string | null;
  duration_minutes: number | null;
  status: "INSIDE" | "COMPLETED";
};

type CheckinResponse = {
  success: boolean;
  data: {
    summary: {
      currentlyInside: number;
      todayCheckins: number;
      overstay: number;
      latestDay: string;
    };
    rows: CheckinRow[];
  };
};

type OwnerQrSettingsResponse = {
  success: boolean;
  data: {
    library_name: string;
    city: string;
    area: string | null;
    qr_key_id: string;
    qr_payload: string;
    allow_offline_checkin: boolean;
  };
};

type FilterState = {
  status: "ALL" | "INSIDE" | "COMPLETED" | "OVERSTAY";
  search: string;
  fromDate: string;
  toDate: string;
};

function formatMinutes(minutes: number | null) {
  if (minutes === null) return "-";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function buildQuery(filters: FilterState) {
  const params = new URLSearchParams();
  params.set("status", filters.status);
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.fromDate) params.set("fromDate", filters.fromDate);
  if (filters.toDate) params.set("toDate", filters.toDate);
  return params.toString();
}

function buildQrImageUrl(payload: string, size = 640) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=16&data=${encodeURIComponent(payload)}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function OwnerCheckinsManager() {
  const [data, setData] = useState<CheckinResponse["data"] | null>(null);
  const [qrSettings, setQrSettings] = useState<OwnerQrSettingsResponse["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qrDownloadStatus, setQrDownloadStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    status: "ALL",
    search: "",
    fromDate: "",
    toDate: "",
  });

  async function loadCheckins(activeFilters: FilterState) {
    setLoading(true);
    try {
      const query = buildQuery(activeFilters);
      const response = await apiFetch<CheckinResponse>(`/owner/checkins${query ? `?${query}` : ""}`);
      setData(response.data);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load check-in register.");
    } finally {
      setLoading(false);
    }
  }

  async function loadQrSettings() {
    try {
      const response = await apiFetch<OwnerQrSettingsResponse>("/owner/settings");
      setQrSettings(response.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load library QR.");
    }
  }

  useEffect(() => {
    void loadCheckins(filters);
    void loadQrSettings();
  }, []);

  const rows = useMemo(() => data?.rows ?? [], [data]);

  async function downloadQrImage() {
    if (!qrSettings?.qr_payload) return;
    const qrUrl = buildQrImageUrl(qrSettings.qr_payload, 960);
    const filename = `${qrSettings.library_name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-attendance-qr.png`;

    setQrDownloadStatus("Preparing QR download...");
    try {
      const response = await fetch(qrUrl);
      if (!response.ok) {
        throw new Error("Unable to fetch QR image.");
      }
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(objectUrl);
      setQrDownloadStatus("QR image downloaded.");
    } catch (downloadError) {
      const anchor = document.createElement("a");
      anchor.href = qrUrl;
      anchor.download = filename;
      anchor.rel = "noopener";
      anchor.target = "_blank";
      anchor.click();
      setQrDownloadStatus(downloadError instanceof Error ? "Opened QR image in a new tab for download." : "Opened QR image in a new tab.");
    }
  }

  function openQrImage() {
    if (!qrSettings?.qr_payload) return;
    const anchor = document.createElement("a");
    anchor.href = buildQrImageUrl(qrSettings.qr_payload, 960);
    anchor.rel = "noopener";
    anchor.target = "_blank";
    anchor.click();
  }

  function printQrPoster() {
    if (!qrSettings?.qr_payload) return;
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=720,height=900");
    if (!printWindow) {
      setError("Popup blocked. Allow popups to print QR poster.");
      return;
    }
    const qrUrl = buildQrImageUrl(qrSettings.qr_payload, 720);
    const safeLibraryName = escapeHtml(qrSettings.library_name);
    const safeLocation = escapeHtml([qrSettings.area, qrSettings.city].filter(Boolean).join(", "));
    const safeQrKey = escapeHtml(qrSettings.qr_key_id);
    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${safeLibraryName} QR</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 36px; color: #0f172a; }
            .poster { min-height: calc(100vh - 72px); border: 2px solid #0f172a; border-radius: 20px; display: grid; place-items: center; text-align: center; padding: 32px; }
            h1 { font-size: 38px; margin: 0 0 8px; }
            p { margin: 0; color: #475569; font-size: 18px; }
            img { width: min(72vw, 520px); height: min(72vw, 520px); margin: 28px auto; }
            .key { font-size: 13px; letter-spacing: .12em; text-transform: uppercase; color: #64748b; }
            .hint { font-weight: 700; color: #0f766e; }
          </style>
        </head>
        <body>
          <main class="poster">
            <section>
              <h1>${safeLibraryName}</h1>
              <p>${safeLocation}</p>
              <img src="${qrUrl}" alt="Library QR" />
              <p class="hint">Students scan this QR from their BookLib app for check-in and check-out.</p>
              <p class="key">QR Key: ${safeQrKey}</p>
            </section>
          </main>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  return (
    <div className="grid gap-5">
      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
      <section className="rounded-xl border border-[var(--lp-border)] bg-[linear-gradient(135deg,#16b871_0%,#9debd5_100%)] p-4 text-white shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/75">Attendance live</p>
            <h3 className="mt-1 text-xl font-black tracking-tight">QR register and occupancy watch</h3>
            <p className="mt-1 text-sm leading-6 text-white/85">
              Search the register, scan today&apos;s activity, and catch long-stay cases faster.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="rounded-lg bg-white/12 px-4 py-2.5 text-sm font-black">
              {data?.summary.currentlyInside ?? 0} inside
            </div>
            <div className="rounded-lg bg-white px-4 py-2.5 text-sm font-black text-[#129b62]">
              {data?.summary.todayCheckins ?? 0} today
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <DashboardCard title="Currently inside" subtitle="Students still marked in library">
          <p className="text-4xl font-black text-slate-950">{data?.summary.currentlyInside ?? 0}</p>
        </DashboardCard>
        <DashboardCard title="Today check-ins" subtitle={data?.summary.latestDay ?? "Today"}>
          <p className="text-4xl font-black text-slate-950">{data?.summary.todayCheckins ?? 0}</p>
        </DashboardCard>
        <DashboardCard title="Potential overstay" subtitle="Inside for 12h or more">
          <p className="text-4xl font-black text-slate-950">{data?.summary.overstay ?? 0}</p>
        </DashboardCard>
      </section>

      <DashboardCard title="Library QR scanner board" subtitle="Download or print the reception QR that students scan from their app.">
        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            {qrSettings?.qr_payload ? (
              <img
                src={buildQrImageUrl(qrSettings.qr_payload, 420)}
                alt={`${qrSettings.library_name} library QR`}
                className="h-48 w-48 rounded-xl bg-white object-cover"
              />
            ) : (
              <div className="grid h-48 w-48 place-items-center rounded-xl bg-slate-100 text-sm text-slate-500">Loading QR...</div>
            )}
          </div>
          <div className="grid content-start gap-3">
            <div>
              <p className="text-xl font-black text-slate-950">{qrSettings?.library_name ?? "Library QR"}</p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Place this QR at reception or entry gate. Students can scan it for check-in/check-out and join requests.
              </p>
            </div>
            <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
              <p className="rounded-xl bg-slate-50 px-4 py-3">QR key: <span className="font-black text-slate-950">{qrSettings?.qr_key_id ?? "-"}</span></p>
              <p className="rounded-xl bg-slate-50 px-4 py-3">Offline sync: <span className="font-black text-slate-950">{qrSettings?.allow_offline_checkin ? "Allowed" : "Disabled"}</span></p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void downloadQrImage()}
                disabled={!qrSettings?.qr_payload}
                className="rounded-xl bg-[var(--lp-accent-soft)] px-5 py-3 text-sm font-black text-[var(--lp-accent)] disabled:opacity-50"
              >
                Download QR
              </button>
              <button
                type="button"
                onClick={openQrImage}
                disabled={!qrSettings?.qr_payload}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 disabled:opacity-50"
              >
                Open QR image
              </button>
              <button
                type="button"
                onClick={printQrPoster}
                disabled={!qrSettings?.qr_payload}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 disabled:opacity-50"
              >
                Print QR poster
              </button>
            </div>
            {qrDownloadStatus ? <p className="text-sm font-semibold text-emerald-700">{qrDownloadStatus}</p> : null}
          </div>
        </div>
      </DashboardCard>

      <DashboardCard title="Register filters" subtitle="Search student, seat, date range, or long stays">
        <div className="grid gap-4">
          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr_0.9fr_auto]">
            <input
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Search by student or seat"
              className="rounded-xl border border-[var(--lp-border)] bg-white px-4 py-3 text-sm text-slate-800 outline-none"
            />
            <input
              type="date"
              value={filters.fromDate}
              onChange={(event) => setFilters((current) => ({ ...current, fromDate: event.target.value }))}
              className="rounded-xl border border-[var(--lp-border)] bg-white px-4 py-3 text-sm text-slate-800 outline-none"
            />
            <input
              type="date"
              value={filters.toDate}
              onChange={(event) => setFilters((current) => ({ ...current, toDate: event.target.value }))}
              className="rounded-xl border border-[var(--lp-border)] bg-white px-4 py-3 text-sm text-slate-800 outline-none"
            />
            <button
              type="button"
              onClick={() => void loadCheckins(filters)}
              className="rounded-xl bg-[var(--lp-accent-soft)] px-5 py-3 text-sm font-bold text-[var(--lp-accent)]"
            >
              {loading ? "Loading..." : "Apply filters"}
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            {[
              ["ALL", "All"],
              ["INSIDE", "Inside"],
              ["COMPLETED", "Completed"],
              ["OVERSTAY", "Overstay"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  const next = { ...filters, status: value as FilterState["status"] };
                  setFilters(next);
                  void loadCheckins(next);
                }}
                className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${
                  filters.status === value
                    ? "bg-[var(--lp-accent-soft)] text-[var(--lp-accent)]"
                    : "border border-[var(--lp-border)] bg-white text-[var(--lp-text)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </DashboardCard>

      <DashboardCard title="Digital register" subtitle="Live QR entry history with duration and occupancy state">
        {loading && !data ? <p className="text-sm text-slate-500">Loading check-in register...</p> : null}
        {!loading && rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--lp-border)] bg-white px-4 py-8 text-center">
            <p className="text-xl font-black text-[var(--lp-text)]">No check-ins found</p>
            <p className="mt-2 text-sm leading-6 text-[var(--lp-muted)]">Try a different date, status, or search term.</p>
          </div>
        ) : null}
        {rows.length > 0 ? (
          <>
            <div className="grid gap-3 md:hidden">
              {rows.map((entry) => (
                <article key={entry.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-950">{entry.student_name}</p>
                      <p className="mt-1 text-sm text-slate-500">Seat {entry.seat_number ?? "-"}</p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-2 text-xs font-black ${
                        entry.status === "INSIDE"
                          ? (entry.duration_minutes ?? 0) >= 720
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {entry.status === "INSIDE" && (entry.duration_minutes ?? 0) >= 720 ? "OVERSTAY" : entry.status}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-slate-700">
                    <p><span className="font-black text-slate-900">Check in:</span> {new Date(entry.checked_in_at).toLocaleString()}</p>
                    <p><span className="font-black text-slate-900">Check out:</span> {entry.checked_out_at ? new Date(entry.checked_out_at).toLocaleString() : "-"}</p>
                    <p><span className="font-black text-slate-900">Duration:</span> {formatMinutes(entry.duration_minutes)}</p>
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto rounded-lg border border-slate-200 bg-white md:block">
            <table className="w-full min-w-[980px] text-left">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.25em] text-slate-400">
                  <th className="pb-4">Student</th>
                  <th className="pb-4">Seat</th>
                  <th className="pb-4">Check in</th>
                  <th className="pb-4">Check out</th>
                  <th className="pb-4">Duration</th>
                  <th className="pb-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-100 bg-white text-sm text-slate-700">
                    <td className="px-4 py-4 font-black text-slate-950">{entry.student_name}</td>
                    <td className="px-4 py-4">{entry.seat_number ?? "-"}</td>
                    <td className="px-4 py-4">{new Date(entry.checked_in_at).toLocaleString()}</td>
                    <td className="px-4 py-4">{entry.checked_out_at ? new Date(entry.checked_out_at).toLocaleString() : "-"}</td>
                    <td className="px-4 py-4">{formatMinutes(entry.duration_minutes)}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-2 text-xs font-black ${
                          entry.status === "INSIDE"
                            ? (entry.duration_minutes ?? 0) >= 720
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {entry.status === "INSIDE" && (entry.duration_minutes ?? 0) >= 720 ? "OVERSTAY" : entry.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        ) : null}
      </DashboardCard>
    </div>
  );
}
