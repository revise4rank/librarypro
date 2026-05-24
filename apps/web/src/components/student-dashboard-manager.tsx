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

type ReferralData = { id: string; code: string; uses_count: number };

export function StudentDashboardManager() {
  const [data, setData] = useState<DashboardResponse["data"] | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsResponse["data"] | null>(null);
  const [syllabusAnalytics, setSyllabusAnalytics] = useState<SyllabusAnalyticsResponse["data"] | null>(null);
  const [revisionAnalytics, setRevisionAnalytics] = useState<RevisionAnalyticsResponse["data"]["analytics"] | null>(null);
  const [libraries, setLibraries] = useState<LibrariesResponse["data"]>([]);
  const [referral, setReferral] = useState<ReferralData | null>(null);
  const [referralCopied, setReferralCopied] = useState(false);
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
      // Load referral code (non-blocking)
      apiFetch<{ success: boolean; data: ReferralData }>("/student/referral")
        .then((r) => setReferral(r.data))
        .catch(() => null);
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

  const activeLibrary = libraries.find((library) => library.is_active) ?? null;
  const rewards = analytics.badges;
  const recoveryMinutesPerDay = analytics.missedDays > 0 ? Math.max(30, Math.ceil((analytics.missedDays * 45) / 7)) : 0;

  function toggleSection(section: keyof typeof expandedSections) {
    setExpandedSections((current) => ({ ...current, [section]: !current[section] }));
  }

  const quickActions = [
    { href: "/student/qr", icon: "📷", label: "QR Pass" },
    { href: "/student/payments", icon: "💳", label: "Pay" },
    { href: "/student/focus", icon: "📚", label: "Focus" },
    { href: "/student/seat", icon: "🪑", label: "My Seat" },
    { href: "/student/syllabus", icon: "📝", label: "Syllabus" },
    { href: "/student/revisions", icon: "🔁", label: "Revisions" },
    { href: "/student/feed", icon: "📰", label: "Feed" },
    { href: "/student/rewards", icon: "🎁", label: "Rewards" },
  ];

  return (
    <div className="grid gap-3 md:gap-6">
      {error ? <p className="text-sm font-semibold text-amber-700">{error}</p> : null}

      {/* 3A: Hero Status Strip */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <span className="flex-shrink-0 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-sm font-bold text-cyan-800">
          Seat {data.assignment?.seat_number ?? "-"}
        </span>
        <span className="flex-shrink-0 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-bold text-amber-800">
          Valid {data.assignment?.ends_at ? new Date(data.assignment.ends_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "-"}
        </span>
        <span className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-sm font-bold ${data.assignment?.payment_status === "PAID" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
          {data.assignment?.payment_status ?? "No plan"}
        </span>
        <span className="flex-shrink-0 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-bold text-violet-800">
          🔥 {data.focusProgress.streakDays}d streak
        </span>
        <span className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-sm font-bold ${data.focusProgress.currentlyInside ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
          {data.focusProgress.currentlyInside ? "Inside now" : liveStatus}
        </span>
      </div>

      {/* 3B: Quick Action Grid — 4 columns, 2 rows */}
      <div className="grid grid-cols-4 gap-2">
        {quickActions.map((action) => (
          <Link key={action.href} href={action.href} className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 bg-white p-3 text-center">
            <span className="text-xl">{action.icon}</span>
            <span className="text-xs font-bold text-slate-700">{action.label}</span>
          </Link>
        ))}
      </div>

      {/* 3C: Focus Summary — 2 compact side-by-side cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">Weekly Study</p>
          <p className="mt-1.5 text-2xl md:text-3xl font-black text-slate-950">{analytics.weeklyStudyHours} hrs</p>
          <p className="text-xs text-slate-500">{analytics.focusSessionsCount} sessions</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">Attendance</p>
          <p className="mt-1.5 text-2xl md:text-3xl font-black text-slate-950">{data.focusProgress.attendanceScore}%</p>
          <p className="text-xs text-slate-500">{analytics.attendanceDays} days in</p>
        </div>
      </div>

      {/* 3D: Notification Badge — collapsed by default */}
      {data.notifications.length > 0 ? (
        <div>
          <button
            type="button"
            onClick={() => toggleSection("notices")}
            className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800"
          >
            🔔 {data.notifications.length} alert{data.notifications.length !== 1 ? "s" : ""} {expandedSections.notices ? "▲" : "▼"}
          </button>
          {expandedSections.notices ? (
            <div className="mt-2 space-y-2">
              {data.notifications.map((notification) => (
                <article key={notification.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-black text-slate-950">{notification.title}</p>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-600">{notification.type}</span>
                  </div>
                  <p className="mt-1.5 text-sm leading-6 text-slate-600">{notification.message}</p>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* 3E: Summary link rows — replaces full embedded sections */}
      <div className="grid gap-2">
        <Link href="/student/focus" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-lg">📅</span>
            <div>
              <p className="text-sm font-bold text-slate-900">Focus Calendar</p>
              <p className="text-xs text-slate-500">{data.focusProgress.regularDays} regular days · {analytics.totalStudyHours} hrs total</p>
            </div>
          </div>
          <span className="text-xs font-bold text-[var(--lp-primary)]">View →</span>
        </Link>
        <Link href="/student/syllabus" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-lg">📝</span>
            <div>
              <p className="text-sm font-bold text-slate-900">Syllabus</p>
              <p className="text-xs text-slate-500">{syllabusAnalytics.completedTopics}/{syllabusAnalytics.totalTopics} topics · {syllabusAnalytics.dailyCompletedTopics} today</p>
            </div>
          </div>
          <span className="text-xs font-bold text-[var(--lp-primary)]">Open →</span>
        </Link>
        <Link href="/student/revisions" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-lg">🔁</span>
            <div>
              <p className="text-sm font-bold text-slate-900">Revision Queue</p>
              <p className="text-xs text-slate-500">{revisionAnalytics.pendingCount} pending · {revisionAnalytics.overdueCount} overdue</p>
            </div>
          </div>
          <span className="text-xs font-bold text-[var(--lp-primary)]">Open →</span>
        </Link>
        <Link href="/student/rewards" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-lg">🎖️</span>
            <div>
              <p className="text-sm font-bold text-slate-900">Rewards</p>
              <p className="text-xs text-slate-500">{rewards.length} badge{rewards.length !== 1 ? "s" : ""} · {data.focusProgress.streakDays}d streak</p>
            </div>
          </div>
          <span className="text-xs font-bold text-[var(--lp-primary)]">View →</span>
        </Link>
        {analytics.missedDays > 0 ? (
          <Link href="/student/focus" className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-lg">⚡</span>
              <div>
                <p className="text-sm font-bold text-red-900">Recovery Needed</p>
                <p className="text-xs text-red-700">{analytics.missedDays} missed days · +{recoveryMinutesPerDay} min/day for 7 days</p>
              </div>
            </div>
            <span className="text-xs font-bold text-red-700">Fix →</span>
          </Link>
        ) : null}
      </div>

      {/* Library info row */}
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900">{activeLibrary?.library_name ?? data.library?.library_name ?? "No library linked"}</p>
            <p className="truncate text-xs text-slate-500">
              {data.library?.notice_message
                ? `${data.library.notice_message.slice(0, 55)}${data.library.notice_message.length > 55 ? "…" : ""}`
                : "No active notice"
              } · {libraries.length} connected
            </p>
          </div>
          <Link href="/student/join-library" className="flex-shrink-0 text-xs font-bold text-[var(--lp-primary)]">Libraries →</Link>
        </div>
      </div>

      {/* Referral code strip */}
      {referral ? (
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Referral Code</p>
              <p className="mt-1 text-xl font-black tracking-widest text-slate-950">{referral.code}</p>
              {referral.uses_count > 0 ? (
                <p className="mt-0.5 text-xs text-violet-600">{referral.uses_count} friend{referral.uses_count !== 1 ? "s" : ""} joined using your code</p>
              ) : (
                <p className="mt-0.5 text-xs text-slate-500">Share with friends to invite them</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(referral.code);
                setReferralCopied(true);
                setTimeout(() => setReferralCopied(false), 2000);
              }}
              className="flex-shrink-0 rounded-full bg-violet-600 px-4 py-2 text-xs font-bold text-white"
            >
              {referralCopied ? "Copied!" : "Copy Code"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}



