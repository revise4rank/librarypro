import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerBillingManager } from "../../../../components/owner-billing-manager";
import { ownerNav } from "../../../../lib/role-nav";

export default function OwnerBillingPage() {
  return (
    <DashboardShell
      productLabel="LibraryPro"
      panelLabel="Billing"
      title="Keep plan access active, review renewal state, and track platform billing."
      description="Billing stays reachable even when the plan expires, so the library can recover access quickly without losing workspace data."
      nav={ownerNav}
    >
      <OwnerBillingManager />
    </DashboardShell>
  );
}
