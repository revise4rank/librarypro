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
    <div className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--lp-muted)]">{label}</p>
      <div className="mt-2 flex items-start justify-between gap-3">
        <p className="text-[1.35rem] font-semibold tracking-tight text-[var(--lp-text)]">{value}</p>
        {chip ? <div className="shrink-0">{chip}</div> : null}
      </div>
      {note ? <p className="mt-1 text-sm leading-6 text-[var(--lp-muted)]">{note}</p> : null}
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}
