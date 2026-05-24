import { DashboardShell } from "../../../../components/dashboard-shell";
import { StudentSectionTabs } from "../../../../components/student-section-tabs";
import { StudentPlannerManager } from "../../../../components/student-planner-manager";
import { studentNav } from "../../../../lib/role-nav";

export default function StudentPlannerPage() {
  return (
    <DashboardShell
      productLabel="BookLib"
      panelLabel="Study Planner"
      title="Plan your study sessions and track what you actually study every day."
      description="Set daily targets by subject, log actual time, and see your weekly and monthly progress at a glance."
      nav={studentNav}
    >
      <div className="grid gap-4">
        <StudentSectionTabs active="study" />
        <StudentPlannerManager />
      </div>
    </DashboardShell>
  );
}
