import Link from "next/link";
import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerPlansManager } from "../../../../components/owner-plans-manager";
import { ownerNav } from "../../../../lib/role-nav";

export default function OwnerPlansPage() {
  return (
    <DashboardShell
      productLabel="BookLib"
      panelLabel="Plans"
      title="Student Plans"
      description="Create and manage reusable student admission plans without entering the settings hub."
      nav={ownerNav}
      actions={
        <Link href="/owner/coupons" className="rounded-lg border border-[var(--lp-border)] bg-[var(--lp-surface)] px-4 py-2 text-sm font-semibold text-[var(--lp-text)]">
          Open coupons
        </Link>
      }
    >
      <OwnerPlansManager />
    </DashboardShell>
  );
}
