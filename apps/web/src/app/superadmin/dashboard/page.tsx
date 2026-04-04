import { DashboardShell } from "../../../components/dashboard-shell";
import { SuperadminDashboardManager } from "../../../components/superadmin-dashboard-manager";
import { adminNav } from "../../../lib/role-nav";

export default function SuperAdminDashboardPage() {
  return (
    <DashboardShell
      productLabel="LibraryPro"
      panelLabel="Super Admin"
      title="Platform revenue, tenant health, renewals, and billing from one command center."
      description="Superadmin should see the whole SaaS business clearly: growth, failed collections, overdue renewals, and which library owners need intervention."
      nav={adminNav}
    >
      <SuperadminDashboardManager />
    </DashboardShell>
  );
}
