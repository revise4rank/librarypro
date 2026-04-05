import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerBillingManager } from "../../../../components/owner-billing-manager";
import { ownerNav } from "../../../../lib/role-nav";

export default function OwnerBillingPage() {
  return (
    <DashboardShell
      productLabel="Nextlib"
      panelLabel="Billing"
      title="Renew plan, inspect subscription state, and track platform payments."
      description="When owner access expires, billing and renewal remain available so the library can recover access without losing its workspace."
      nav={ownerNav}
    >
      <OwnerBillingManager />
    </DashboardShell>
  );
}
