import { DashboardShell } from "../../../components/dashboard-shell";
import { SuperadminAccessManager } from "../../../components/superadmin-access-manager";
import { adminNav } from "../../../lib/role-nav";

export default function SuperAdminAccessPage() {
  return (
    <DashboardShell
      productLabel="BookLib"
      panelLabel="Access"
      title="Superadmin access"
      description="Create platform admins and manage granular access."
      nav={adminNav}
    >
      <SuperadminAccessManager />
    </DashboardShell>
  );
}
