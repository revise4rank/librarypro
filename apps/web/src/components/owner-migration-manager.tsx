"use client";

import { useEffect, useMemo, useState } from "react";
import { API_URL, apiFetch, displayApiError } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";
import { StatCard } from "./stat-card";

type MigrationSummary = Record<string, number>;

type MigrationPreviewRow = {
  rowNumber: number;
  normalized: {
    studentName: string;
    mobile: string;
    email: string;
    floorName: string;
    roomName: string;
    seatCode: string;
    planName: string;
    paymentStatus: string;
  };
  action: string;
  errors: string[];
  warnings: string[];
};

type MigrationJob = {
  id: string;
  file_name: string | null;
  status: string;
  summary: MigrationSummary;
  error_count: number;
  warning_count: number;
  committed_at: string | null;
  created_at: string;
  rows?: Array<{
    id: string;
    row_number: number;
    normalized_data: MigrationPreviewRow["normalized"];
    status: string;
    action: string;
    errors: string[];
    warnings: string[];
    result: Record<string, unknown>;
  }>;
};

type LoginStatusRow = {
  student_user_id: string;
  full_name: string;
  phone: string | null;
  login_id: string | null;
  seat_number: string | null;
  room_name: string | null;
  plan_name: string | null;
  first_login_at: string | null;
  last_login_at: string | null;
  login_status: "LOGGED_IN" | "NOT_LOGGED_IN";
};

