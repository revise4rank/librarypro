import { DashboardShell } from "../../../../components/dashboard-shell";
import { StudentFeedManager } from "../../../../components/student-feed-manager";
import { StudentWorkspaceActions } from "../../../../components/student-workspace-actions";
import { studentNav } from "../../../../lib/role-nav";

export default function StudentFeedPage() {
  return (
    <DashboardShell
      productLabel="LibraryPro"
      panelLabel="Library Feed"
      title="Progress sharing with privacy control, motivation, and clean accountability."
      description="This feed stays intentionally lightweight so students can share progress responsibly without turning the app into a distraction loop."
      nav={studentNav}
      actions={<StudentWorkspaceActions />}
    >
      <StudentFeedManager />
    </DashboardShell>
  );
}
