import Link from "next/link";
import { DashboardShell } from "../../../../components/dashboard-shell";
import { StudentSyllabusManager } from "../../../../components/student-syllabus-manager";
import { StudentWorkspaceActions } from "../../../../components/student-workspace-actions";
import { studentNav } from "../../../../lib/role-nav";

export default function StudentSyllabusPage() {
  return (
    <DashboardShell
      productLabel="LibraryPro"
      panelLabel="Syllabus Tracker"
      title="Build your own subject-wise syllabus map and track every topic to completion."
      description="This stays student-driven: create subjects, break them into topics, and keep each chapter moving from not-started to completed."
      nav={studentNav}
      actions={
        <StudentWorkspaceActions>
          <Link href="/student/focus-mode" className="rounded-full border border-[var(--lp-accent-soft)] bg-[var(--lp-accent-soft)] px-5 py-3 text-sm font-bold text-[var(--lp-accent-strong)]">
            Start focus mode
          </Link>
        </StudentWorkspaceActions>
      }
    >
      <StudentSyllabusManager />
    </DashboardShell>
  );
}
