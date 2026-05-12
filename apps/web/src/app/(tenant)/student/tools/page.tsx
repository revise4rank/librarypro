import { DashboardShell } from "../../../../components/dashboard-shell";
import { StudentToolsManager } from "../../../../components/student-tools-manager";
import { StudentWorkspaceActions } from "../../../../components/student-workspace-actions";
import { studentNav } from "../../../../lib/role-nav";

export default function StudentToolsPage() {
  return (
    <DashboardShell
      productLabel="BookLib"
      panelLabel="Study Tools"
      title="Revision, rewards, focus mode, feed, and optional offers in one tools shelf."
      description="Study utilities now stay separate from your library access screen, so daily operations do not mix with learning workflows."
      nav={studentNav}
      actions={<StudentWorkspaceActions />}
    >
      <StudentToolsManager />
    </DashboardShell>
  );
}
