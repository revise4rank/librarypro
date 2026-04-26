import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerMarketingManager } from "../../../../components/owner-marketing-manager";
import { ownerNav } from "../../../../lib/role-nav";

export default function OwnerMarketingPage() {
  return (
    <DashboardShell
      productLabel="LibraryPro"
      panelLabel="Marketing"
      title="Marketing"
      description="Leads, campaigns, and offers now share one compact conversion workspace."
      nav={ownerNav}
    >
      <OwnerMarketingManager initialTab="leads" />
    </DashboardShell>
  );
}
