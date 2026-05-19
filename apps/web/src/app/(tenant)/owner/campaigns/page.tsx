import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerCampaignsManager } from "../../../../components/owner-campaigns-manager";
import { ownerNav } from "../../../../lib/role-nav";

export default function OwnerCampaignsPage() {
  return (
    <DashboardShell
      productLabel="BookLib"
      panelLabel="Marketing"
      title="Campaign center"
      description="Tune marketplace highlights, public campaign settings, and due recovery actions."
      nav={ownerNav}
    >
      <OwnerCampaignsManager />
    </DashboardShell>
  );
}
