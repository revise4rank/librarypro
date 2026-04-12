"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, getApiBaseUrl, readSession } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";

type ReportsResponse = {
  success: boolean;
  data: {
    filters: {
      fromDate: string | null;
      toDate: string | null;
    };
    metrics: {
      totalStudents: number;
      filteredStudents: number;
      paidRevenue: number;
      dueRevenue: number;
      expenses: number;
      checkins: number;
      monthlyProfit: number;
      occupancyPercent: number;
    };
    monthlyComparison: Array<{
      month: string;
      revenue: number;
      expenses: number;
      profit: number;
    }>;
    expenseCategorySplit: Array<{
      category: string;
      amount: number;
    }>;
    paymentCategorySplit: {
      paid: number;
      due: number;
      failed: number;
    };
    students: Array<{
      assignment_id: string;
      student_name: string;
      student_code: string | null;
      student_phone: string | null;
      seat_number: string | null;
      plan_name: string;
      ends_at: string;
      payment_status: string;
      due_amount: string;
    }>;
    payments: Array<{
      id: string;
      student_name: string;
      amount: string;
      method: string;
      status: string;
      due_date: string | null;
      paid_at: string | null;
      created_at: string;
    }>;
    expenses: Array<{
      id: string;
      category: string;
      title: string;
      amount: string;
      spent_on: string;
    }>;
    checkins: Array<{
      id: string;
      student_name: string;
      seat_number: string | null;
      checked_in_at: string;
      checked_out_at: string | null;
      duration_minutes: number | null;
      status: string;
    }>;
  };
};

type ReportType = "students" | "payments" | "dues" | "paid" | "expenses" | "attendance";

