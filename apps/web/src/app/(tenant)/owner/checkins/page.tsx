import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerCheckinsManager } from "../../../../components/owner-checkins-manager";
import { ownerNav } from "../../../../lib/role-nav";
import Link from "next/link";

export default function OwnerCheckinsPage() {
  return (
    <DashboardShell
      productLabel="LibraryPro"
      panelLabel="Attendance"
      title="Track live attendance, who is inside, and overstay risk from one clean register."
      description="Designed for daily QR attendance checks, fast search, and a calmer inside/outside register view."
      nav={ownerNav}
      actions={
        <>
          <Link href="/owner/notifications" className="rounded-[0.95rem] border border-[var(--lp-border)] bg-[var(--lp-surface)] px-4 py-2.5 text-sm font-bold text-[var(--lp-primary)]">
            Alerts
          </Link>
          <Link href="/owner/reports" className="rounded-[0.95rem] bg-[var(--lp-accent-soft)] px-4 py-2.5 text-sm font-bold text-[var(--lp-accent)]">
            Open report
          </Link>
        </>
      }
    >
      <OwnerCheckinsManager />
    </DashboardShell>
  );
}
