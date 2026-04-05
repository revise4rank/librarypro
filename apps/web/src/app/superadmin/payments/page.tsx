import { DashboardShell } from "../../../components/dashboard-shell";
import { SuperadminPaymentsManager } from "../../../components/superadmin-payments-manager";
import { adminNav } from "../../../lib/role-nav";

export default function SuperAdminPaymentsPage() {
  return (
    <DashboardShell
      productLabel="Nextlib"
      panelLabel="Platform Payments"
      title="Subscription payment ledger across all tenant libraries."
      description="This view is for SaaS billing visibility: successful charges, failed recoveries, pending renewals, and platform-level revenue traceability."
      nav={adminNav}
    >
      <SuperadminPaymentsManager />
    </DashboardShell>
  );
}
