import Link from "next/link";
import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerReportsManager } from "../../../../components/owner-reports-manager";
import { ownerNav } from "../../../../lib/role-nav";

export default function OwnerReportsPage() {
  return (
    <DashboardShell
      productLabel="LibraryPro"
      panelLabel="Reports"
      title="Review revenue, attendance, expenses, and exports from one report app."
      description="A cleaner reporting workspace for business snapshots, export files, and operational previews."
      nav={ownerNav}
      actions={
        <>
          <Link href="/owner/payments" className="rounded-lg border border-[var(--lp-border)] bg-[var(--lp-surface)] px-4 py-2.5 text-sm font-bold text-[var(--lp-primary)]">
            Open revenue
          </Link>
          <Link href="/owner/checkins" className="rounded-lg bg-[var(--lp-accent-soft)] px-4 py-2.5 text-sm font-bold text-[var(--lp-accent)]">
            Open attendance
          </Link>
        </>
      }
    >
      <OwnerReportsManager />
    </DashboardShell>
  );
}
