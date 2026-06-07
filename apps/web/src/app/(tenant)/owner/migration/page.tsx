import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerMigrationManager } from "../../../../components/owner-migration-manager";
import { ownerNav } from "../../../../lib/role-nav";

export default function OwnerMigrationPage() {
  return (
    <DashboardShell
      productLabel="BookLib"
      panelLabel="Migration"
      title="Offline Data Migration"
      description="Import existing Excel/CSV students, seats, plans, payments, and login credentials safely."
      nav={ownerNav}
    >
      <OwnerMigrationManager />
    </DashboardShell>
  );
}
