import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerBillingManager } from "../../../../components/owner-billing-manager";
import { ownerNav } from "../../../../lib/role-nav";

export default function OwnerBillingPage() {
  return (
    <DashboardShell
      productLabel="LibraryPro"
      panelLabel="Billing"
      title="Billing"
      description="Plan and renewal status."
      nav={ownerNav}
    >
      <OwnerBillingManager />
    </DashboardShell>
  );
}
