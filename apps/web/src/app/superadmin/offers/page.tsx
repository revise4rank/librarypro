import { DashboardShell } from "../../../components/dashboard-shell";
import { SuperadminOffersManager } from "../../../components/superadmin-offers-manager";
import { adminNav } from "../../../lib/role-nav";

export default function SuperadminOffersPage() {
  return (
    <DashboardShell
      productLabel="LibraryPro"
      panelLabel="Offers"
      title="Moderate opportunities, mark featured, and track views/clicks."
      description="Student-first monetization: optional discovery feed, clean moderation, and no disruption to study flow."
      nav={adminNav}
    >
      <SuperadminOffersManager />
    </DashboardShell>
  );
}
