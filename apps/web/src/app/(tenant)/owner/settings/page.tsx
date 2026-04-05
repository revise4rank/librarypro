import Link from "next/link";
import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerSettingsManager } from "../../../../components/owner-settings-manager";
import { ownerNav } from "../../../../lib/role-nav";

export default function OwnerSettingsPage() {
  return (
    <DashboardShell
      productLabel="Nextlib"
      panelLabel="Owner Settings"
      title="Library settings, QR access, WiFi, and subscription state."
      description="Centralized live configuration for notices, WiFi credentials, QR entry, and tenant billing status."
      nav={ownerNav}
      actions={
        <>
          <Link href="/owner/dashboard" className="rounded-full border border-[var(--lp-border)] bg-[var(--lp-surface)] px-5 py-3 text-sm font-bold text-[var(--lp-text)]">
            Back to overview
          </Link>
          <Link href="/owner/website" className="rounded-full bg-[var(--lp-primary)] px-5 py-3 text-sm font-bold text-white">
            Edit public website
          </Link>
        </>
      }
    >
      <OwnerSettingsManager />
    </DashboardShell>
  );
}
