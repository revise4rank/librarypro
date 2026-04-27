import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerStudentsManager } from "../../../../components/owner-students-manager";
import { ownerNav } from "../../../../lib/role-nav";
import Link from "next/link";

export default function OwnerStudentsPage() {
  return (
    <DashboardShell
      productLabel="LibraryPro"
      panelLabel="Students"
      title="Students"
      description="Roster and seat allotment."
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
