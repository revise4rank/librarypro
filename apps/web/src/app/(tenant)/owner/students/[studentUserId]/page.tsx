import Link from "next/link";
import { DashboardShell } from "../../../../../components/dashboard-shell";
import { OwnerStudentProductivityManager } from "../../../../../components/owner-student-productivity-manager";
import { ownerNav } from "../../../../../lib/role-nav";

export default async function OwnerStudentProductivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ studentUserId: string }>;
  searchParams: Promise<{ name?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;
  const studentName = typeof resolvedSearch.name === "string" ? resolvedSearch.name : undefined;

  return (
    <DashboardShell
      productLabel="Nextlib"
      panelLabel="Student Productivity"
      title={studentName ? `${studentName} performance view` : "Student performance view"}
      description="Owners should be able to see attendance discipline, focus quality, and syllabus momentum in one place before deciding the next intervention."
      nav={ownerNav}
      actions={
        <Link href="/owner/students" className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700">
          Back to students
        </Link>
      }
    >
      <OwnerStudentProductivityManager studentUserId={resolvedParams.studentUserId} studentName={studentName} />
    </DashboardShell>
  );
}
