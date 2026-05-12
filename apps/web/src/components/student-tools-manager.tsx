import Link from "next/link";
import { DashboardCard } from "./dashboard-shell";
import { StudentSectionTabs } from "./student-section-tabs";

const tools = [
  {
    title: "Focus Mode",
    detail: "Start a clean timer and log deep work without opening the full dashboard.",
    href: "/student/focus-mode",
    action: "Start timer",
  },
  {
    title: "Syllabus Tracker",
    detail: "Create subjects, add topics, and mark progress chapter by chapter.",
    href: "/student/syllabus",
    action: "Track syllabus",
  },
  {
    title: "Revision Queue",
    detail: "Clear spaced revision checkpoints and overdue weak topics.",
    href: "/student/revisions",
    action: "Open revision",
  },
  {
    title: "Rewards",
    detail: "See streaks, badges, consistency, and motivation signals.",
    href: "/student/rewards",
    action: "View rewards",
  },
  {
    title: "Library Feed",
    detail: "Share focus milestones and see study updates without disturbing work.",
    href: "/student/feed",
    action: "Open feed",
  },
  {
    title: "Student Offers",
    detail: "Keep offers separate from study dashboards and daily work.",
    href: "/student/offers",
    action: "View offers",
  },
];

export function StudentToolsManager() {
  return (
    <div className="grid gap-4">
      <StudentSectionTabs active="tools" />

      <section className="rounded-xl border border-[var(--lp-border)] bg-[linear-gradient(135deg,#16b871_0%,#9debd5_100%)] p-4 text-white shadow-sm">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/75">Study tools</p>
        <h3 className="mt-1 text-xl font-black tracking-tight">All study utilities in one place, away from library operations.</h3>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-white/85">
          Use this section for actual studying: focus timer, syllabus work, revision, rewards, feed, and optional offers.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool) => (
          <DashboardCard key={tool.href} title={tool.title} subtitle={tool.detail}>
            <Link href={tool.href} className="inline-flex rounded-lg border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--lp-accent)]">
              {tool.action}
            </Link>
          </DashboardCard>
        ))}
      </section>
    </div>
  );
}
