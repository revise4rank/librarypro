import { DashboardShell } from "../../../components/dashboard-shell";
import { SuperadminLibrariesManager } from "../../../components/superadmin-libraries-manager";
import { adminNav } from "../../../lib/role-nav";

export default function SuperAdminLibrariesPage() {
  return (
    <DashboardShell
      productLabel="LibraryPro"
      panelLabel="Libraries"
      title="Tenant libraries"
      description="Onboarding, plan fit, and owner status."
      nav={adminNav}
    >
      <SuperadminLibrariesManager />
    </DashboardShell>
  );
}
