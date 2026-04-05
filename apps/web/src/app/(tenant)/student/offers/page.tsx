import { DashboardShell } from "../../../../components/dashboard-shell";
import { StudentOffersManager } from "../../../../components/student-offers-manager";
import { StudentWorkspaceActions } from "../../../../components/student-workspace-actions";
import { studentNav } from "../../../../lib/role-nav";

export default function StudentOffersPage() {
  return (
    <DashboardShell
      productLabel="Nextlib"
      panelLabel="Explore Opportunities"
      title="Optional opportunities feed for courses, colleges, coaching, and library discounts."
      description="This section is intentionally separate from your study dashboard. No popups, no focus interruption, no forced ads."
      nav={studentNav}
      actions={<StudentWorkspaceActions />}
    >
      <StudentOffersManager />
    </DashboardShell>
  );
}
