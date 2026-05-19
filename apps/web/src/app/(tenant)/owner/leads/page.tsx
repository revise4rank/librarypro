import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerLeadsManager } from "../../../../components/owner-leads-manager";
import { ownerNav } from "../../../../lib/role-nav";

export default function OwnerLeadsPage() {
  return (
    <DashboardShell
      productLabel="BookLib"
      panelLabel="Marketing"
      title="Lead inbox"
      description="Follow up marketplace and website leads from a dedicated conversion workspace."
      nav={ownerNav}
    >
      <OwnerLeadsManager />
    </DashboardShell>
  );
}
