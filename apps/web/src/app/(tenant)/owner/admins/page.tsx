import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerAdminsManager } from "../../../../components/owner-admins-manager";
import { ownerNav } from "../../../../lib/role-nav";

export default function OwnerAdminsPage() {
  return (
    <DashboardShell
      productLabel="Nextlib"
      panelLabel="Admins"
      title="Head admin can manage multiple library admins from one place."
      description="Every admin can see shared actions. Head admin creates and removes panel users for the same library workspace."
      nav={ownerNav}
    >
      <OwnerAdminsManager />
    </DashboardShell>
  );
}
