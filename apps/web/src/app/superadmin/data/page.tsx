import { DashboardShell } from "../../../components/dashboard-shell";
import { SuperadminDataManager } from "../../../components/superadmin-data-manager";
import { adminNav } from "../../../lib/role-nav";

export default function SuperadminDataPage() {
  return (
    <DashboardShell
      productLabel="LibraryPro"
      panelLabel="Data"
      title="Platform data"
      description="Read-only operational data overview for super admin decisions."
      nav={adminNav}
    >
      <SuperadminDataManager />
    </DashboardShell>
  );
}
