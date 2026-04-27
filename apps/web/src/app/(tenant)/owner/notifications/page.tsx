import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerNotificationsManager } from "../../../../components/owner-notifications-manager";
import { ownerNav } from "../../../../lib/role-nav";

export default function OwnerNotificationsPage() {
  return (
    <DashboardShell
      productLabel="LibraryPro"
      panelLabel="Broadcasts"
      title="Broadcasts"
      description="Send notices and reminders."
      nav={ownerNav}
    >
      <OwnerNotificationsManager />
    </DashboardShell>
  );
}
