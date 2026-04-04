import { DashboardShell } from "../../../../components/dashboard-shell";
import { StudentSeatManager } from "../../../../components/student-seat-manager";
import { StudentWorkspaceActions } from "../../../../components/student-workspace-actions";
import { studentNav } from "../../../../lib/role-nav";

export default function StudentSeatPage() {
  return (
    <DashboardShell
      productLabel="LibraryPro"
      panelLabel="Seat Info"
      title="Seat assignment, plan validity, and library access details."
      description="Students should be able to confirm their seat and library details quickly, especially before leaving for the library."
      nav={studentNav}
      actions={<StudentWorkspaceActions />}
    >
      <StudentSeatManager />
    </DashboardShell>
  );
}
