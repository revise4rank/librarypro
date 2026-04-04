import Link from "next/link";
import { DashboardShell } from "../../../../components/dashboard-shell";
import { StudentJoinLibraryManager } from "../../../../components/student-join-library-manager";
import { StudentWorkspaceActions } from "../../../../components/student-workspace-actions";
import { studentNav } from "../../../../lib/role-nav";

export default function StudentJoinLibraryPage() {
  return (
    <DashboardShell
      productLabel="LibraryPro"
      panelLabel="Join Library"
      title="Use the same student app across libraries and keep your progress with you."
      description="No need to create a new app every time. Scan the next library QR, send the request, and continue using your study system."
      nav={studentNav}
      actions={
        <StudentWorkspaceActions>
          <Link href="/student/focus" className="rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white">
            Open focus
          </Link>
        </StudentWorkspaceActions>
      }
    >
      <StudentJoinLibraryManager />
    </DashboardShell>
  );
}
