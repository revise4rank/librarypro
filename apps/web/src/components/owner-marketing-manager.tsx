"use client";

import Link from "next/link";
import { DashboardCard } from "./dashboard-shell";

export type OwnerMarketingTab = "leads" | "campaigns" | "offers";

const tabs: Array<{ id: OwnerMarketingTab; label: string; summary: string }> = [
  { id: "leads", label: "Lead inbox", summary: "Capture and follow up from one conversion queue." },
  { id: "campaigns", label: "Campaigns", summary: "Run growth and due-recovery actions without leaving the module." },
  { id: "offers", label: "Offers", summary: "Manage moderated promotions and marketplace visibility." },
];

export function OwnerMarketingManager() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {tabs.map((tab) => (
        <DashboardCard key={tab.id} title={tab.label} subtitle={tab.summary}>
          <div className="grid min-h-40 content-between gap-4">
            <p className="text-sm leading-6 text-slate-600">{tab.summary}</p>
            <Link
              href={`/owner/${tab.id}`}
              className="inline-flex justify-center rounded-full border border-[var(--lp-accent-soft)] bg-[var(--lp-accent-soft)] px-5 py-3 text-sm font-black text-[var(--lp-accent-strong)]"
            >
              Open {tab.label}
            </Link>
          </div>
        </DashboardCard>
      ))}
    </div>
  );
}
