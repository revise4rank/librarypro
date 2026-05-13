import { DashboardShell } from "../../../components/dashboard-shell";
import { SuperadminSyllabusManager } from "../../../components/superadmin-syllabus-manager";
import { adminNav } from "../../../lib/role-nav";

export default function SuperadminSyllabusPage() {
  return (
    <DashboardShell
      productLabel="BookLib"
      panelLabel="Syllabus"
      title="Global syllabus"
      description="Upload and review class-wise syllabus templates visible to students."
      nav={adminNav}
    >
      <SuperadminSyllabusManager />
    </DashboardShell>
  );
}
