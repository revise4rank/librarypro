"use client";

import Link from "next/link";

const quickActions = [
  {
    href: "/owner/admissions",
    icon: "➕",
    label: "New Admission",
    detail: "Enroll a new student with seat and plan",
    tone: "border-emerald-200 bg-emerald-50",
  },
  {
    href: "/owner/payments",
    icon: "💰",
    label: "Record Payment",
    detail: "Collect fees and update payment status",
    tone: "border-cyan-200 bg-cyan-50",
  },
  {
    href: "/owner/checkins",
    icon: "📋",
    label: "View Register",
    detail: "Check who is inside the library right now",
    tone: "border-sky-200 bg-sky-50",
  },
  {
    href: "/owner/expenses",
    icon: "📊",
    label: "Add Expense",
    detail: "Log today's operational expense",
    tone: "border-amber-200 bg-amber-50",
  },
  {
    href: "/owner/notifications",
    icon: "📣",
    label: "Send Notice",
    detail: "Broadcast a message to all students",
    tone: "border-violet-200 bg-violet-50",
  },
  {
    href: "/owner/reports",
    icon: "📈",
    label: "View Reports",
    detail: "Revenue, occupancy, and performance stats",
    tone: "border-rose-200 bg-rose-50",
  },
];

export function OwnerActionsManager() {
  return (
    <div className="grid gap-3 md:gap-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={`flex flex-col rounded-xl border p-3 md:p-5 ${action.tone}`}
          >
            <span className="text-2xl">{action.icon}</span>
            <p className="mt-2 text-sm font-black text-slate-950">{action.label}</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">{action.detail}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
