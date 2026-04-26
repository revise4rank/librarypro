import { DashboardShell } from "../../../../components/dashboard-shell";
import { StudentRevisionManager } from "../../../../components/student-revision-manager";
import { StudentWorkspaceActions } from "../../../../components/student-workspace-actions";
import { studentNav } from "../../../../lib/role-nav";

export default function StudentRevisionsPage() {
  return (
    <DashboardShell
      productLabel="LibraryPro"
      panelLabel="Revision Dashboard"
      title="Smart spaced revision that helps you remember, not just finish."
      description="Build a spaced queue across 1, 3, 7, and 15 day checkpoints so weak topics stay visible and overdue recall gets cleared on time."
      nav={studentNav}
      actions={<StudentWorkspaceActions />}
    >
      <StudentRevisionManager />
    </DashboardShell>
  );
}
