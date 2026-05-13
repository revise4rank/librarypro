import { DashboardShell } from "../../../../components/dashboard-shell";
import { StudentSectionTabs } from "../../../../components/student-section-tabs";
import { StudentReferralsManager } from "../../../../components/student-referrals-manager";
import { StudentWorkspaceActions } from "../../../../components/student-workspace-actions";
import { studentNav } from "../../../../lib/role-nav";

export default function StudentReferralsPage() {
  return (
    <DashboardShell
      productLabel="BookLib"
      panelLabel="Referrals"
      title="Student referrals"
      description="Share your student code and track referral rewards."
      nav={studentNav}
      actions={<StudentWorkspaceActions />}
    >
      <div className="grid gap-4">
        <StudentSectionTabs active="tools" />
        <StudentReferralsManager />
      </div>
    </DashboardShell>
  );
}
