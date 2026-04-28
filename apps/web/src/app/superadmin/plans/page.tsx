import { DashboardShell } from "../../../components/dashboard-shell";
import { SuperadminPlansManager } from "../../../components/superadmin-plans-manager";
import { adminNav } from "../../../lib/role-nav";

export default function SuperAdminPlansPage() {
  return (
    <DashboardShell
      productLabel="LibraryPro"
      panelLabel="Plans"
      title="Platform plans"
      description="SaaS plan catalog and tenant distribution."
      nav={adminNav}
    >
      <SuperadminPlansManager />
    </DashboardShell>
  );
}
