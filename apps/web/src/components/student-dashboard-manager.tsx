"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { getRealtimeSocket } from "../lib/realtime";
import { DashboardCard } from "./dashboard-shell";

type DashboardResponse = {
  success: boolean;
  data: {
    assignment: {
      seat_number: string | null;
      plan_name: string;
      ends_at: string;
      payment_status: string;
    } | null;
    library: {
      library_name: string;
      wifi_name: string | null;
      wifi_password: string | null;
      notice_message: string | null;
    } | null;
    notifications: Array<{
      id: string;
      type: string;
      title: string;
      message: string;
      created_at: string;
    }>;
    dueTotal: number;
    latestPaymentDate: string | null;
    upcomingDueDate: string | null;
    focusProgress: {
      regularDays: number;
      streakDays: number;
      monthlyPresence: number;
      missedDays: number;
      attendanceScore: number;
      currentlyInside: boolean;
    };
    focusCalendar: Array<{
      date: string;
      sessions: number;
      minutes: number;
    }>;
  };
};

type AnalyticsResponse = {
  success: boolean;
  data: {
    totalStudyHours: number;
    weeklyStudyHours: number;
    monthlyStudyHours: number;
    focusSessionsCount: number;
    attendanceDays: number;
    missedDays: number;
    avgEntryHour: string | null;
    mostStudiedSubject: string | null;
    longestStreak: number;
    deepWorkHours: number;
    badges: Array<{
      badgeCode: string;
      badgeLabel: string;
      awardedAt: string;
      metadata?: {
        tier?: string;
        icon?: string;
        family?: string;
      };
    }>;
  };
};

type SyllabusAnalyticsResponse = {
  success: boolean;
  data: {
    totalSubjects: number;
    totalTopics: number;
    completedTopics: number;
    dailyCompletedTopics: number;
  };
};

type LibrariesResponse = {
  success: boolean;
  data: Array<{
    library_id: string;
    library_name: string;
    city: string;
    seat_number: string | null;
    login_id: string;
    is_active: boolean;
    joined_at: string;
  }>;
};

type RevisionAnalyticsResponse = {
  success: boolean;
  data: {
    analytics: {
      pendingCount: number;
      completedCount: number;
      overdueCount: number;
      revisionCompletionPercent: number;
      revisionConsistencyDays: number;
      weakTopics: number;
    };
  };
};

