import { DashboardShell } from "../../../components/dashboard-shell";
import { SuperadminPaymentsManager } from "../../../components/superadmin-payments-manager";
import { adminNav } from "../../../lib/role-nav";

export default function SuperAdminPaymentsPage() {
  return (
    <DashboardShell
      productLabel="LibraryPro"
      panelLabel="Platform Payments"
      title="Platform payments"
      description="Subscription ledger, failed recovery, and renewal visibility."
      nav={adminNav}
    >
      <SuperadminPaymentsManager />
    </DashboardShell>
  );
}
