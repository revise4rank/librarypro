import { DashboardShell } from "../../../components/dashboard-shell";
import { SuperadminLibrariesManager } from "../../../components/superadmin-libraries-manager";
import { adminNav } from "../../../lib/role-nav";

export default function SuperAdminLibrariesPage() {
  return (
    <DashboardShell
      productLabel="LibraryPro"
      panelLabel="Libraries"
      title="All tenant libraries, plans, and operational status."
      description="A clean multi-tenant view for monitoring onboarding, status, plan fit, and owner relationships."
      nav={adminNav}
    >
      <SuperadminLibrariesManager />
    </DashboardShell>
  );
}
