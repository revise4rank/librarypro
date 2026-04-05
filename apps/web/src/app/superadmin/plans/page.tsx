import { DashboardShell } from "../../../components/dashboard-shell";
import { SuperadminPlansManager } from "../../../components/superadmin-plans-manager";
import { adminNav } from "../../../lib/role-nav";

export default function SuperAdminPlansPage() {
  return (
    <DashboardShell
      productLabel="Nextlib"
      panelLabel="Plans"
      title="Manage SaaS plan catalog and tenant distribution."
      description="Keep pricing, packaging, and adoption visible so the business model stays easy to operate."
      nav={adminNav}
    >
      <SuperadminPlansManager />
    </DashboardShell>
  );
}
