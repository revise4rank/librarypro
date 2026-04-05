import { DashboardShell } from "../../../../components/dashboard-shell";
import { StudentFeedManager } from "../../../../components/student-feed-manager";
import { StudentWorkspaceActions } from "../../../../components/student-workspace-actions";
import { studentNav } from "../../../../lib/role-nav";

export default function StudentFeedPage() {
  return (
    <DashboardShell
      productLabel="Nextlib"
      panelLabel="Library Feed"
      title="Progress sharing with privacy control, motivation, and clean accountability."
      description="Yeh distraction nahi hai. Yeh ek minimal library feed hai jahan students apni progress responsibly share kar sakte hain."
      nav={studentNav}
      actions={<StudentWorkspaceActions />}
    >
      <StudentFeedManager />
    </DashboardShell>
  );
}
