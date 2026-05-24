import { DashboardShell } from "../../../../components/dashboard-shell";
import { StudentNotificationsManager } from "../../../../components/student-notifications-manager";
import { StudentWorkspaceActions } from "../../../../components/student-workspace-actions";
import { studentNav, studentNavGroups } from "../../../../lib/role-nav";

export default function StudentNotificationsPage() {
  return (
    <DashboardShell
      productLabel="Nextlib"
      panelLabel="Notifications"
      title="All reminders, notices, and updates in one student inbox."
      description="Payment reminders and operational updates should be easy to read, with no clutter and no guessing."
      nav={studentNav}
      navGroups={studentNavGroups}
      actions={<StudentWorkspaceActions />}
    >
      <StudentNotificationsManager />
    </DashboardShell>
  );
}
