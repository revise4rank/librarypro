import { DashboardShell } from "../../../components/dashboard-shell";
import { SuperadminBookRequestsManager } from "../../../components/superadmin-book-requests-manager";
import { adminNav } from "../../../lib/role-nav";

export default function SuperadminBookRequestsPage() {
  return (
    <DashboardShell
      productLabel="BookLib"
      panelLabel="Books"
      title="Book requests"
      description="Review student book requests and table-of-content uploads at platform level."
      nav={adminNav}
    >
      <SuperadminBookRequestsManager />
    </DashboardShell>
  );
}
