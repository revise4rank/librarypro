import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerSeatsManager } from "../../../../components/owner-seats-manager";
import { ownerNav } from "../../../../lib/role-nav";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function OwnerSeatsPage() {
  return (
    <DashboardShell
      productLabel="Nextlib"
      panelLabel="Seat Control"
      title="Compact map seat control with live assignment persistence."
      description="Compact seat pods, focused planner modes, and live assignment edits for a cleaner room-map experience."
      nav={ownerNav}
      actions={
        <>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
            Compact Map v2
          </span>
          <Link href="/owner/seats#seat-create-floor" className="rounded-full border border-[var(--lp-border)] bg-[var(--lp-surface)] px-5 py-3 text-sm font-bold text-[var(--lp-primary)]">
            Add floor
          </Link>
          <Link href="/owner/seats#seat-create-bank" className="rounded-full border border-[var(--lp-border)] bg-[var(--lp-surface)] px-5 py-3 text-sm font-bold text-[var(--lp-primary)]">
            Add seats
          </Link>
          <Link href="/owner/seats#seat-planner" className="rounded-full bg-[var(--lp-primary)] px-5 py-3 text-sm font-bold text-white">
            Open planner
          </Link>
        </>
      }
    >
      <OwnerSeatsManager />
    </DashboardShell>
  );
}
