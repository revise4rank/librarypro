import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerAdmissionsManager } from "../../../../components/owner-admissions-manager";
import { ownerNav } from "../../../../lib/role-nav";

export default function OwnerAdmissionsPage() {
  return (
    <DashboardShell
      productLabel="LibraryPro"
      panelLabel="Admissions"
      title="Onboard every new student from one admissions desk."
      description="Create desk admissions, approve join requests, apply plans or coupons, and push students into the active roster before seat allotment."
      nav={ownerNav}
    >
      <OwnerAdmissionsManager />
    </DashboardShell>
  );
}
