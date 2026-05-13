"use client";

import Link from "next/link";

export function isPlanAccessMessage(message?: string | null) {
  return Boolean(message?.includes("Open Billing") || message?.includes("not available on"));
}

export function PlanAccessNotice({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <p className="font-semibold">{message}</p>
      <Link
        href="/owner/billing"
        className="mt-3 inline-flex rounded-lg bg-[var(--lp-primary)] px-4 py-2 text-xs font-bold text-white"
      >
        Open Billing
      </Link>
    </div>
  );
}