function statusTone(status: string) {
  if (status === "COMMITTED" || status === "SUCCESS" || status === "LOGGED_IN") return "bg-emerald-50 text-emerald-700";
  if (status === "FAILED" || status === "NOT_LOGGED_IN") return "bg-rose-50 text-rose-700";
  if (status === "COMMITTING") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

function fileDownloadUrl(path: string) {
  return `${API_URL}${path}`;
}

export function OwnerMigrationManager() {
  const [activeTab, setActiveTab] = useState<"import" | "history" | "login">("import");
  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<MigrationPreviewRow[]>([]);
  const [currentJob, setCurrentJob] = useState<MigrationJob | null>(null);
  const [jobs, setJobs] = useState<MigrationJob[]>([]);
  const [loginRows, setLoginRows] = useState<LoginStatusRow[]>([]);
  const [loginFilter, setLoginFilter] = useState("ALL");
  const [planFilter, setPlanFilter] = useState("");
  const [roomFilter, setRoomFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadJobs() {
    try {
      const response = await apiFetch<{ success: boolean; data: MigrationJob[] }>("/owner/migration/jobs");
      setJobs(response.data);
      setError(null);
    } catch (loadError) {
      setError(displayApiError(loadError, "Unable to load migration history."));
    }
  }

  async function loadLoginStatus(nextStatus = loginFilter, nextSearch = search, nextPlan = planFilter, nextRoom = roomFilter) {
    try {
      const query = new URLSearchParams({ status: nextStatus, q: nextSearch });
      if (nextPlan) query.set("plan", nextPlan);
      if (nextRoom) query.set("room", nextRoom);
      const response = await apiFetch<{ success: boolean; data: LoginStatusRow[] }>(`/owner/migration/login-status?${query.toString()}`);
      setLoginRows(response.data);
      setError(null);
    } catch (loadError) {
      setError(displayApiError(loadError, "Unable to load login status."));
    }
  }

  useEffect(() => {
    void loadJobs();
    void loadLoginStatus();
  }, []);

  const summary = currentJob?.summary ?? {};
  const hasBlockingErrors = Number(summary.errorRows ?? currentJob?.error_count ?? 0) > 0;
  const loginSummary = useMemo(() => {
    const loggedIn = loginRows.filter((row) => row.login_status === "LOGGED_IN").length;
    return { loggedIn, notLoggedIn: loginRows.length - loggedIn };
  }, [loginRows]);
  const loginFilterOptions = useMemo(() => {
    const plans = Array.from(new Set(loginRows.map((row) => row.plan_name).filter(Boolean) as string[])).sort();
    const rooms = Array.from(new Set(loginRows.map((row) => row.room_name).filter(Boolean) as string[])).sort();
    return { plans, rooms };
  }, [loginRows]);

  function exportNotLoggedInCsv() {
    const pendingRows = loginRows.filter((row) => row.login_status === "NOT_LOGGED_IN");
    const csvRows = [
      ["Student name", "Mobile", "Login ID", "Room", "Seat", "Plan", "Status"],
      ...pendingRows.map((row) => [
        row.full_name,
        row.phone ?? "",
        row.login_id ?? "",
        row.room_name ?? "",
        row.seat_number ?? "",
        row.plan_name ?? "",
        row.login_status,
      ]),
    ];
    const csv = csvRows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "booklib-not-logged-in-students.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function previewFile() {
    if (!file) {
      setError("CSV ya XLSX file choose karo.");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await apiFetch<{ success: boolean; data: { jobId: string; summary: MigrationSummary; rows: MigrationPreviewRow[] } }>("/owner/migration/preview", {
        method: "POST",
        body: formData,
      });
      setCurrentJob({
        id: response.data.jobId,
        file_name: file.name,
        status: "DRAFT",
        summary: response.data.summary,
        error_count: response.data.summary.errorRows ?? 0,
        warning_count: response.data.summary.warningRows ?? 0,
        committed_at: null,
        created_at: new Date().toISOString(),
      });
      setPreviewRows(response.data.rows);
      setError(null);
      setMessage("Preview ready. Errors fix karke re-upload karo, ya valid rows commit karo.");
      await loadJobs();
    } catch (previewError) {
      setError(displayApiError(previewError, "Unable to preview import."));
    } finally {
      setLoading(false);
    }
  }

  async function commitImport() {
    if (!currentJob) return;
    const confirmed = window.confirm(
      hasBlockingErrors
        ? "Some rows have errors and will fail. Valid rows can still import. Continue?"
        : "Commit import? Students, seats, plans, and payments will be created/updated.",
    );
    if (!confirmed) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await apiFetch<{ success: boolean; data: MigrationSummary }>(`/owner/migration/${currentJob.id}/commit`, {
        method: "POST",
      });
      setError(null);
      setMessage(`Import complete: ${response.data.successRows ?? 0} success, ${response.data.failedRows ?? 0} failed.`);
      const detail = await apiFetch<{ success: boolean; data: MigrationJob }>(`/owner/migration/${currentJob.id}`);
      setCurrentJob(detail.data);
      setPreviewRows((detail.data.rows ?? []).map((row) => ({
        rowNumber: row.row_number,
        normalized: row.normalized_data,
        action: row.action,
        errors: row.errors,
        warnings: row.warnings,
      })));
      await Promise.all([loadJobs(), loadLoginStatus()]);
    } catch (commitError) {
      setError(displayApiError(commitError, "Unable to commit import."));
    } finally {
      setLoading(false);
    }
  }

  async function openJob(jobId: string) {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<{ success: boolean; data: MigrationJob }>(`/owner/migration/${jobId}`);
      setCurrentJob(response.data);
      setPreviewRows((response.data.rows ?? []).map((row) => ({
        rowNumber: row.row_number,
        normalized: row.normalized_data,
        action: row.action,
        errors: row.errors,
        warnings: row.warnings,
      })));
      setError(null);
      setActiveTab("import");
    } catch (jobError) {
      setError(displayApiError(jobError, "Unable to open migration job."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4">
      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</p> : null}
      {message ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">{message}</p> : null}

      <div className="grid gap-2 rounded-lg border border-[var(--lp-border)] bg-white p-1 sm:grid-cols-3">
        {(["import", "history", "login"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              setActiveTab(tab);
              if (tab === "history") void loadJobs();
              if (tab === "login") void loadLoginStatus();
            }}
            className={`rounded-md px-3 py-2 text-sm font-black capitalize transition ${activeTab === tab ? "bg-[var(--lp-accent-soft)] text-[var(--lp-accent)]" : "text-slate-600 hover:bg-slate-50"}`}
          >
            {tab === "login" ? "Login status" : tab}
          </button>
        ))}
      </div>

      {activeTab === "import" ? (
        <div className="grid gap-4 xl:grid-cols-[0.86fr_1.14fr]">
          <DashboardCard title="Upload offline sheet" subtitle="Preview first, then commit. Wrong rows cannot silently corrupt live data.">
            <div className="grid gap-3">
              <a
                href={fileDownloadUrl("/owner/migration/template.xlsx")}
                className="rounded-lg border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] px-4 py-3 text-center text-sm font-black text-[var(--lp-accent)]"
              >
                Download Excel template
              </a>
              <label className="grid gap-2 rounded-lg border border-dashed border-[var(--lp-border)] bg-slate-50 p-4 text-sm font-semibold text-slate-600">
                Upload CSV/XLSX
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm"
                />
                <span className="text-xs font-medium text-slate-500">Legacy .xls reject hoga. Template se import safest rahega.</span>
              </label>
              <button
                type="button"
                onClick={previewFile}
                disabled={loading}
                className="rounded-lg bg-[var(--lp-primary)] px-4 py-3 text-sm font-black text-white disabled:opacity-60"
              >
                {loading ? "Working..." : "Preview & validate"}
              </button>
              {currentJob ? (
                <button
                  type="button"
                  onClick={commitImport}
                  disabled={loading || currentJob.status === "COMMITTED" || currentJob.status === "COMMITTING"}
                  className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-3 text-sm font-black text-[var(--lp-text)] disabled:opacity-50"
                >
                  Commit import
                </button>
              ) : null}
              {currentJob?.status === "COMMITTED" || currentJob?.status === "FAILED" ? (
                <a
                  href={fileDownloadUrl(`/owner/migration/${currentJob.id}/credentials.pdf`)}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-black text-amber-800"
                >
                  Download credential PDF
                </a>
              ) : null}
              <p className="rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                PDF me new students ke login ID/temp password aayenge. Existing students ke liye password expose nahi hoga; woh existing password ya forgot password use karenge.
              </p>
            </div>
          </DashboardCard>

          <DashboardCard title="Preview & validation" subtitle={currentJob ? `${currentJob.file_name ?? "Uploaded file"} - ${currentJob.status}` : "Upload ke baad row-level result yaha dikhega."}>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                <StatCard label="Students create" value={summary.studentsToCreate ?? 0} />
                <StatCard label="Students update" value={summary.studentsToUpdate ?? 0} />
                <StatCard label="Seats create" value={summary.seatsToCreate ?? 0} />
                <StatCard label="Payments" value={summary.paymentsToCreate ?? 0} />
                <StatCard label="Floors" value={summary.floorsToCreate ?? 0} />
                <StatCard label="Rooms" value={summary.roomsToCreate ?? 0} />
                <StatCard label="Errors" value={summary.errorRows ?? currentJob?.error_count ?? 0} />
                <StatCard label="Warnings" value={summary.warningRows ?? currentJob?.warning_count ?? 0} />
              </div>

              <div className="max-h-[32rem] overflow-auto rounded-lg border border-[var(--lp-border)]">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-left text-xs font-black uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Row</th>
                      <th className="px-3 py-2">Student</th>
                      <th className="px-3 py-2">Seat</th>
                      <th className="px-3 py-2">Plan</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {previewRows.length === 0 ? (
                      <tr>
                        <td className="px-3 py-5 text-center text-slate-500" colSpan={5}>No preview rows yet.</td>
                      </tr>
                    ) : (
                      previewRows.map((row) => (
                        <tr key={`${row.rowNumber}-${row.normalized.mobile}`}>
                          <td className="px-3 py-2 font-bold">{row.rowNumber}</td>
                          <td className="px-3 py-2">
                            <p className="font-bold text-slate-900">{row.normalized.studentName}</p>
                            <p className="text-xs text-slate-500">{row.normalized.mobile || row.normalized.email}</p>
                          </td>
                          <td className="px-3 py-2 text-slate-600">{[row.normalized.floorName, row.normalized.roomName, row.normalized.seatCode].filter(Boolean).join(" / ") || "-"}</td>
                          <td className="px-3 py-2 text-slate-600">{row.normalized.planName}</td>
                          <td className="px-3 py-2">
                            {row.errors.length ? <p className="font-bold text-rose-600">{row.errors.join(" ")}</p> : null}
                            {!row.errors.length && row.warnings.length ? <p className="font-bold text-amber-700">{row.warnings.join(" ")}</p> : null}
                            {!row.errors.length && !row.warnings.length ? <p className="font-bold text-emerald-700">Ready</p> : null}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </DashboardCard>
        </div>
      ) : null}

      {activeTab === "history" ? (
        <DashboardCard title="Import history" subtitle="Recent migration drafts and committed imports.">
          <div className="grid gap-2">
            {jobs.length === 0 ? <p className="rounded-lg border border-dashed border-[var(--lp-border)] p-4 text-sm text-slate-500">No migration jobs yet.</p> : null}
            {jobs.map((job) => (
              <div key={job.id} className="grid gap-3 rounded-lg border border-[var(--lp-border)] bg-white p-3 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="font-black text-[var(--lp-text)]">{job.file_name ?? "Migration job"}</p>
                  <p className="text-sm text-slate-500">{new Date(job.created_at).toLocaleString()} - {job.summary?.totalRows ?? 0} rows</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${statusTone(job.status)}`}>{job.status}</span>
                  <button type="button" onClick={() => void openJob(job.id)} className="rounded-lg border border-[var(--lp-border)] px-3 py-2 text-sm font-bold">Open</button>
                  {job.status === "COMMITTED" || job.status === "FAILED" ? (
                    <a href={fileDownloadUrl(`/owner/migration/${job.id}/credentials.pdf`)} className="rounded-lg bg-[var(--lp-primary)] px-3 py-2 text-sm font-bold text-white">PDF</a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>
      ) : null}

      {activeTab === "login" ? (
        <DashboardCard title="Student login adoption" subtitle="Imported/onboarded students me kaun login kar chuka hai aur kaun pending hai.">
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <StatCard label="Logged in" value={loginSummary.loggedIn} />
              <StatCard label="Not logged in" value={loginSummary.notLoggedIn} />
              <StatCard label="Total" value={loginRows.length} />
              <StatCard label="Selected" value={loginFilter === "ALL" ? "All" : loginFilter === "LOGGED_IN" ? "Logged" : "Pending"} />
            </div>
            <div className="grid gap-2 md:grid-cols-[1fr_0.75fr_0.75fr_0.75fr_auto_auto]">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name or mobile"
                className="rounded-lg border border-[var(--lp-border)] px-3 py-2 text-sm"
              />
              <select
                value={loginFilter}
                onChange={(event) => {
                  setLoginFilter(event.target.value);
                  void loadLoginStatus(event.target.value, search, planFilter, roomFilter);
                }}
                className="rounded-lg border border-[var(--lp-border)] px-3 py-2 text-sm font-bold"
              >
                <option value="ALL">All</option>
                <option value="NOT_LOGGED_IN">Not logged in</option>
                <option value="LOGGED_IN">Logged in</option>
              </select>
              <select
                value={planFilter}
                onChange={(event) => setPlanFilter(event.target.value)}
                className="rounded-lg border border-[var(--lp-border)] px-3 py-2 text-sm font-bold"
              >
                <option value="">All plans</option>
                {loginFilterOptions.plans.map((plan) => (
                  <option key={plan} value={plan}>{plan}</option>
                ))}
              </select>
              <select
                value={roomFilter}
                onChange={(event) => setRoomFilter(event.target.value)}
                className="rounded-lg border border-[var(--lp-border)] px-3 py-2 text-sm font-bold"
              >
                <option value="">All rooms</option>
                {loginFilterOptions.rooms.map((room) => (
                  <option key={room} value={room}>{room}</option>
                ))}
              </select>
              <button type="button" onClick={() => void loadLoginStatus(loginFilter, search, planFilter, roomFilter)} className="rounded-lg bg-[var(--lp-primary)] px-4 py-2 text-sm font-black text-white">
                Apply
              </button>
              <button type="button" onClick={exportNotLoggedInCsv} className="rounded-lg border border-[var(--lp-border)] px-4 py-2 text-sm font-black text-[var(--lp-text)]">
                Export pending
              </button>
            </div>

            <div className="max-h-[34rem] overflow-auto rounded-lg border border-[var(--lp-border)]">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="sticky top-0 bg-slate-50 text-left text-xs font-black uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Student</th>
                    <th className="px-3 py-2">Seat</th>
                    <th className="px-3 py-2">Plan</th>
                    <th className="px-3 py-2">Login</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {loginRows.map((row) => (
                    <tr key={row.student_user_id}>
                      <td className="px-3 py-2">
                        <p className="font-bold text-slate-900">{row.full_name}</p>
                        <p className="text-xs text-slate-500">{row.phone ?? "-"}</p>
                      </td>
                      <td className="px-3 py-2 text-slate-600">{row.room_name ? `${row.room_name} / ` : ""}{row.seat_number ?? "Unallotted"}</td>
                      <td className="px-3 py-2 text-slate-600">{row.plan_name ?? "-"}</td>
                      <td className="px-3 py-2 text-slate-600">
                        <p>{row.login_id ?? "-"}</p>
                        <p className="text-xs text-slate-500">{row.last_login_at ? `Last: ${new Date(row.last_login_at).toLocaleString()}` : "No login yet"}</p>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${statusTone(row.login_status)}`}>{row.login_status === "LOGGED_IN" ? "Logged in" : "Not logged in"}</span>
                      </td>
                    </tr>
                  ))}
                  {loginRows.length === 0 ? (
                    <tr>
                      <td className="px-3 py-5 text-center text-slate-500" colSpan={5}>No students found.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </DashboardCard>
      ) : null}
    </div>
  );
}
