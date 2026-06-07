import Link from "next/link";

type StudentSectionKey = "library" | "study" | "tools";

const studentSections: Array<{
  key: StudentSectionKey;
  label: string;
  href: string;
  detail: string;
}> = [
  {
    key: "library",
    label: "My Library",
    href: "/student/dashboard",
    detail: "Seat, fees, QR, notices",
  },
  {
    key: "study",
    label: "Study Zone",
    href: "/student/focus",
    detail: "Focus, syllabus, analytics",
  },
  {
    key: "tools",
    label: "Study Tools",
    href: "/student/tools",
    detail: "Revision, rewards, feed",
  },
];

export function StudentSectionTabs({ active }: { active: StudentSectionKey }) {
  return (
    <nav className="grid gap-2 rounded-xl border border-[var(--lp-border)] bg-white p-1.5 shadow-sm md:grid-cols-3" aria-label="Student workspace sections">
      {studentSections.map((section) => (
        <Link
          key={section.key}
          href={section.href}
          className={`rounded-lg px-3 py-2 transition ${
            active === section.key
              ? "bg-[var(--lp-accent-soft)] text-[var(--lp-accent)]"
              : "text-[var(--lp-text)] hover:bg-slate-50"
          }`}
        >
          <span className="block text-sm font-black">{section.label}</span>
          <span className="mt-1 block text-xs font-semibold text-current opacity-70">{section.detail}</span>
        </Link>
      ))}
    </nav>
  );
}
