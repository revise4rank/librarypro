import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerSeatsManager } from "../../../../components/owner-seats-manager";
import { ownerNav } from "../../../../lib/role-nav";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function OwnerSeatsPage() {
  return (
    <DashboardShell
      productLabel="BookLib"
      panelLabel="Seatmap"
      title=""
      description=""
      nav={ownerNav}
    >
      <OwnerSeatsManager />
    </DashboardShell>
  );
}
