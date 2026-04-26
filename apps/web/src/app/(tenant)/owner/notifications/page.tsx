import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerNotificationsManager } from "../../../../components/owner-notifications-manager";
import { ownerNav } from "../../../../lib/role-nav";

export default function OwnerNotificationsPage() {
  return (
    <DashboardShell
      productLabel="LibraryPro"
      panelLabel="Broadcasts"
      title="Send reminders, expiry alerts, and notices from one calm message center."
      description="Target the right student group, queue offline actions, and keep recent broadcasts visible for the whole team."
      nav={ownerNav}
    >
      <OwnerNotificationsManager />
    </DashboardShell>
  );
}
