import Link from "next/link";
import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerDashboardManager } from "../../../../components/owner-dashboard-manager";
import { ownerNav } from "../../../../lib/role-nav";

export default function OwnerDashboardPage() {
  return (
    <DashboardShell
      productLabel="Nextlib"
      panelLabel="Owner Panel"
      title="Daily library operations, revenue, seat control, and public growth from one dashboard."
      description="Real owner control room for finance, occupancy, dues, and student operations. This page now pulls live backend data instead of mock stats."
      nav={ownerNav}
      actions={
        <>
          <Link href="/owner/seats" className="rounded-full bg-[var(--lp-primary)] px-5 py-3 text-sm font-bold text-white">
            Open seat control
          </Link>
          <Link href="/owner/website" className="rounded-full border border-[var(--lp-border)] bg-[var(--lp-surface)] px-5 py-3 text-sm font-bold text-[var(--lp-text)]">
            Edit public website
          </Link>
        </>
      }
    >
      <OwnerDashboardManager />
    </DashboardShell>
  );
}
