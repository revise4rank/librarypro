import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerAdmissionsManager } from "../../../../components/owner-admissions-manager";
import { ownerNav } from "../../../../lib/role-nav";

export default function OwnerAdmissionsPage() {
  return (
    <DashboardShell
      productLabel="LibraryPro"
      panelLabel="Admissions"
      title="Approve QR-based admission requests and convert them into active seats."
      description="Students can request entry from their own app. Owner or admins review, collect payment, and activate the assignment."
      nav={ownerNav}
    >
      <OwnerAdmissionsManager />
    </DashboardShell>
  );
}
