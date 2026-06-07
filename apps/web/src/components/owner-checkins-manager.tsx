"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import { buildQrFileName, buildQrImageUrl, downloadBrandedQrPng } from "../lib/branded-qr";
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

type ManualAttendanceStudent = {
  student_user_id: string;
  assignment_id: string;
  student_name: string;
  seat_number: string | null;
  currently_inside: boolean;
};

type ManualStudentsResponse = {
  success: boolean;
  data: ManualAttendanceStudent[];
};

type ManualAttendanceResponse = {
  success: boolean;
  data: {
    id: string;
    action: "CHECKIN" | "CHECKOUT";
    studentName: string;
    seatNumber: string | null;
    checkedInAt?: string;
    checkedOutAt?: string;
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
  const [manualStudents, setManualStudents] = useState<ManualAttendanceStudent[]>([]);
  const [manualSearch, setManualSearch] = useState("");
  const [manualSelectedStudentId, setManualSelectedStudentId] = useState("");
  const [manualAction, setManualAction] = useState<"AUTO" | "CHECKIN" | "CHECKOUT">("AUTO");
  const [manualStatus, setManualStatus] = useState<string | null>(null);
  const [manualSubmitting, setManualSubmitting] = useState(false);
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

  async function loadManualStudents() {
    try {
      const response = await apiFetch<ManualStudentsResponse>("/owner/checkins/manual/students");
      setManualStudents(response.data);
      setManualSelectedStudentId((current) => current || response.data[0]?.student_user_id || "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load students for manual attendance.");
    }
  }

  useEffect(() => {
    void loadCheckins(filters);
    void loadQrSettings();
    void loadManualStudents();
  }, []);

  const rows = useMemo(() => data?.rows ?? [], [data]);
  const filteredManualStudents = useMemo(() => {
    const query = manualSearch.trim().toLowerCase();
    return manualStudents.filter((student) => {
      if (!query) return true;
      return `${student.student_name} ${student.seat_number ?? ""}`.toLowerCase().includes(query);
    });
  }, [manualSearch, manualStudents]);
  const selectedManualStudent = manualStudents.find((student) => student.student_user_id === manualSelectedStudentId) ?? null;

  async function submitManualAttendance() {
    if (!manualSelectedStudentId) {
      setManualStatus("Select a student first.");
      return;
    }
    setManualSubmitting(true);
    setManualStatus(null);
    try {
      const response = await apiFetch<ManualAttendanceResponse>("/owner/checkins/manual", {
        method: "POST",
        body: JSON.stringify({ studentUserId: manualSelectedStudentId, action: manualAction }),
      });
      setManualStatus(`${response.data.studentName} ${response.data.action === "CHECKIN" ? "checked in" : "checked out"} manually.`);
      await Promise.all([loadCheckins(filters), loadManualStudents()]);
    } catch (submitError) {
      setManualStatus(submitError instanceof Error ? submitError.message : "Unable to mark manual attendance.");
    } finally {
      setManualSubmitting(false);
    }
  }

  async function downloadQrImage() {
    if (!qrSettings?.qr_payload) return;
    const qrUrl = buildQrImageUrl(qrSettings.qr_payload, 960);
    const filename = buildQrFileName(qrSettings.library_name);

    setQrDownloadStatus("Preparing branded QR download...");
    try {
      await downloadBrandedQrPng({
        payload: qrSettings.qr_payload,
        libraryName: qrSettings.library_name,
        location: [qrSettings.area, qrSettings.city].filter(Boolean).join(", "),
        qrKeyId: qrSettings.qr_key_id,
        filename,
      });
      setQrDownloadStatus("Branded QR image downloaded.");
    } catch (downloadError) {
      const anchor = document.createElement("a");
      anchor.href = qrUrl;
      anchor.download = filename;
      anchor.rel = "noopener";
      anchor.target = "_blank";
      anchor.click();
      setQrDownloadStatus(downloadError instanceof Error ? "Opened raw QR image in a new tab for download." : "Opened raw QR image in a new tab.");
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
            body { font-family: Arial, sans-serif; margin: 0; padding: 32px; color: #0f172a; background: #f8fafc; }
            .poster { min-height: calc(100vh - 64px); border: 2px solid #0f766e; border-radius: 28px; display: grid; place-items: center; text-align: center; padding: 32px; background: white; box-shadow: 0 18px 50px rgba(15,23,42,.12); }
            .brand { display: inline-flex; align-items: center; gap: 12px; border-radius: 999px; border: 1px solid #bbf7d0; background: #ecfdf5; padding: 10px 18px; color: #0f766e; font-weight: 900; }
            .brand img { width: 46px; height: 46px; margin: 0; object-fit: contain; border-radius: 12px; background: white; }
            h1 { font-size: 42px; margin: 28px 0 8px; }
            p { margin: 0; color: #475569; font-size: 18px; }
            .qr-wrap { margin: 30px auto 24px; display: inline-block; border-radius: 28px; border: 10px solid #d1fae5; background: #fff; padding: 18px; }
            .qr-wrap img { width: min(72vw, 520px); height: min(72vw, 520px); margin: 0; display: block; }
            .key { margin-top: 12px; font-size: 13px; letter-spacing: .12em; text-transform: uppercase; color: #64748b; }
            .hint { font-weight: 900; color: #0f766e; }
            .powered { margin-top: 24px; font-size: 14px; font-weight: 800; color: #64748b; }
          </style>
        </head>
        <body>
          <main class="poster">
            <section>
              <div class="brand">
                <img src="/icons/booklib-mark.png" alt="" />
                BookLib Attendance QR
              </div>
              <h1>${safeLibraryName}</h1>
              <p>${safeLocation}</p>
              <div class="qr-wrap"><img src="${qrUrl}" alt="Library QR" /></div>
              <p class="hint">Students scan this QR from their BookLib app for check-in and check-out.</p>
              <p class="key">QR Key: ${safeQrKey}</p>
              <p class="powered">Powered by BookLib</p>
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
      <section className="rounded-lg border border-[var(--lp-border)] bg-[linear-gradient(135deg,#16b871_0%,#9debd5_100%)] px-3 py-2.5 text-white shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/75">Attendance live</p>
            <h3 className="mt-1 text-base font-black tracking-tight">QR register and occupancy watch</h3>
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

      <DashboardCard title="Manual attendance" subtitle="For students without phone. Owner and attendance-enabled admins can mark entry from here.">
        <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border border-[var(--lp-border)] bg-slate-50 p-3">
            <input
              value={manualSearch}
              onChange={(event) => setManualSearch(event.target.value)}
              placeholder="Search student name or seat"
              className="w-full rounded-xl border border-[var(--lp-border)] bg-white px-3 py-2 text-sm text-slate-800 outline-none"
            />
            <div className="mt-3 max-h-72 overflow-y-auto pr-1">
              <div className="grid gap-2">
                {filteredManualStudents.map((student) => (
                  <button
                    key={student.student_user_id}
                    type="button"
                    onClick={() => setManualSelectedStudentId(student.student_user_id)}
                    className={`rounded-xl border px-3 py-2 text-left transition ${
                      manualSelectedStudentId === student.student_user_id
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-[var(--lp-border)] bg-white hover:border-emerald-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-950">{student.student_name}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">Seat {student.seat_number ?? "not allotted"}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${student.currently_inside ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                        {student.currently_inside ? "Inside" : "Outside"}
                      </span>
                    </div>
                  </button>
                ))}
                {filteredManualStudents.length === 0 ? <p className="py-8 text-center text-sm font-semibold text-slate-500">No active student found.</p> : null}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--lp-border)] bg-white px-3 py-2.5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Selected student</p>
            <p className="mt-2 text-xl font-black text-slate-950">{selectedManualStudent?.student_name ?? "Select student"}</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">Seat {selectedManualStudent?.seat_number ?? "-"}</p>
            <div className="mt-4 grid gap-2">
              {[
                ["AUTO", "Auto"],
                ["CHECKIN", "Check-in"],
                ["CHECKOUT", "Check-out"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setManualAction(value as typeof manualAction)}
                  className={`rounded-xl px-3 py-2 text-sm font-black ${
                    manualAction === value ? "bg-[var(--lp-accent-soft)] text-[var(--lp-accent)]" : "border border-[var(--lp-border)] text-slate-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={!selectedManualStudent || manualSubmitting}
              onClick={() => void submitManualAttendance()}
              className="mt-4 w-full rounded-xl bg-[var(--lp-primary)] px-5 py-3 text-sm font-black text-white disabled:opacity-50"
            >
              {manualSubmitting
                ? "Saving..."
                : manualAction === "CHECKIN"
                  ? "Mark check-in"
                  : manualAction === "CHECKOUT"
                    ? "Mark checkout"
                    : selectedManualStudent?.currently_inside
                      ? "Manual checkout"
                      : "Manual check-in"}
            </button>
            {manualStatus ? <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">{manualStatus}</p> : null}
          </div>
        </div>
      </DashboardCard>

      <DashboardCard title="Library QR scanner board" subtitle="Download or print the reception QR that students scan from their app.">
        <div className="grid gap-4 lg:grid-cols-[190px_1fr]">
          <div className="rounded-2xl border border-emerald-100 bg-[linear-gradient(180deg,#ecfdf5,#ffffff)] p-3 text-center">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-sm ring-1 ring-emerald-100">
              <img src="/icons/booklib-mark.png" alt="" className="h-5 w-5 rounded object-contain" />
              <span className="text-[11px] font-black text-emerald-700">BookLib QR</span>
            </div>
            {qrSettings?.qr_payload ? (
              <img
                src={buildQrImageUrl(qrSettings.qr_payload, 420)}
                alt={`${qrSettings.library_name} library QR`}
                className="mx-auto h-36 w-36 rounded-xl bg-white object-cover shadow-sm ring-1 ring-slate-200"
              />
            ) : (
              <div className="mx-auto grid h-36 w-36 place-items-center rounded-xl bg-slate-100 text-xs text-slate-500">Loading QR...</div>
            )}
            <p className="mt-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">Scan-safe code</p>
          </div>
          <div className="grid content-start gap-3">
            <div>
              <p className="text-xl font-black text-slate-950">{qrSettings?.library_name ?? "Library QR"}</p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Place this branded QR at reception or entry gate. Students can scan it for check-in/check-out and join requests.
              </p>
            </div>
            <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
              <p className="rounded-xl bg-slate-50 px-3 py-2">QR key: <span className="font-black text-slate-950">{qrSettings?.qr_key_id ?? "-"}</span></p>
              <p className="rounded-xl bg-slate-50 px-3 py-2">Offline sync: <span className="font-black text-slate-950">{qrSettings?.allow_offline_checkin ? "Allowed" : "Disabled"}</span></p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void downloadQrImage()}
                disabled={!qrSettings?.qr_payload}
                className="rounded-xl bg-[var(--lp-accent-soft)] px-5 py-3 text-sm font-black text-[var(--lp-accent)] disabled:opacity-50"
              >
                Download branded QR
              </button>
              <button
                type="button"
                onClick={openQrImage}
                disabled={!qrSettings?.qr_payload}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 disabled:opacity-50"
              >
                Open raw QR
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
        <div className="grid gap-3">
          <div className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr_0.9fr_auto]">
            <input
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Search by student or seat"
              className="rounded-xl border border-[var(--lp-border)] bg-white px-3 py-2 text-sm text-slate-800 outline-none"
            />
            <input
              type="date"
              value={filters.fromDate}
              onChange={(event) => setFilters((current) => ({ ...current, fromDate: event.target.value }))}
              className="rounded-xl border border-[var(--lp-border)] bg-white px-3 py-2 text-sm text-slate-800 outline-none"
            />
            <input
              type="date"
              value={filters.toDate}
              onChange={(event) => setFilters((current) => ({ ...current, toDate: event.target.value }))}
              className="rounded-xl border border-[var(--lp-border)] bg-white px-3 py-2 text-sm text-slate-800 outline-none"
            />
            <button
              type="button"
              onClick={() => void loadCheckins(filters)}
              className="rounded-xl bg-[var(--lp-accent-soft)] px-4 py-2 text-sm font-bold text-[var(--lp-accent)]"
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
                <article key={entry.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
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
                    <td className="px-3 py-2.5 font-black text-slate-950">{entry.student_name}</td>
                    <td className="px-3 py-2.5">{entry.seat_number ?? "-"}</td>
                    <td className="px-3 py-2.5">{new Date(entry.checked_in_at).toLocaleString()}</td>
                    <td className="px-3 py-2.5">{entry.checked_out_at ? new Date(entry.checked_out_at).toLocaleString() : "-"}</td>
                    <td className="px-3 py-2.5">{formatMinutes(entry.duration_minutes)}</td>
                    <td className="px-3 py-2.5">
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
