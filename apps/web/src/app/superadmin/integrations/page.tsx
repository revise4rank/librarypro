import { DashboardShell } from "../../../components/dashboard-shell";
import { SuperadminIntegrationsManager } from "../../../components/superadmin-integrations-manager";
import { adminNav } from "../../../lib/role-nav";

export default function SuperadminIntegrationsPage() {
  return (
    <DashboardShell
      productLabel="BookLib"
      panelLabel="Integrations"
      title="Platform integrations"
      description="Manage Google Auth, Razorpay, and SMTP values without changing code."
      nav={adminNav}
    >
      <SuperadminIntegrationsManager />
    </DashboardShell>
  );
}
