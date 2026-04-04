import { DashboardShell } from "../../../../components/dashboard-shell";
import { StudentQrManager } from "../../../../components/student-qr-manager";
import { StudentWorkspaceActions } from "../../../../components/student-workspace-actions";
import { studentNav } from "../../../../lib/role-nav";

export default function StudentQrPage() {
  return (
    <DashboardShell
      productLabel="LibraryPro"
      panelLabel="QR Entry"
      title="QR entry pass with offline-first sync status."
      description="Students should be able to show their pass quickly and understand if offline check-in events are waiting to sync."
      nav={studentNav}
      actions={
        <StudentWorkspaceActions>
          <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white">
            Live QR
          </button>
        </StudentWorkspaceActions>
      }
    >
      <StudentQrManager />
    </DashboardShell>
  );
}