function toCurrency(value: number) {
  return `Rs. ${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function thirtyDaysAgoString() {
  const date = new Date();
  date.setDate(date.getDate() - 29);
  return date.toISOString().slice(0, 10);
}

export function OwnerReportsManager() {
  const [reports, setReports] = useState<ReportsResponse["data"] | null>(null);
  const [fromDate, setFromDate] = useState(thirtyDaysAgoString());
  const [toDate, setToDate] = useState(todayString());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingKey, setExportingKey] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exportsOpen, setExportsOpen] = useState(false);
  const [previewsOpen, setPreviewsOpen] = useState(false);
  const [previewTab, setPreviewTab] = useState<"students" | "payments" | "expenses" | "attendance">("students");

  async function loadReports(nextFrom = fromDate, nextTo = toDate) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (nextFrom) params.set("fromDate", nextFrom);
      if (nextTo) params.set("toDate", nextTo);
      const response = await apiFetch<ReportsResponse>(`/owner/reports?${params.toString()}`);
      setReports(response.data);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load reports.");
    } finally {
      setLoading(false);
    }
  }

  async function exportReport(reportType: ReportType, format: "xlsx" | "pdf") {
    setExportingKey(`${reportType}:${format}`);
    try {
      const params = new URLSearchParams({
        reportType,
        format,
      });
      if (fromDate) params.set("fromDate", fromDate);
      if (toDate) params.set("toDate", toDate);

      const headers = new Headers();
      const csrfToken = readSession()?.csrfToken;
      if (csrfToken) {
        headers.set("X-CSRF-Token", csrfToken);
      }

      const response = await fetch(`${getApiBaseUrl()}/v1/owner/reports/export?${params.toString()}`, {
        method: "GET",
        credentials: "include",
        headers,
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const disposition = response.headers.get("Content-Disposition");
      const match = disposition?.match(/filename=\"?([^"]+)\"?/);
      anchor.href = url;
      anchor.download = match?.[1] ?? `${reportType}.${format}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Unable to export report.");
    } finally {
      setExportingKey(null);
    }
  }

  useEffect(() => {
    void loadReports();
  }, []);

  const insightCards = useMemo(() => {
    if (!reports) return [];
    return [
      { label: "Paid revenue", value: toCurrency(reports.metrics.paidRevenue), note: "Selected range" },
      { label: "Due revenue", value: toCurrency(reports.metrics.dueRevenue), note: "Collections pipeline" },
      { label: "Expenses", value: toCurrency(reports.metrics.expenses), note: "Owner outflow" },
      { label: "Occupancy", value: `${reports.metrics.occupancyPercent}%`, note: "Current fill rate" },
    ];
  }, [reports]);

  if (loading && !reports) {
    return <p className="text-sm text-slate-500">{error ?? "Loading report center..."}</p>;
  }

  if (!reports) {
    return <p className="text-sm text-slate-500">{error ?? "Unable to load reports."}</p>;
  }

  const chartScale = Math.max(...reports.monthlyComparison.map((item) => Math.max(item.revenue, item.expenses, 1)), 1);
  const categoryTotal = Math.max(...reports.expenseCategorySplit.map((item) => item.amount), 1);

  return (
    <div className="grid gap-6">
      {error ? <p className="text-sm font-semibold text-amber-700">{error}</p> : null}

      <DashboardCard title="Custom report window" subtitle="Date range aur exports ko compact rakho, insights ko primary rakho">
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-black text-slate-950">Report filters</p>
              <p className="mt-1 text-sm text-slate-500">{fromDate} to {toDate}</p>
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen((current) => !current)}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-700"
            >
              {filtersOpen ? "Hide filters" : "Show filters"}
            </button>
          </div>
          {filtersOpen ? (
            <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
              <label className="grid gap-2 text-sm font-semibold text-slate-600">
                From date
                <input
                  type="date"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-600">
                To date
                <input
                  type="date"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                />
              </label>
              <button
                type="button"
                onClick={() => void loadReports(fromDate, toDate)}
                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white md:self-end"
              >
                Refresh report
              </button>
            </div>
          ) : null}
        </div>
      </DashboardCard>

      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {insightCards.map((card) => (
          <div key={card.label} className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">{card.label}</p>
            <p className="mt-3 text-3xl font-black text-slate-950">{card.value}</p>
            <p className="mt-2 text-sm text-slate-500">{card.note}</p>
          </div>
        ))}
      </section>

      <DashboardCard title="Server exports" subtitle="Keep exports tucked away until you actually need a file">
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-black text-slate-950">Export center</p>
              <p className="mt-1 text-sm text-slate-500">True XLSX/PDF download actions.</p>
            </div>
            <button
              type="button"
              onClick={() => setExportsOpen((current) => !current)}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-700"
            >
              {exportsOpen ? "Hide exports" : "Show exports"}
            </button>
          </div>
          {exportsOpen ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {[
                ["students", "Student list"],
                ["payments", "All payments"],
                ["dues", "Due payments"],
                ["paid", "Paid payments"],
                ["expenses", "Expenses"],
                ["attendance", "Attendance"],
              ].map(([reportType, label]) => (
                <div key={reportType} className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                  <p className="font-black text-slate-950">{label}</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => void exportReport(reportType as ReportType, "xlsx")}
                      className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white"
                    >
                      {exportingKey === `${reportType}:xlsx` ? "Preparing..." : "Download XLSX"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void exportReport(reportType as ReportType, "pdf")}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700"
                    >
                      {exportingKey === `${reportType}:pdf` ? "Preparing..." : "Download PDF"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[1rem] border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">Export buttons hidden hain. Download ke time open karo.</div>
          )}
        </div>
      </DashboardCard>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <DashboardCard title="Monthly comparison" subtitle="Revenue, expense, and profit trend over the last six months">
          <div className="grid gap-4">
            {reports.monthlyComparison.map((point) => (
              <div key={point.month} className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-black text-slate-950">{point.month}</p>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                    Profit {toCurrency(point.profit)}
                  </p>
                </div>
                <div className="mt-3 grid gap-2">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs font-bold text-slate-500">
                      <span>Revenue</span>
                      <span>{toCurrency(point.revenue)}</span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100">
                      <div className="h-3 rounded-full bg-emerald-500" style={{ width: `${Math.max(6, Math.round((point.revenue / chartScale) * 100))}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs font-bold text-slate-500">
                      <span>Expenses</span>
                      <span>{toCurrency(point.expenses)}</span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100">
                      <div className="h-3 rounded-full bg-rose-500" style={{ width: `${Math.max(6, Math.round((point.expenses / chartScale) * 100))}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard title="Category split" subtitle="Where money is leaking and where collections stand">
          <div className="grid gap-4">
            <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Payment mix</p>
              <div className="mt-4 grid gap-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-600">Paid</span>
                  <span className="font-black text-emerald-700">{toCurrency(reports.paymentCategorySplit.paid)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-600">Due</span>
                  <span className="font-black text-amber-700">{toCurrency(reports.paymentCategorySplit.due)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-600">Failed</span>
                  <span className="font-black text-rose-700">{toCurrency(reports.paymentCategorySplit.failed)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Expense categories</p>
              <div className="mt-4 grid gap-3">
                {reports.expenseCategorySplit.map((item) => (
                  <div key={item.category}>
                    <div className="mb-1 flex items-center justify-between text-xs font-bold text-slate-500">
                      <span>{item.category}</span>
                      <span>{toCurrency(item.amount)}</span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100">
                      <div className="h-3 rounded-full bg-[var(--lp-primary)]" style={{ width: `${Math.max(8, Math.round((item.amount / categoryTotal) * 100))}%` }} />
                    </div>
                  </div>
                ))}
                {reports.expenseCategorySplit.length === 0 ? <p className="text-sm text-slate-500">No expenses in this date window.</p> : null}
              </div>
            </div>
          </div>
        </DashboardCard>
      </section>

      <section className="grid gap-6">
        <DashboardCard title="Preview workspace" subtitle="Open one operational slice at a time instead of reading everything together">
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-black text-slate-950">Preview panels</p>
                <p className="mt-1 text-sm text-slate-500">Detailed rows ko demand par kholo.</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewsOpen((current) => !current)}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-700"
              >
                {previewsOpen ? "Hide previews" : "Show previews"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                ["students", "Students"],
                ["payments", "Payments"],
                ["expenses", "Expenses"],
                ["attendance", "Attendance"],
              ].map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setPreviewTab(tab as "students" | "payments" | "expenses" | "attendance")}
                  className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.18em] ${
                    previewTab === tab ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {previewsOpen ? (
              <div className="space-y-3">
                {previewTab === "students"
                  ? reports.students.slice(0, 8).map((row) => (
                      <div key={row.assignment_id} className="flex flex-col gap-3 rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-bold text-slate-950">{row.student_name}</p>
                          <p className="text-sm text-slate-500">
                            {row.student_code ?? "-"} | Seat {row.seat_number ?? "-"}
                          </p>
                        </div>
                        <div className="sm:text-right">
                          <p className="font-black text-slate-950">Rs. {Number(row.due_amount).toLocaleString("en-IN")}</p>
                          <p className={`text-xs font-black ${row.payment_status === "PAID" ? "text-emerald-700" : "text-amber-700"}`}>{row.payment_status}</p>
                        </div>
                      </div>
                    ))
                  : null}
                {previewTab === "payments"
                  ? reports.payments.slice(0, 8).map((row) => (
                      <div key={row.id} className="flex flex-col gap-3 rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-bold text-slate-950">{row.student_name}</p>
                          <p className="text-sm text-slate-500">{row.method} | {(row.paid_at ?? row.created_at).slice(0, 10)}</p>
                        </div>
                        <div className="sm:text-right">
                          <p className="font-black text-slate-950">Rs. {Number(row.amount).toLocaleString("en-IN")}</p>
                          <p className={`text-xs font-black ${row.status === "PAID" ? "text-emerald-700" : "text-amber-700"}`}>{row.status}</p>
                        </div>
                      </div>
                    ))
                  : null}
                {previewTab === "expenses"
                  ? reports.expenses.slice(0, 8).map((row) => (
                      <div key={row.id} className="rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-4">
                        <p className="font-bold text-slate-950">{row.title}</p>
                        <p className="mt-1 text-sm text-slate-500">{row.category} | {row.spent_on.slice(0, 10)}</p>
                        <p className="mt-2 text-sm font-black text-rose-700">Rs. {Number(row.amount).toLocaleString("en-IN")}</p>
                      </div>
                    ))
                  : null}
                {previewTab === "attendance"
                  ? reports.checkins.slice(0, 8).map((row) => (
                      <div key={row.id} className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-bold text-slate-950">{row.student_name}</p>
                            <p className="text-sm text-slate-500">Seat {row.seat_number ?? "-"} | {row.checked_in_at.slice(0, 16).replace("T", " ")}</p>
                          </div>
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{row.status}</p>
                        </div>
                      </div>
                    ))
                  : null}
              </div>
            ) : (
              <div className="rounded-[1rem] border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">Preview rows hidden hain. Review ke time open karo.</div>
            )}
          </div>
        </DashboardCard>
      </section>
    </div>
  );
}
