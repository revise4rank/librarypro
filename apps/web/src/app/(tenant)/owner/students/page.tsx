import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerStudentsManager } from "../../../../components/owner-students-manager";
import { ownerNav } from "../../../../lib/role-nav";
import Link from "next/link";

export default function OwnerStudentsPage() {
  return (
    <DashboardShell
      productLabel="LibraryPro"
      panelLabel="Students"
      title="Run the active roster, renew plans, and control seat allotment from one student desk."
      description="Admissions now creates the student. Use this roster workspace for edits, renewals, and later seat assignment only."
      nav={ownerNav}
      actions={
        <Link href="/owner/admissions" className="rounded-[0.95rem] bg-[var(--lp-accent-soft)] px-5 py-2.5 text-sm font-bold text-[var(--lp-accent)]">
          Open Admissions
        </Link>
      }
    >
      <OwnerStudentsManager />
    </DashboardShell>
  );
}
