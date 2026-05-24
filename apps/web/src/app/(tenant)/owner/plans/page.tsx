import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerPlansManager } from "../../../../components/owner-plans-manager";
import { ownerNav, ownerNavGroups } from "../../../../lib/role-nav";

export default function OwnerPlansPage() {
  return (
    <DashboardShell
      productLabel="Nextlib"
      panelLabel="Owner Panel"
      title="Plan templates"
      description="Create monthly, daily, and shift-based plan templates. Use these during admissions and seat assignment to fill details automatically."
      nav={ownerNav}
      navGroups={ownerNavGroups}
    >
      <OwnerPlansManager />
    </DashboardShell>
  );
}
