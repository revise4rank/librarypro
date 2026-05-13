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
};

export function FormDrawer({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  widthClassName = "max-w-2xl",
}: FormDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-slate-950/40 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close drawer overlay" onClick={onClose} className="absolute inset-0 h-full w-full cursor-default" />
      <aside className={`relative h-full w-[min(94vw,42rem)] ${widthClassName} overflow-hidden rounded-r-2xl border-r border-slate-200 bg-white shadow-2xl`}>
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
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
          <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
          {footer ? <div className="border-t border-slate-200 px-5 py-4">{footer}</div> : null}
        </div>
      </aside>
    </div>
  );
}
