"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";
import { StatCard } from "./stat-card";

type DataOverview = {
  metrics: Record<string, string>;
  recentAudit: Array<{
    id: string;
    action: string;
    entity_type: string;
    created_at: string;
    actor_name: string | null;
    library_name: string | null;
  }>;
  recentLibraries: Array<{
    id: string;
    name: string;
    city: string;
    status: string;
    total_seats: number;
    available_seats: number;
    owner_name: string;
    subscription_status: string | null;
  }>;
  readableTables: string[];
};

const metricCards = [
  ["Marketplace listings", "marketplace_listings"],
  ["Active libraries", "active_libraries"],
  ["Student accounts", "student_accounts"],
  ["Active admissions", "active_assignments"],
  ["Open seats", "available_seats"],
  ["Unallotted", "unallotted_students"],
  ["Tenant revenue", "tenant_revenue_month"],
  ["Tenant dues", "tenant_dues"],
  ["Platform MRR", "platform_mrr_month"],
  ["Leads 30d", "marketplace_leads_30d"],
  ["Review reports", "open_review_reports"],
  ["Live offers", "live_offers"],
] as const;

function valueFor(metrics: Record<string, string> | undefined, key: string) {
  return metrics?.[key] ?? "0";
}

export function SuperadminDataManager() {
  const [data, setData] = useState<DataOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const response = await apiFetch<{ success: boolean; data: DataOverview }>("/admin/data-overview");
        setData(response.data);
        setError(null);
      } catch (loadError) {
        setData({
          metrics: {},
          recentAudit: [],
          recentLibraries: [],
          readableTables: [],
        });
        setError(loadError instanceof Error ? loadError.message : "Unable to load platform data.");
      }
    }

    void loadData();
  }, []);

  if (!data) return null;

  return (
    <div className="grid gap-4">
      {error ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">{error}</p> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map(([label, key]) => (
          <StatCard key={key} label={label} value={valueFor(data.metrics, key)} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <DashboardCard title="Recent database activity" subtitle="Latest audit events across owners, students, and platform actions.">
          <div className="grid gap-2">
            {data.recentAudit.map((event) => (
              <div key={event.id} className="rounded-lg border border-[var(--lp-border)] bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[var(--lp-text)]">{event.action}</p>
                  <span className="rounded-md bg-[var(--lp-surface-muted)] px-2 py-1 text-xs font-semibold text-[var(--lp-muted)]">
                    {event.created_at.slice(0, 16).replace("T", " ")}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-[var(--lp-muted)]">
                  {event.entity_type} {event.library_name ? `| ${event.library_name}` : ""} {event.actor_name ? `| ${event.actor_name}` : ""}
                </p>
              </div>
            ))}
            {data.recentAudit.length === 0 ? <p className="text-sm text-[var(--lp-muted)]">No audit events yet.</p> : null}
          </div>
        </DashboardCard>

        <DashboardCard title="Tenant health snapshot" subtitle="Recent libraries with owner, subscription, and seat capacity visibility.">
          <div className="grid gap-2">
            {data.recentLibraries.map((library) => (
              <div key={library.id} className="grid gap-2 rounded-lg border border-[var(--lp-border)] bg-white p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--lp-text)]">{library.name}</p>
                  <p className="text-xs leading-5 text-[var(--lp-muted)]">{library.city} | {library.owner_name}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">{library.available_seats}/{library.total_seats} seats</span>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-700">{library.subscription_status ?? library.status}</span>
                </div>
              </div>
            ))}
            {data.recentLibraries.length === 0 ? <p className="text-sm text-[var(--lp-muted)]">No libraries found.</p> : null}
          </div>
        </DashboardCard>
      </section>

      <DashboardCard title="Super admin data access" subtitle="Read-only operational areas available from this page.">
        <div className="flex flex-wrap gap-2">
          {data.readableTables.map((table) => (
            <span key={table} className="rounded-md border border-[var(--lp-border)] bg-white px-2.5 py-1.5 text-xs font-semibold text-[var(--lp-muted)]">
              {table}
            </span>
          ))}
        </div>
      </DashboardCard>
    </div>
  );
}
