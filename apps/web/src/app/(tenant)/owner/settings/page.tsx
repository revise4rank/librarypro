import Link from "next/link";
import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerSettingsManager, type OwnerSettingsTab } from "../../../../components/owner-settings-manager";
import { ownerNav } from "../../../../lib/role-nav";

export default function OwnerSettingsPage({ searchParams }: { searchParams?: { tab?: string } }) {
  const requestedTab = searchParams?.tab;
  const allowedTabs = new Set<OwnerSettingsTab>(["profile", "account", "team", "billing"]);
  const initialTab = allowedTabs.has(requestedTab as OwnerSettingsTab) ? (requestedTab as OwnerSettingsTab) : "profile";

  return (
    <DashboardShell
      productLabel="BookLib"
      panelLabel="Settings"
      title="Settings"
      description="Manage library profile, QR/WiFi defaults, account, team access, and billing from one setup hub."
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
