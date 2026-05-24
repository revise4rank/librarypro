import { DashboardShell } from "../../../../components/dashboard-shell";
import { StudentPaymentsManager } from "../../../../components/student-payments-manager";
import { StudentWorkspaceActions } from "../../../../components/student-workspace-actions";
import { studentNav, studentNavGroups } from "../../../../lib/role-nav";

export default function StudentPaymentsPage() {
  return (
    <DashboardShell
      productLabel="Nextlib"
      panelLabel="Payments"
      title="Track dues, receipts, and payment actions without confusion."
      description="Billing should feel simple for students: current status at the top, latest receipts below, and clear actions for renewal or support."
      nav={studentNav}
      navGroups={studentNavGroups}
      actions={<StudentWorkspaceActions />}
    >
      <StudentPaymentsManager />
    </DashboardShell>
  );
}
