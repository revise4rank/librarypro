import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerActionsManager } from "../../../../components/owner-actions-manager";
import { ownerNav, ownerNavGroups } from "../../../../lib/role-nav";

export default function OwnerActionsPage() {
  return (
    <DashboardShell
      productLabel="Nextlib"
      panelLabel="Owner Panel"
      title="Quick actions for daily library operations."
      description="Fastest paths for admissions, payments, expenses, notices, and reports — everything an owner does every day."
      nav={ownerNav}
      navGroups={ownerNavGroups}
    >
      <OwnerActionsManager />
    </DashboardShell>
  );
}
