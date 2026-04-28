import { DashboardShell } from "../../../components/dashboard-shell";
import { SuperadminOffersManager } from "../../../components/superadmin-offers-manager";
import { adminNav } from "../../../lib/role-nav";

export default function SuperadminOffersPage() {
  return (
    <DashboardShell
      productLabel="LibraryPro"
      panelLabel="Offers"
      title="Platform offers"
      description="Moderation, featured status, views, and clicks."
      nav={adminNav}
    >
      <SuperadminOffersManager />
    </DashboardShell>
  );
}
