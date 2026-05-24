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

type FilterState = {
  status: "ALL" | "INSIDE" | "COMPLETED" | "OVERSTAY";
  search: string;
  fromDate: string;
  toDate: string;
};

type StudentOption = {
  student_user_id: string;
  full_name: string;
  phone: string | null;
  seat_number: string | null;
  plan_name: string | null;
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

export function OwnerCheckinsManager() {
  const [data, setData] = useState<CheckinResponse["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    status: "ALL",
    search: "",
    fromDate: "",
    toDate: "",
  });

  // Manual check-in modal state
  const [showManualModal, setShowManualModal] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentOptions, setStudentOptions] = useState<StudentOption[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualSuccess, setManualSuccess] = useState<string | null>(null);

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

  async function searchStudents(query: string) {
    if (!query.trim()) { setStudentOptions([]); return; }
    try {
      const res = await apiFetch<{ success: boolean; data: { rows: StudentOption[] } }>(
        `/owner/students?search=${encodeURIComponent(query)}&limit=10&page=1`
      );
      setStudentOptions(res.data.rows ?? []);
    } catch {
      setStudentOptions([]);
    }
  }

  async function submitManualCheckin() {
    if (!selectedStudent) return;
    setManualLoading(true);
    setManualError(null);
    setManualSuccess(null);
    try {
      await apiFetch("/owner/checkins/manual", {
        method: "POST",
        body: JSON.stringify({ studentUserId: selectedStudent.student_user_id }),
      });
      setManualSuccess(`${selectedStudent.full_name} checked in manually.`);
      setSelectedStudent(null);
      setStudentSearch("");
      setStudentOptions([]);
      await loadCheckins(filters);
    } catch (err) {
      setManualError(err instanceof Error ? err.message : "Manual check-in failed.");
    } finally {
      setManualLoading(false);
    }
  }

  useEffect(() => {
    void loadCheckins(filters);
  }, []);

  const rows = useMemo(() => data?.rows ?? [], [data]);

  return (
    <div className="grid gap-3 md:gap-6">
      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}

      {/* Summary strip + Manual check-in button */}
      <div className="flex flex-wrap items-stretch gap-2">
        <div className="flex-shrink-0 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3" style={{ minWidth: "120px" }}>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700">Inside now</p>
          <p className="mt-1.5 text-2xl md:text-3xl font-black text-slate-950">{data?.summary.currentlyInside ?? 0}</p>
        </div>
        <div className="flex-shrink-0 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3" style={{ minWidth: "120px" }}>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-700">Today</p>
          <p className="mt-1.5 text-2xl md:text-3xl font-black text-slate-950">{data?.summary.todayCheckins ?? 0}</p>
          <p className="text-xs text-slate-500">{data?.summary.latestDay ?? ""}</p>
        </div>
        <div className="flex-shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3" style={{ minWidth: "120px" }}>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-700">Overstay</p>
          <p className="mt-1.5 text-2xl md:text-3xl font-black text-slate-950">{data?.summary.overstay ?? 0}</p>
        </div>
        <button
          type="button"
          onClick={() => { setShowManualModal(true); setManualError(null); setManualSuccess(null); }}
          className="ml-auto flex-shrink-0 self-center rounded-xl bg-[var(--lp-primary)] px-5 py-3 text-sm font-bold text-white"
        >
          + Manual Check-in
        </button>
      </div>

      {/* Manual Check-in Modal */}
      {showManualModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-black text-slate-950">Manual Check-in</h2>
              <button
                type="button"
                onClick={() => { setShowManualModal(false); setSelectedStudent(null); setStudentSearch(""); setStudentOptions([]); setManualError(null); setManualSuccess(null); }}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {manualError ? <p className="mb-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">{manualError}</p> : null}
            {manualSuccess ? <p className="mb-3 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">{manualSuccess}</p> : null}

            {!manualSuccess ? (
              <>
                <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Search student (name or phone)
                  <input
                    value={studentSearch}
                    onChange={(e) => {
                      setStudentSearch(e.target.value);
                      setSelectedStudent(null);
                      void searchStudents(e.target.value);
                    }}
                    placeholder="e.g. Rahul or 9876543210"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
                  />
                </label>

                {studentOptions.length > 0 && !selectedStudent ? (
                  <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                    {studentOptions.map((s) => (
                      <li key={s.student_user_id}>
                        <button
                          type="button"
                          onClick={() => { setSelectedStudent(s); setStudentOptions([]); setStudentSearch(s.full_name); }}
                          className="w-full px-4 py-3 text-left text-sm hover:bg-slate-50"
                        >
                          <p className="font-bold text-slate-950">{s.full_name}</p>
                          <p className="text-xs text-slate-500">
                            {s.phone ?? "No phone"}{s.seat_number ? ` · Seat ${s.seat_number}` : ""}{s.plan_name ? ` · ${s.plan_name}` : ""}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {selectedStudent ? (
                  <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <p className="text-sm font-black text-slate-950">{selectedStudent.full_name}</p>
                    <p className="text-xs text-slate-500">
                      {selectedStudent.phone ?? "No phone"}{selectedStudent.seat_number ? ` · Seat ${selectedStudent.seat_number}` : ""}
                    </p>
                  </div>
                ) : null}

                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    disabled={!selectedStudent || manualLoading}
                    onClick={() => void submitManualCheckin()}
                    className="flex-1 rounded-xl bg-[var(--lp-primary)] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {manualLoading ? "Checking in..." : "Confirm Check-in"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowManualModal(false); setSelectedStudent(null); setStudentSearch(""); setStudentOptions([]); setManualError(null); }}
                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() => { setShowManualModal(false); setManualSuccess(null); setStudentSearch(""); setSelectedStudent(null); }}
                className="mt-2 w-full rounded-xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-700"
              >
                Close
              </button>
            )}
          </div>
        </div>
      ) : null}

      <DashboardCard title="Register filters" subtitle="Search student, seat, date range, or long stays">
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr_0.9fr_auto]">
          <input
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder="Search by student or seat"
            className="rounded-[1.25rem] border border-[var(--lp-border)] bg-white px-4 py-3 text-sm text-slate-800 outline-none"
          />
          <input
            type="date"
            value={filters.fromDate}
            onChange={(event) => setFilters((current) => ({ ...current, fromDate: event.target.value }))}
            className="rounded-[1.25rem] border border-[var(--lp-border)] bg-white px-4 py-3 text-sm text-slate-800 outline-none"
          />
          <input
            type="date"
            value={filters.toDate}
            onChange={(event) => setFilters((current) => ({ ...current, toDate: event.target.value }))}
            className="rounded-[1.25rem] border border-[var(--lp-border)] bg-white px-4 py-3 text-sm text-slate-800 outline-none"
          />
          <button
            type="button"
            onClick={() => void loadCheckins(filters)}
            className="rounded-[1.25rem] bg-[var(--lp-primary)] px-5 py-3 text-sm font-bold text-white"
          >
            {loading ? "Loading..." : "Apply filters"}
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
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
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                filters.status === value
                  ? "bg-[var(--lp-primary)] text-white"
                  : "border border-[var(--lp-border)] bg-white text-[var(--lp-text)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </DashboardCard>

      <DashboardCard title="Digital register" subtitle="Live QR entry history with duration and occupancy state">
        {loading && !data ? <p className="text-sm text-slate-500">Loading check-in register...</p> : null}
        {!loading && rows.length === 0 ? <p className="text-sm text-slate-500">No check-ins found for current filters.</p> : null}
        {rows.length > 0 ? (
          <>
            <div className="overflow-hidden rounded-xl border border-slate-200 md:hidden">
              {rows.map((entry) => {
                const isOverstay = entry.status === "INSIDE" && (entry.duration_minutes ?? 0) >= 720;
                const checkInTime = new Date(entry.checked_in_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
                const statusLabel = isOverstay ? "OVERSTAY" : entry.status;
                const statusClass = entry.status === "INSIDE"
                  ? isOverstay ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-600";
                return (
                  <div key={entry.id} className="flex items-center gap-3 border-b border-slate-100 bg-white px-3 py-2.5 last:border-b-0">
                    <span className="flex-shrink-0 text-base">{entry.status === "INSIDE" ? "↗" : "↙"}</span>
                    <span className="w-12 flex-shrink-0 text-sm font-black text-slate-400">{checkInTime}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-950">{entry.student_name}</p>
                      <p className="text-xs text-slate-500">
                        {entry.seat_number ? `Seat ${entry.seat_number} · ` : ""}{formatMinutes(entry.duration_minutes)}
                      </p>
                    </div>
                    <span className={`flex-shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${statusClass}`}>{statusLabel}</span>
                  </div>
                );
              })}
            </div>
            <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[980px] text-left">
              <thead>
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
                    <td className="py-4 font-black text-slate-950">{entry.student_name}</td>
                    <td className="py-4">{entry.seat_number ?? "-"}</td>
                    <td className="py-4">{new Date(entry.checked_in_at).toLocaleString()}</td>
                    <td className="py-4">{entry.checked_out_at ? new Date(entry.checked_out_at).toLocaleString() : "-"}</td>
                    <td className="py-4">{formatMinutes(entry.duration_minutes)}</td>
                    <td className="py-4">
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

