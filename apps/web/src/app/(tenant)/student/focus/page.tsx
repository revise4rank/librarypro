import { DashboardShell } from "../../../../components/dashboard-shell";
import { StudentFocusManager } from "../../../../components/student-focus-manager";
import { StudentWorkspaceActions } from "../../../../components/student-workspace-actions";
import { studentNav } from "../../../../lib/role-nav";

export default function StudentFocusPage() {
  return (
    <DashboardShell
      productLabel="Nextlib"
      panelLabel="Focus Tracker"
      title="Pomodoro, subjects, goals, and long-term study tracking in one student workspace."
      description="Library ke baad bhi app useful rahe: daily target set karo, subjects banao, sessions log karo, aur apni prep consistency track karo."
      nav={studentNav}
      actions={<StudentWorkspaceActions />}
    >
      <StudentFocusManager />
    </DashboardShell>
  );
}
