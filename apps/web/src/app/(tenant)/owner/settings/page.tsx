import Link from "next/link";
import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerSettingsManager, type OwnerSettingsTab } from "../../../../components/owner-settings-manager";
import { ownerNav } from "../../../../lib/role-nav";

export default function OwnerSettingsPage({ searchParams }: { searchParams?: { tab?: string } }) {
  const requestedTab = searchParams?.tab;
  const allowedTabs = new Set<OwnerSettingsTab>(["profile", "plans", "account", "website", "team", "billing"]);
  const initialTab = allowedTabs.has(requestedTab as OwnerSettingsTab) ? (requestedTab as OwnerSettingsTab) : "profile";

  return (
    <DashboardShell
      productLabel="LibraryPro"
      panelLabel="Settings"
      title="Settings"
      description="Manage library profile, pricing plans, coupons, account, website, team access, and billing from one settings hub."
      nav={ownerNav}
      actions={
        <Link href="/owner/dashboard" className="rounded-lg border border-[var(--lp-border)] bg-[var(--lp-surface)] px-4 py-2 text-sm font-semibold text-[var(--lp-text)]">
          Dashboard
        </Link>
      }
    >
      <OwnerSettingsManager initialTab={initialTab} />
    </DashboardShell>
  );
}