export function StudentDashboardManager() {
  const [data, setData] = useState<DashboardResponse["data"] | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsResponse["data"] | null>(null);
  const [syllabusAnalytics, setSyllabusAnalytics] = useState<SyllabusAnalyticsResponse["data"] | null>(null);
  const [revisionAnalytics, setRevisionAnalytics] = useState<RevisionAnalyticsResponse["data"]["analytics"] | null>(null);
  const [libraries, setLibraries] = useState<LibrariesResponse["data"]>([]);
  const [error, setError] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState("Connecting");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    analytics: false,
    revisions: false,
    calendar: false,
    rewards: false,
    notices: false,
  });

  async function loadDashboard() {
    try {
      const [dashboardResponse, analyticsResponse, syllabusResponse, revisionResponse, librariesResponse] = await Promise.all([
        apiFetch<DashboardResponse>("/student/dashboard"),
        apiFetch<AnalyticsResponse>("/student/analytics"),
        apiFetch<SyllabusAnalyticsResponse>("/student/syllabus/analytics"),
        apiFetch<RevisionAnalyticsResponse>("/student/revisions"),
        apiFetch<LibrariesResponse>("/student/libraries"),
      ]);
      setData(dashboardResponse.data);
      setAnalytics(analyticsResponse.data);
      setSyllabusAnalytics(syllabusResponse.data);
      setRevisionAnalytics(revisionResponse.data.analytics);
      setLibraries(librariesResponse.data);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load student dashboard.");
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  useEffect(() => {
    const socket = getRealtimeSocket();
    if (!socket) {
      setLiveStatus("Offline");
      return;
    }

    const ready = () => setLiveStatus("Live");
    const disconnected = () => setLiveStatus("Disconnected");
    const refresh = () => {
      setLiveStatus("Live");
      void loadDashboard();
    };

    socket.on("connect", ready);
    socket.on("disconnect", disconnected);
    socket.on("realtime.ready", ready);
    socket.on("payment.updated", refresh);
    socket.on("notification.created", refresh);
    socket.on("student.updated", refresh);

    if (socket.connected) {
      setLiveStatus("Live");
    }

    return () => {
      socket.off("connect", ready);
      socket.off("disconnect", disconnected);
      socket.off("realtime.ready", ready);
      socket.off("payment.updated", refresh);
      socket.off("notification.created", refresh);
      socket.off("student.updated", refresh);
    };
  }, []);

  if (!data || !analytics || !syllabusAnalytics || !revisionAnalytics) {
    return <p className="text-sm text-slate-500">{error ?? "Loading student workspace..."}</p>;
  }

  const summaryCards = [
    { label: "Assigned Seat", value: data.assignment?.seat_number ?? "-", note: "Your active desk", tone: "bg-cyan-50 text-cyan-700" },
    { label: "Weekly Study", value: `${analytics.weeklyStudyHours} hrs`, note: "Focus tracker total", tone: "bg-emerald-50 text-emerald-700" },
    { label: "Attendance", value: `${analytics.attendanceDays} days`, note: "Rolling discipline signal", tone: "bg-amber-50 text-amber-700" },
    { label: "Syllabus", value: `${syllabusAnalytics.completedTopics}/${syllabusAnalytics.totalTopics}`, note: "Topics completed", tone: "bg-violet-50 text-violet-700" },
  ];
  const calendarDays = [...(data.focusCalendar ?? [])]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-28);
  const activeLibrary = libraries.find((library) => library.is_active) ?? null;
  const rewards = analytics.badges;
  const recoveryMinutesPerDay = analytics.missedDays > 0 ? Math.max(30, Math.ceil((analytics.missedDays * 45) / 7)) : 0;
  const previewNotifications = data.notifications.slice(0, expandedSections.notices ? data.notifications.length : 2);

  function toggleSection(section: keyof typeof expandedSections) {
    setExpandedSections((current) => ({ ...current, [section]: !current[section] }));
  }

  function getBadgeTheme(badgeCode: string) {
    if (badgeCode.includes("14") || badgeCode.includes("50")) {
      return { icon: "Crown", tier: "Gold", card: "border-amber-200 bg-amber-50", text: "text-amber-700" };
    }
    if (badgeCode.includes("7") || badgeCode.includes("20") || badgeCode.includes("10")) {
      return { icon: "Spark", tier: "Silver", card: "border-slate-300 bg-slate-50", text: "text-slate-700" };
    }
    return { icon: "Bolt", tier: "Bronze", card: "border-emerald-200 bg-emerald-50", text: "text-emerald-700" };
  }

  return (
    <div className="grid gap-6">
      {error ? <p className="text-sm font-semibold text-amber-700">{error}</p> : null}
      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">{card.label}</p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <p className="text-3xl font-black text-slate-950">{card.value}</p>
              <span className={`rounded-full px-3 py-2 text-xs font-black ${card.tone}`}>{card.note}</span>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <DashboardCard title="Access center" subtitle="Entry readiness, billing, and seat context">
          <div className="grid gap-4">
            <div className="rounded-[1.5rem] border border-cyan-200 bg-cyan-50 p-5">
              <p className="text-sm font-semibold text-slate-800">
                Latest payment {data.latestPaymentDate?.slice(0, 10) ?? "-"} | Upcoming due {data.upcomingDueDate ?? "-"} | Current due Rs. {data.dueTotal}
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Seat</p>
                <p className="mt-3 text-2xl font-black text-slate-950">{data.assignment?.seat_number ?? "-"}</p>
                <p className="mt-2 text-sm text-slate-500">{data.assignment?.plan_name ?? "No active plan"}</p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">WiFi</p>
                <p className="mt-3 text-base font-black text-slate-950">{data.library?.wifi_name ?? "-"}</p>
                <p className="mt-2 text-sm text-slate-500">{data.library?.wifi_password ?? "-"}</p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Live status</p>
                <p className="mt-3 text-2xl font-black text-slate-950">{liveStatus}</p>
                <p className="mt-2 text-sm text-slate-500">{activeLibrary?.library_name ?? data.library?.library_name ?? "Student workspace"}</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Current streak</p>
                <p className="mt-3 text-2xl font-black text-slate-950">{data.focusProgress.streakDays} days</p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Inside now</p>
                <p className="mt-3 text-2xl font-black text-slate-950">{data.focusProgress.currentlyInside ? "Yes" : "No"}</p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Attendance score</p>
                <p className="mt-3 text-2xl font-black text-slate-950">{data.focusProgress.attendanceScore}%</p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Next due</p>
                <p className="mt-3 text-2xl font-black text-slate-950">{data.upcomingDueDate ?? "-"}</p>
              </div>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title="Quick actions" subtitle="Student actions should be obvious and immediate">
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/student/focus" className="rounded-[1.25rem] bg-slate-950 px-4 py-4 text-sm font-bold text-white">
              Open focus tracker
            </Link>
            <Link href="/student/syllabus" className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4 text-sm font-bold text-slate-800">
              Open syllabus tracker
            </Link>
            <Link href="/student/revisions" className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4 text-sm font-bold text-slate-800">
              Open revision queue
            </Link>
            <Link href="/student/feed" className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4 text-sm font-bold text-slate-800">
              Open library feed
            </Link>
            <Link href="/student/focus-mode" className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4 text-sm font-bold text-slate-800">
              Start focus mode
            </Link>
            <Link href="/student/qr" className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4 text-sm font-bold text-slate-800">
              Open QR entry pass
            </Link>
            <Link href="/student/payments" className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4 text-sm font-bold text-slate-800">
              Pay fees now
            </Link>
          </div>
        </DashboardCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <DashboardCard title="Study analytics" subtitle="This app should stay useful even outside the library">
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Total study</p>
                <p className="mt-3 text-2xl font-black text-slate-950">{analytics.totalStudyHours} hrs</p>
                <p className="mt-2 text-sm text-slate-500">{analytics.focusSessionsCount} sessions recorded</p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Most studied</p>
                <p className="mt-3 text-2xl font-black text-slate-950">{analytics.mostStudiedSubject ?? "-"}</p>
                <p className="mt-2 text-sm text-slate-500">Monthly {analytics.monthlyStudyHours} hrs</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggleSection("analytics")}
              className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-slate-700"
            >
              {expandedSections.analytics ? "Hide deeper analytics" : "Show deeper analytics"}
            </button>
            {expandedSections.analytics ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Deep work</p>
                  <p className="mt-3 text-2xl font-black text-slate-950">{analytics.deepWorkHours} hrs</p>
                  <p className="mt-2 text-sm text-slate-500">Longer sessions above 50 min</p>
                </div>
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Entry pattern</p>
                  <p className="mt-3 text-2xl font-black text-slate-950">{analytics.avgEntryHour ?? "-"}</p>
                  <p className="mt-2 text-sm text-slate-500">{analytics.missedDays} missed days in active window</p>
                </div>
              </div>
            ) : null}
          </div>
        </DashboardCard>

        <DashboardCard title="Latest alerts" subtitle="Payment reminders, expiry alerts, and operational updates">
          <div className="space-y-3">
            {previewNotifications.map((notification) => (
              <article key={notification.id} className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black text-slate-950">{notification.title}</p>
                  <span className="rounded-full bg-slate-100 px-3 py-2 text-[11px] font-black text-slate-600">{notification.type}</span>
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-600">{notification.message}</p>
              </article>
            ))}
            {data.notifications.length > 2 ? (
              <button
                type="button"
                onClick={() => toggleSection("notices")}
                className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-slate-700"
              >
                {expandedSections.notices ? "Show fewer alerts" : `Show all ${data.notifications.length} alerts`}
              </button>
            ) : null}
          </div>
        </DashboardCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <DashboardCard title="Revision engine" subtitle="The system should help you remember what you finished">
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-700">Pending revisions</p>
                <p className="mt-3 text-2xl font-black text-slate-950">{revisionAnalytics.pendingCount}</p>
                <p className="mt-2 text-sm text-slate-600">{revisionAnalytics.overdueCount} overdue reminders</p>
              </div>
              <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-700">Revision consistency</p>
                <p className="mt-3 text-2xl font-black text-slate-950">{revisionAnalytics.revisionConsistencyDays} days</p>
                <p className="mt-2 text-sm text-slate-600">{revisionAnalytics.revisionCompletionPercent}% completion rate</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggleSection("revisions")}
              className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-slate-700"
            >
              {expandedSections.revisions ? "Hide accountability details" : "Show accountability details"}
            </button>
          </div>
        </DashboardCard>

        <DashboardCard title="Accountability loop" subtitle="Share progress only when you want, and keep the pressure healthy">
          {expandedSections.revisions ? (
            <div className="grid gap-4">
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                <p className="text-sm leading-7 text-slate-600">
                  Library feed is separate from study widgets. Share completed topics, focus hours, and streak wins without popups or distractions.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Weak topics</p>
                <p className="mt-3 text-2xl font-black text-slate-950">{revisionAnalytics.weakTopics}</p>
                <p className="mt-2 text-sm text-slate-500">Use custom reminders to revisit the hardest topics faster.</p>
              </div>
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-600">Progress sharing aur weak-topic reminders ready hain. Zarurat ho tab details kholo.</p>
            </div>
          )}
        </DashboardCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <DashboardCard title="Focus calendar" subtitle="Study regularity over the last visible days">
          <div className="grid gap-4">
            <button
              type="button"
              onClick={() => toggleSection("calendar")}
              className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-slate-700"
            >
              {expandedSections.calendar ? "Hide study calendar" : "Show study calendar"}
            </button>
            {expandedSections.calendar ? (
              <div className="grid grid-cols-4 gap-3 md:grid-cols-7">
                {calendarDays.map((day) => (
                  <div key={day.date} className={`rounded-[1.25rem] border p-3 ${day.sessions > 0 ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{day.date.slice(5)}</p>
                    <p className="mt-2 text-lg font-black text-slate-950">{day.sessions}</p>
                    <p className="text-xs text-slate-500">{day.minutes} min</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-600">Recent consistency aur session pattern ko tab kholkar dekho jab weekly review karna ho.</p>
              </div>
            )}
          </div>
        </DashboardCard>

        <DashboardCard title="Syllabus progress" subtitle="Long-term chapter coverage stays visible">
          <div className="grid gap-4">
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Completed topics</p>
              <p className="mt-3 text-2xl font-black text-slate-950">{syllabusAnalytics.completedTopics}/{syllabusAnalytics.totalTopics}</p>
              <p className="mt-2 text-sm text-slate-500">{syllabusAnalytics.dailyCompletedTopics} topics completed today</p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Subjects</p>
              <p className="mt-3 text-2xl font-black text-slate-950">{syllabusAnalytics.totalSubjects}</p>
              <p className="mt-2 text-sm text-slate-500">Build your own syllabus instead of keeping prep vague.</p>
            </div>
            <Link href="/student/syllabus" className="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-800">
              Open full syllabus tracker
            </Link>
          </div>
        </DashboardCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <DashboardCard title="Streak rewards" subtitle="Discipline compounds, so the app should celebrate consistency">
          <div className="grid gap-4">
            <button
              type="button"
              onClick={() => toggleSection("rewards")}
              className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-slate-700"
            >
              {expandedSections.rewards ? "Hide badge cabinet" : "Show badge cabinet"}
            </button>
            {expandedSections.rewards ? (
              <div className="grid gap-3 md:grid-cols-2">
                {rewards.map((reward) => {
                  const fallbackTheme = getBadgeTheme(reward.badgeCode);
                  const theme = {
                    ...fallbackTheme,
                    tier: reward.metadata?.tier ?? fallbackTheme.tier,
                    icon: reward.metadata?.icon ?? fallbackTheme.icon,
                  };
                  return (
                    <div key={reward.badgeCode} className={`rounded-[1.25rem] border p-4 ${theme.card}`}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-black text-slate-950">{reward.badgeLabel}</p>
                        <span className={`rounded-full bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${theme.text}`}>{theme.tier}</span>
                      </div>
                      <p className={`mt-2 text-xs font-black uppercase tracking-[0.22em] ${theme.text}`}>{theme.icon}</p>
                      <p className="mt-2 text-sm text-slate-500">Unlocked {reward.awardedAt.slice(0, 10)}</p>
                    </div>
                  );
                })}
                {rewards.length === 0 ? <p className="text-sm text-slate-500">Keep building consistency to unlock your first badge.</p> : null}
              </div>
            ) : (
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-600">{rewards.length > 0 ? `${rewards.length} reward badges unlocked so far.` : "No badges yet. Consistency unlocks the first one."}</p>
              </div>
            )}
          </div>
        </DashboardCard>

        <DashboardCard title="Recovery planner" subtitle="If days are missed, the app should show a realistic catch-up path">
          <div className="grid gap-4">
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Missed days</p>
              <p className="mt-3 text-2xl font-black text-slate-950">{analytics.missedDays}</p>
              <p className="mt-2 text-sm text-slate-500">
                {analytics.missedDays > 0
                  ? `Suggested recovery pace: ${recoveryMinutesPerDay} extra minutes per day for the next 7 days.`
                  : "No recovery plan needed right now. Maintain the streak."}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Best subject to resume</p>
              <p className="mt-3 text-2xl font-black text-slate-950">{analytics.mostStudiedSubject ?? "Pick one active subject"}</p>
              <p className="mt-2 text-sm text-slate-500">Restart with a familiar track to rebuild consistency faster.</p>
            </div>
          </div>
        </DashboardCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <DashboardCard title="Library notice board" subtitle="Everything owner wants students to see right now">
          {expandedSections.notices ? (
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
              <p className="text-sm leading-8 text-slate-700">{data.library?.notice_message ?? "No notice available right now."}</p>
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-600">Notice board aur library history ko tab kholo jab operational update dekhna ho.</p>
            </div>
          )}
        </DashboardCard>

        <DashboardCard title="Connected libraries" subtitle="Your study engine can continue even if one library changes">
          <div className="grid gap-4">
            <button
              type="button"
              onClick={() => toggleSection("notices")}
              className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-slate-700"
            >
              {expandedSections.notices ? "Hide library context" : "Show library context"}
            </button>
            {expandedSections.notices ? (
              <div className="grid gap-3">
                {libraries.map((library) => (
                  <div key={library.library_id} className={`rounded-[1.25rem] border p-4 ${library.is_active ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
                    <p className="font-black text-slate-950">{library.library_name}</p>
                    <p className="mt-1 text-sm text-slate-500">{library.city} | Login ID {library.login_id} | Seat {library.seat_number ?? "-"}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-600">{libraries.length} connected libraries on this account. Active library context is shown at the top.</p>
              </div>
            )}
          </div>
        </DashboardCard>
      </section>
    </div>
  );
}
