import Link from "next/link";
import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerCouponsManager } from "../../../../components/owner-coupons-manager";
import { ownerNav } from "../../../../lib/role-nav";

export default function OwnerCouponsPage() {
  return (
    <DashboardShell
      productLabel="BookLib"
      panelLabel="Coupons"
      title="Admission Coupons"
      description="Create and manage coupon codes separately from student plans and marketing offers."
      nav={ownerNav}
      actions={
        <Link href="/owner/plans" className="rounded-lg border border-[var(--lp-border)] bg-[var(--lp-surface)] px-4 py-2 text-sm font-semibold text-[var(--lp-text)]">
          Open plans
        </Link>
      }
    >
      <OwnerCouponsManager />
    </DashboardShell>
  );
}
