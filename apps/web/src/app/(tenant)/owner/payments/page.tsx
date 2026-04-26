import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerPaymentsManager } from "../../../../components/owner-payments-manager";
import { ownerNav } from "../../../../lib/role-nav";
import Link from "next/link";

export default function OwnerPaymentsPage() {
  return (
    <DashboardShell
      productLabel="LibraryPro"
      panelLabel="Revenue"
      title="Track collections, dues, and manual entries from one cleaner revenue desk."
      description="Designed for quick cash or UPI entries, due recovery, and a calmer mobile ledger."
      nav={ownerNav}
      actions={
        <>
          <Link href="/owner/reports" className="rounded-[0.95rem] border border-[var(--lp-border)] bg-[var(--lp-surface)] px-4 py-2.5 text-sm font-bold text-[var(--lp-primary)]">
            Open reports
          </Link>
          <Link href="/owner/notifications" className="rounded-[0.95rem] bg-[var(--lp-accent-soft)] px-4 py-2.5 text-sm font-bold text-[var(--lp-accent)]">
            Due reminders
          </Link>
        </>
      }
    >
      <OwnerPaymentsManager />
    </DashboardShell>
  );
}
