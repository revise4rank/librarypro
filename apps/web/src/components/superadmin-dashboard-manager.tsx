"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";
import { StatCard } from "./stat-card";

type DashboardResponse = {
  success: boolean;
  data: {
    metrics: {
      mrr: string;
      active_libraries: string;
      overdue_renewals: string;
      failed_payments: string;
    };
    watchlist: Array<{
      id: string;
      name: string;
      city: string;
      owner_name: string;
      plan_name: string;
      subscription_status: string;
    }>;
    recentPayments: Array<{
      id: string;
      library_name: string;
      amount: string;
      status: string;
      reference_no: string;
      created_at: string;
    }>;
  };
};

export function SuperadminDashboardManager() {
  const [data, setData] = useState<DashboardResponse["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const response = await apiFetch<DashboardResponse>("/admin/dashboard");
        setData(response.data);
        setError(null);
      } catch (loadError) {
        setData({
          metrics: {
            mrr: "0",
            active_libraries: "0",
            overdue_renewals: "0",
            failed_payments: "0",
          },
          watchlist: [],
          recentPayments: [],
        });
        setError(loadError instanceof Error ? loadError.message : "Unable to load admin dashboard.");
      }
    }

    void loadDashboard();
  }, []);

  if (!data) return null;

  const stats = [
    { label: "MRR", value: `Rs. ${data.metrics.mrr}` },
    { label: "Active Libraries", value: data.metrics.active_libraries },
    { label: "Renewals Due", value: data.metrics.overdue_renewals },
    { label: "Failed Payments", value: data.metrics.failed_payments },
  ];

  return (
    <div className="grid gap-4">
      {error ? <p className="text-sm font-semibold text-amber-700">{error}</p> : null}
      <section className="rounded-lg border border-[var(--lp-border)] bg-[var(--lp-surface)] p-4 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--lp-accent)]">Platform Control</p>
        <h2 className="mt-2 text-[1.25rem] font-semibold tracking-tight text-[var(--lp-text)]">
          Platform health, renewals, and risk in one view.
        </h2>
      </section>
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <StatCard key={item.label} label={item.label} value={item.value} />
        ))}
      </section>
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <DashboardCard title="Tenant watchlist" subtitle="Who needs admin attention right now">
          <div className="space-y-3">
            {data.watchlist.map((library) => (
              <div key={library.id} className="rounded-xl border border-slate-200 bg-white px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-950">{library.name}</p>
                    <p className="text-sm text-slate-500">{library.city} | {library.owner_name}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">{library.subscription_status}</span>
                </div>
              </div>
            ))}
            {data.watchlist.length === 0 ? <p className="text-sm text-slate-500">No tenant watchlist items found.</p> : null}
          </div>
        </DashboardCard>
        <DashboardCard title="Recent platform charges" subtitle="Subscription billing stream">
          <div className="space-y-3">
            {data.recentPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4">
                <div>
                  <p className="font-black text-slate-950">{payment.library_name}</p>
                  <p className="text-sm text-slate-500">{payment.reference_no} | {payment.created_at.slice(0, 10)}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-slate-950">Rs. {payment.amount}</p>
                  <p className={`text-xs font-black ${payment.status === "PAID" ? "text-emerald-700" : payment.status === "FAILED" ? "text-rose-700" : "text-amber-700"}`}>{payment.status}</p>
                </div>
              </div>
            ))}
            {data.recentPayments.length === 0 ? <p className="text-sm text-slate-500">No platform payments found.</p> : null}
          </div>
        </DashboardCard>
      </section>
    </div>
  );
}
