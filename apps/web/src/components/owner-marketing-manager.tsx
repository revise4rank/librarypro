"use client";

import { useEffect, useState } from "react";
import { OwnerCampaignsManager } from "./owner-campaigns-manager";
import { DashboardCard } from "./dashboard-shell";
import { OwnerLeadsManager } from "./owner-leads-manager";
import { OwnerOffersManager } from "./owner-offers-manager";

export type OwnerMarketingTab = "leads" | "campaigns" | "offers";

const tabs: Array<{ id: OwnerMarketingTab; label: string; summary: string }> = [
  { id: "leads", label: "Lead inbox", summary: "Capture and follow up from one conversion queue." },
  { id: "campaigns", label: "Campaigns", summary: "Run growth and due-recovery actions without leaving the module." },
  { id: "offers", label: "Offers", summary: "Manage moderated promotions and marketplace visibility." },
];

export function OwnerMarketingManager({ initialTab = "leads" }: { initialTab?: OwnerMarketingTab }) {
  const [activeTab, setActiveTab] = useState<OwnerMarketingTab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const activeConfig = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  return (
    <div className="grid gap-4">
      <DashboardCard title="Marketing module" subtitle="Leads, campaigns, and offers now live in one compact workspace.">
        <div className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? "border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] text-[var(--lp-accent)]"
                    : "border-[var(--lp-border)] bg-white text-[var(--lp-text-soft)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <p className="text-sm leading-6 text-[var(--lp-muted)]">{activeConfig.summary}</p>
        </div>
      </DashboardCard>

      {activeTab === "leads" ? <OwnerLeadsManager /> : null}
      {activeTab === "campaigns" ? <OwnerCampaignsManager /> : null}
      {activeTab === "offers" ? <OwnerOffersManager /> : null}
    </div>
  );
}
