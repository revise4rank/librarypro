import { AppShell } from "../../../../components/shell";
import { OwnerExpensesManager } from "../../../../components/owner-expenses-manager";
import { ownerNav, ownerNavGroups } from "../../../../lib/role-nav";
export default function OwnerExpensesPage() {
  return (
    <AppShell
      eyebrow="Owner Expenses"
      title="Expense control with monthly profit visibility."
      description="Live expense tracking with monthly revenue and profit visibility from actual backend data."
      nav={ownerNav}
      navGroups={ownerNavGroups}
    >
      <OwnerExpensesManager />
    </AppShell>
  );
}
