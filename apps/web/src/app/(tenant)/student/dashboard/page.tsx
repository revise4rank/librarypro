import { DashboardShell } from "../../../../components/dashboard-shell";
import { StudentDashboardManager } from "../../../../components/student-dashboard-manager";
import { studentNav } from "../../../../lib/role-nav";

export default function StudentDashboardPage() {
  return (
    <DashboardShell
      productLabel="BookLib"
      panelLabel="Student Panel"
      title="Your seat, QR access, payments, notices, and library info in one smooth workspace."
      description="Everything you need should be here without confusion: seat details, validity, payment status, WiFi, notices, and QR entry support."
      nav={studentNav}
    >
      <StudentDashboardManager />
    </DashboardShell>
  );
}
