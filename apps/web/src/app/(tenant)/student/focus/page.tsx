import { DashboardShell } from "../../../../components/dashboard-shell";
import { StudentFocusManager } from "../../../../components/student-focus-manager";
import { StudentWorkspaceActions } from "../../../../components/student-workspace-actions";
import { studentNav } from "../../../../lib/role-nav";

export default function StudentFocusPage() {
  return (
    <DashboardShell
      productLabel="LibraryPro"
      panelLabel="Focus Tracker"
      title="Pomodoro, subjects, goals, and long-term study tracking in one student workspace."
      description="Keep the app useful beyond the library visit: set daily targets, log sessions, and track study consistency over time."
      nav={studentNav}
      actions={<StudentWorkspaceActions />}
    >
      <StudentFocusManager />
    </DashboardShell>
  );
}
