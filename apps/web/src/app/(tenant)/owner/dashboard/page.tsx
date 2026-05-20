import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerDashboardManager } from "../../../../components/owner-dashboard-manager";
import { ownerNav } from "../../../../lib/role-nav";

export default function OwnerDashboardPage() {
  return (
    <DashboardShell
      productLabel="BookLib"
      panelLabel="Owner App"
      title="Admissions first. Roster next. Seats only when they are ready."
      description="Run new onboarding from Admissions, manage active students from the roster, and handle seat allotment only when needed."
      nav={ownerNav}
    >
      <OwnerDashboardManager />
    </DashboardShell>
  );
}
