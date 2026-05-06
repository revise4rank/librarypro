import Link from "next/link";
import { DashboardShell } from "../../../../components/dashboard-shell";
import { StudentSettingsManager } from "../../../../components/student-settings-manager";
import { StudentWorkspaceActions } from "../../../../components/student-workspace-actions";
import { studentNav } from "../../../../lib/role-nav";

type StudentSettingsTab = "account" | "libraries";

export default function StudentSettingsPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const requestedTab = searchParams?.tab;
  const allowedTabs = new Set<StudentSettingsTab>(["account", "libraries"]);
  const initialTab = allowedTabs.has(requestedTab as StudentSettingsTab) ? (requestedTab as StudentSettingsTab) : "account";

  return (
    <DashboardShell
      productLabel="BookLib"
      panelLabel="Student Settings"
      title="Student settings"
      description="Student-only profile, password, session, and connected library access controls."
      nav={studentNav}
      actions={
        <StudentWorkspaceActions>
          <Link href="/student/dashboard" className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700">
            Back to dashboard
          </Link>
        </StudentWorkspaceActions>
      }
    >
      <StudentSettingsManager initialTab={initialTab} />
    </DashboardShell>
  );
}
