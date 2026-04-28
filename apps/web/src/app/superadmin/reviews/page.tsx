import { DashboardShell } from "../../../components/dashboard-shell";
import { SuperadminReviewsManager } from "../../../components/superadmin-reviews-manager";
import { adminNav } from "../../../lib/role-nav";

export default function SuperadminReviewsPage() {
  return (
    <DashboardShell
      productLabel="LibraryPro"
      panelLabel="Reviews"
      title="Review moderation"
      description="Reported reviews and marketplace trust actions."
      nav={adminNav}
    >
      <SuperadminReviewsManager />
    </DashboardShell>
  );
}
