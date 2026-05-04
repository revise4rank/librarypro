"use client";

import { type ReactNode } from "react";

export function StatCard({
  label,
  value,
  note,
  chip,
  children,
}: {
  label: string;
  value: ReactNode;
  note?: string;
  chip?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[var(--lp-border)] bg-white p-4 shadow-sm">
      <p className="lp-stat-label">{label}</p>
      <div className="mt-2 flex items-start justify-between gap-3">
        <p className="lp-stat-value">{value}</p>
        {chip ? <div className="shrink-0">{chip}</div> : null}
      </div>
      {note ? <p className="mt-1 text-xs leading-5 text-[var(--lp-muted)]">{note}</p> : null}
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}
