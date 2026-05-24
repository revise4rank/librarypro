import { DashboardShell } from "../../../../components/dashboard-shell";
import { StudentPlannerManager } from "../../../../components/student-planner-manager";
import { studentNav, studentNavGroups } from "../../../../lib/role-nav";

export default function StudentPlannerPage() {
  return (
    <DashboardShell
      productLabel="Nextlib"
      panelLabel="Student Panel"
      title="Study Planner"
      description="Plan your daily study sessions by subject. Track targets vs actual time and view your weekly and monthly completion."
      nav={studentNav}
      navGroups={studentNavGroups}
    >
      <StudentPlannerManager />
    </DashboardShell>
  );
}
