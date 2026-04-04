import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerStudentsManager } from "../../../../components/owner-students-manager";
import { ownerNav } from "../../../../lib/role-nav";

export default function OwnerStudentsPage() {
  return (
    <DashboardShell
      productLabel="LibraryPro"
      panelLabel="Students"
      title="Manage student assignments, seats, plan validity, and due follow-up."
      description="This page should help owners add, assign, move, renew, and follow up with students, not just stare at a table."
      nav={ownerNav}
      actions={
        <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white">
          Add student
        </button>
      }
    >
      <OwnerStudentsManager />
    </DashboardShell>
  );
}
