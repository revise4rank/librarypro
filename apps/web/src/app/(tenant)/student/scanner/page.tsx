import { DashboardShell } from "../../../../components/dashboard-shell";
import { StudentScannerManager } from "../../../../components/student-scanner-manager";
import { studentNav } from "../../../../lib/role-nav";

export default function StudentScannerPage() {
  return (
    <DashboardShell
      productLabel="BookLib"
      panelLabel="Student Scanner"
      title="Scan library QR for joining, check-in, and check-out."
      description="One scanner handles joining a library and attendance entry."
      nav={studentNav}
    >
      <StudentScannerManager />
    </DashboardShell>
  );
}
