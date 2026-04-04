import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerNotificationsManager } from "../../../../components/owner-notifications-manager";
import { ownerNav } from "../../../../lib/role-nav";

export default function OwnerNotificationsPage() {
  return (
    <DashboardShell
      productLabel="LibraryPro"
      panelLabel="Broadcasts"
      title="Send reminders, expiry alerts, and general notices from one clean message center."
      description="Owners need a usable message composer with audience targeting and a visible campaign history."
      nav={ownerNav}
    >
      <OwnerNotificationsManager />
    </DashboardShell>
  );
}
