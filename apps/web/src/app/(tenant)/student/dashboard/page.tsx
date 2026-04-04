import Link from "next/link";
import { DashboardShell } from "../../../../components/dashboard-shell";
import { StudentDashboardManager } from "../../../../components/student-dashboard-manager";
import { StudentWorkspaceActions } from "../../../../components/student-workspace-actions";
import { studentNav } from "../../../../lib/role-nav";

export default function StudentDashboardPage() {
  return (
    <DashboardShell
      productLabel="LibraryPro"
      panelLabel="Student Panel"
      title="Your seat, QR access, payments, notices, and library info in one smooth workspace."
      description="Everything you need should be here without confusion: seat details, validity, payment status, WiFi, notices, and QR entry support."
      nav={studentNav}
      actions={
        <StudentWorkspaceActions>
          <Link href="/student/qr" className="rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white">
            Show QR
          </Link>
          <Link href="/student/payments" className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700">
            Pay now
          </Link>
        </StudentWorkspaceActions>
      }
    >
      <StudentDashboardManager />
    </DashboardShell>
  );
}
