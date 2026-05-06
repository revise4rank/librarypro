import { DashboardShell } from "../../../components/dashboard-shell";
import { SuperadminDashboardManager } from "../../../components/superadmin-dashboard-manager";
import { adminNav } from "../../../lib/role-nav";

export default function SuperAdminDashboardPage() {
  return (
    <DashboardShell
      productLabel="BookLib"
      panelLabel="Super Admin"
      title="Platform overview"
      description="Revenue, tenant health, renewals, and billing risk."
      nav={adminNav}
    >
      <SuperadminDashboardManager />
    </DashboardShell>
  );
}
