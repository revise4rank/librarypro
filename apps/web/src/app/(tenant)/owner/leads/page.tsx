import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerMarketingManager } from "../../../../components/owner-marketing-manager";
import { ownerNav } from "../../../../lib/role-nav";

export default function OwnerLeadsPage() {
  return (
    <DashboardShell
      productLabel="LibraryPro"
      panelLabel="Marketing"
      title="Lead inbox"
      description="Marketing surfaces are grouped together so conversion work stays in one module."
      nav={ownerNav}
    >
      <OwnerMarketingManager initialTab="leads" />
    </DashboardShell>
  );
}
