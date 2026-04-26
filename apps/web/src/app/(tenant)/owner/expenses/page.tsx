import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerExpensesManager } from "../../../../components/owner-expenses-manager";
import { ownerNav } from "../../../../lib/role-nav";

export default function OwnerExpensesPage() {
  return (
    <DashboardShell
      productLabel="LibraryPro"
      panelLabel="Expense Desk"
      title="Track daily expenses and monthly profit without leaving the owner app."
      description="Review outgoing costs, compare them against revenue, and keep profitability visible from the same operating workspace."
      nav={ownerNav}
    >
      <OwnerExpensesManager />
    </DashboardShell>
  );
}
