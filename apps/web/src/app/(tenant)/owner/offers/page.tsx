import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerOffersManager } from "../../../../components/owner-offers-manager";
import { ownerNav } from "../../../../lib/role-nav";

export default function OwnerOffersPage() {
  return (
    <DashboardShell
      productLabel="BookLib"
      panelLabel="Marketing"
      title="Offers"
      description="Submit student-facing offers for platform approval from a dedicated page."
      nav={ownerNav}
    >
      <OwnerOffersManager />
    </DashboardShell>
  );
}
