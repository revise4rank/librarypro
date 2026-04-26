import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerMarketingManager } from "../../../../components/owner-marketing-manager";
import { ownerNav } from "../../../../lib/role-nav";

export default function OwnerCampaignsPage() {
  return (
    <DashboardShell
      productLabel="LibraryPro"
      panelLabel="Marketing"
      title="Campaign center"
      description="Marketing surfaces are grouped together so campaign work stays in one module."
      nav={ownerNav}
    >
      <OwnerMarketingManager initialTab="campaigns" />
    </DashboardShell>
  );
}
