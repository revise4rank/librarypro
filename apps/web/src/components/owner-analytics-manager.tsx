"use client";

import { useEffect, useMemo, useState } from "react";
import { displayApiError } from "../lib/api";
import { fetchOwnerReports } from "../lib/owner-finance";
import { DashboardCard } from "./dashboard-shell";
import { isPlanAccessMessage, PlanAccessNotice } from "./plan-access-notice";
import { StatCard } from "./stat-card";

type AnalyticsResponse = {
  success: boolean;
  data: {
    metrics: {
      totalStudents: number;
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
  };
};

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

export function OwnerAnalyticsManager() {
  const [data, setData] = useState<AnalyticsResponse["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const response = await fetchOwnerReports(thirtyDaysAgoString(), todayString()) as AnalyticsResponse;
        setData(response.data);
        setError(null);
      } catch (loadError) {
        setError(displayApiError(loadError, "Unable to load analytics."));
      }
    }

    void loadAnalytics();
  }, []);

  const scale = useMemo(() => {
    if (!data) return 1;
    return Math.max(...data.monthlyComparison.map((item) => Math.max(item.revenue, item.expenses, Math.abs(item.profit), 1)), 1);
  }, [data]);

  if (error && isPlanAccessMessage(error)) {
    return <PlanAccessNotice message={error} />;
  }

  if (!data) {
    return <DashboardCard title="Analytics" subtitle="Loading owner analytics...">{error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}</DashboardCard>;
  }

  return (
    <div className="grid gap-4">
      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Occupancy" value={`${data.metrics.occupancyPercent}%`} note="Seat usage signal" />
        <StatCard label="Check-ins" value={data.metrics.checkins.toLocaleString("en-IN")} note="Selected window" />
        <StatCard label="Due money" value={toCurrency(data.metrics.dueRevenue)} note="Collection focus" />
        <StatCard label="Profit" value={toCurrency(data.metrics.monthlyProfit)} note="Revenue - expense" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <DashboardCard title="Revenue health" subtitle="Compact trend view for quick decisions">
          <div className="grid gap-3">
            {data.monthlyComparison.map((point) => (
              <div key={point.month} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black text-slate-950">{point.month}</p>
                  <p className={`text-sm font-black ${point.profit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{toCurrency(point.profit)}</p>
                </div>
                <div className="mt-2 grid gap-1.5">
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.max(5, Math.round((point.revenue / scale) * 100))}%` }} />
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-rose-500" style={{ width: `${Math.max(5, Math.round((point.expenses / scale) * 100))}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard title="Money split" subtitle="Paid, due, failed, and expense categories">
          <div className="grid gap-3">
            {[
              ["Paid", data.paymentCategorySplit.paid, "text-emerald-700"],
              ["Due", data.paymentCategorySplit.due, "text-amber-700"],
              ["Failed", data.paymentCategorySplit.failed, "text-rose-700"],
            ].map(([label, value, tone]) => (
              <div key={label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="font-semibold text-slate-600">{label}</span>
                <span className={`font-black ${tone}`}>{toCurrency(Number(value))}</span>
              </div>
            ))}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {data.expenseCategorySplit.map((item) => (
                <div key={item.category} className="w-40 shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <p className="truncate text-xs font-black uppercase tracking-[0.16em] text-slate-400">{item.category}</p>
                  <p className="mt-1 text-base font-black text-slate-950">{toCurrency(item.amount)}</p>
                </div>
              ))}
            </div>
          </div>
        </DashboardCard>
      </section>
    </div>
  );
}
