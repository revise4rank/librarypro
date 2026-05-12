import { DashboardShell } from "../../../../components/dashboard-shell";
import { StudentSectionTabs } from "../../../../components/student-section-tabs";
import { StudentRewardsManager } from "../../../../components/student-rewards-manager";
import { StudentWorkspaceActions } from "../../../../components/student-workspace-actions";
import { studentNav } from "../../../../lib/role-nav";

export default function StudentRewardsPage() {
  return (
    <DashboardShell
      productLabel="BookLib"
      panelLabel="Rewards"
      title="See streaks, badges, and momentum signals in one compact rewards view."
      description="Keep motivation visible with earned milestones, long-term consistency, and a simple timeline of progress."
      nav={studentNav}
      actions={<StudentWorkspaceActions />}
    >
      <div className="grid gap-4">
        <StudentSectionTabs active="tools" />
        <StudentRewardsManager />
      </div>
    </DashboardShell>
  );
}
