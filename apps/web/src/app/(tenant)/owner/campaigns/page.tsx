import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerCampaignsManager } from "../../../../components/owner-campaigns-manager";
import { ownerNav } from "../../../../lib/role-nav";

export default function OwnerCampaignsPage() {
  return (
    <DashboardShell
      productLabel="Nextlib"
      panelLabel="Campaign Center"
      title="Push offers, run due recovery, and improve marketplace conversion from one place."
      description="Campaign center controls the offer students see on marketplace cards and your public library website, while due-recovery reminders can be sent instantly."
      nav={ownerNav}
    >
      <OwnerCampaignsManager />
    </DashboardShell>
  );
}
