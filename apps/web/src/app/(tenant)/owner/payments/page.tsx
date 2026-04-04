import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerPaymentsManager } from "../../../../components/owner-payments-manager";
import { ownerNav } from "../../../../lib/role-nav";

export default function OwnerPaymentsPage() {
  return (
    <DashboardShell
      productLabel="LibraryPro"
      panelLabel="Payments"
      title="Track collections, post manual payments, and recover dues."
      description="Owners should be able to add cash or UPI collections quickly, scan dues, and keep the ledger clean from one screen."
      nav={ownerNav}
    >
      <OwnerPaymentsManager />
    </DashboardShell>
  );
}
