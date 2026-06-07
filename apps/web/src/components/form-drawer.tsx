"use client";

import type { ReactNode } from "react";

type FormDrawerProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  widthClassName?: string;
  side?: "left" | "right";
};

export function FormDrawer({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  widthClassName = "sm:w-[min(94vw,42rem)] max-w-2xl",
  side = "right",
}: FormDrawerProps) {
  if (!open) return null;

  const desktopSideClass =
    side === "right"
      ? "ml-auto rounded-l-2xl border-l border-slate-200"
      : "mr-auto rounded-r-2xl border-r border-slate-200";

  return (
    <div className="fixed inset-0 z-[90] bg-slate-950/40 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close drawer overlay" onClick={onClose} className="absolute inset-0 h-full w-full cursor-default" />
      <aside className={`absolute inset-x-0 bottom-0 top-[50px] w-full overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:relative sm:inset-auto sm:h-full ${widthClassName} ${desktopSideClass}`}>
        <div className="flex h-full flex-col">
          <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-3">
            <div className="min-w-0">
              <h2 className="text-xl font-black tracking-tight text-slate-950">{title}</h2>
              {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700"
            >
              Close form
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5 pb-[calc(3rem+env(safe-area-inset-bottom))] sm:pb-5">{children}</div>
          {footer ? <div className="sticky bottom-0 border-t border-slate-200 bg-white px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4">{footer}</div> : null}
        </div>
      </aside>
    </div>
  );
}
