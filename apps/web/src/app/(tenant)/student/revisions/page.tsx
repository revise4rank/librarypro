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
      description="Completed topics ke baad 1d, 3d, 7d, 15d revision queue banti hai. Weak topics ko surface rakho aur overdue recall ko clear karo."
      nav={studentNav}
      actions={<StudentWorkspaceActions />}
    >
      <StudentRevisionManager />
    </DashboardShell>
  );
}
