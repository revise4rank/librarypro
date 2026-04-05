import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerCheckinsManager } from "../../../../components/owner-checkins-manager";
import { ownerNav } from "../../../../lib/role-nav";

export default function OwnerCheckinsPage() {
  return (
    <DashboardShell
      productLabel="Nextlib"
      panelLabel="Owner Panel"
      title="Live check-in register, occupancy, and overstay watch in one operator view."
      description="Owner can monitor who is inside now, today check-ins, long-stay students, and full QR entry history without jumping screens."
      nav={ownerNav}
    >
      <OwnerCheckinsManager />
    </DashboardShell>
  );
}
