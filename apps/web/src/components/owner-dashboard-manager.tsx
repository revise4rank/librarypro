"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";

type OwnerDashboardResponse = {
  success: boolean;
  data: {
    metrics: {
      revenue_today: string;
      monthly_revenue: string;
      monthly_expenses: string;
      monthly_profit: string;
      pending_dues: string;
      occupancy_percent: string;
      total_seats: string;
      available_seats: string;
      active_students: string;
      today_checkins: string;
      unpaid_students: string;
      expiring_students: string;
      overstay_students: string;
    };
    dueStudents: Array<{
      assignment_id: string;
      student_name: string;
      student_phone: string | null;
      seat_number: string | null;
      ends_at: string;
      payment_status: string;
      due_amount: string;
    }>;
    recentPayments: Array<{
      id: string;
      student_name: string;
      amount: string;
      method: string;
      status: string;
      paid_at: string | null;
      created_at: string;
    }>;
    library: {
      name: string;
      city: string;
      area: string | null;
      wifi_name: string | null;
      wifi_password: string | null;
      notice_message: string | null;
      plan_name: string | null;
      subscription_status: string | null;
      current_period_end: string | null;
    } | null;
  };
};

type FollowUpQueueResponse = {
  success: boolean;
  data: Array<{
    id: string;
    studentUserId: string;
    studentName: string;
    noteText: string;
    noteType: string;
    noteStatus: string;
    followUpAt: string | null;
    actorName: string;
    createdAt: string;
  }>;
};

type TrendResponse = {
  success: boolean;
  data: {
    points: Array<{
      date: string;
      focusMinutes: number;
      attendanceStudents: number;
      focusSessions: number;
    }>;
    summary: {
      topFocusDay: string | null;
      topFocusMinutes: number;
      topAttendanceDay: string | null;
      topAttendanceStudents: number;
    };
  };
};

const actionCards = [
  { title: "Assign new student", detail: "Seat, plan, dates, payment", href: "/owner/students" },
  { title: "Configure seat map", detail: "Floor, room, reserve, free", href: "/owner/seats" },
  { title: "Publish library website", detail: "Offers, logo, amenities", href: "/owner/website" },
  { title: "Send due reminders", detail: "Notices and reminders", href: "/owner/notifications" },
];

export function OwnerDashboardManager() {
  const [data, setData] = useState<OwnerDashboardResponse["data"] | null>(null);
  const [followUps, setFollowUps] = useState<FollowUpQueueResponse["data"]>([]);
  const [trends, setTrends] = useState<TrendResponse["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [campaignMessage, setCampaignMessage] = useState<string | null>(null);
  const [trendWindow, setTrendWindow] = useState<"7d" | "30d">("7d");
  const [updatingNoteId, setUpdatingNoteId] = useState<string | null>(null);
  const [followUpFilter, setFollowUpFilter] = useState<"ALL" | "OVERDUE" | "TODAY" | "UPCOMING">("ALL");
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [playbookOpen, setPlaybookOpen] = useState(false);
  const [trendsOpen, setTrendsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"today" | "students" | "finance" | "growth">("today");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [dashboardResponse, followupsResponse, trendsResponse] = await Promise.all([
          apiFetch<OwnerDashboardResponse>("/owner/dashboard"),
          apiFetch<FollowUpQueueResponse>("/owner/productivity/followups"),
          apiFetch<TrendResponse>(`/owner/productivity/trends?window=${trendWindow}`),
        ]);
        setData(dashboardResponse.data);
        setFollowUps(followupsResponse.data);
        setTrends(trendsResponse.data);
        setError(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load owner dashboard.");
      }
    }

    void loadDashboard();
  }, [trendWindow]);

  async function reloadFollowUps() {
    try {
      const followupsResponse = await apiFetch<FollowUpQueueResponse>("/owner/productivity/followups");
      setFollowUps(followupsResponse.data);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load owner dashboard.");
    }
  }

  if (!data) {
    return <p className="text-sm text-slate-500">{error ?? "Loading owner dashboard..."}</p>;
  }

  const trendPoints = trends?.points ?? [];
  const maxFocusMinutes = Math.max(...trendPoints.map((point) => point.focusMinutes), 1);
  const maxAttendance = Math.max(...trendPoints.map((point) => point.attendanceStudents), 1);

  const metrics = [
    { label: "Today's Revenue", value: `Rs. ${Number(data.metrics.revenue_today).toLocaleString()}`, change: `${data.metrics.today_checkins} check-ins today`, tone: "bg-[#eef7f5] text-[var(--lp-accent)]" },
    { label: "Monthly Profit", value: `Rs. ${Number(data.metrics.monthly_profit).toLocaleString()}`, change: "Revenue - expenses", tone: "bg-[#f8eadf] text-[var(--lp-primary)]" },
    { label: "Pending Dues", value: `Rs. ${Number(data.metrics.pending_dues).toLocaleString()}`, change: `${data.metrics.unpaid_students} students pending`, tone: "bg-[#fff3e7] text-[var(--lp-primary)]" },
    { label: "Occupancy", value: `${data.metrics.occupancy_percent}%`, change: `${data.metrics.available_seats}/${data.metrics.total_seats} seats free`, tone: "bg-[#ecf3f1] text-[var(--lp-accent)]" },
  ];

  const alerts = [
    { title: `${data.metrics.unpaid_students} unpaid students`, detail: "Collection follow-up needed", tone: "border-red-200 bg-red-50 text-red-700" },
    { title: `${data.metrics.expiring_students} plans expiring soon`, detail: "Renewal outreach in next 3 days", tone: "border-amber-200 bg-amber-50 text-amber-700" },
    { title: `${data.metrics.available_seats} seats sitting free`, detail: "Push seats on marketplace and microsite", tone: "border-sky-200 bg-sky-50 text-sky-700" },
    { title: `${data.metrics.overstay_students} long-stay students inside`, detail: "Check register and manual follow-up", tone: "border-violet-200 bg-violet-50 text-violet-700" },
  ];

  async function sendDueRecovery() {
    try {
      const response = await apiFetch<{ success: boolean; data: { recipientCount: number; channels: string[] } }>("/owner/campaigns/due-recovery", {
        method: "POST",
        body: JSON.stringify({}),
      });
      setCampaignMessage(`Due reminders sent to ${response.data.recipientCount} students via ${response.data.channels.join(", ")}.`);
    } catch (loadError) {
      setCampaignMessage(loadError instanceof Error ? loadError.message : "Unable to send due reminders.");
    }
  }

  async function updateFollowUpStatus(noteId: string, noteStatus: "DONE" | "ESCALATED") {
    try {
      setUpdatingNoteId(noteId);
      await apiFetch(`/owner/interventions/${noteId}`, {
        method: "PATCH",
        body: JSON.stringify({ noteStatus }),
      });
      await reloadFollowUps();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to update follow-up.");
    } finally {
      setUpdatingNoteId(null);
    }
  }

  function getUrgencyStyle(followUpAt: string | null) {
    if (!followUpAt) {
      return {
        chip: "bg-slate-100 text-slate-600",
        border: "border-slate-200 bg-white",
        label: "No follow-up date",
      };
    }

    const now = new Date();
    const followUp = new Date(followUpAt);
    const diffHours = (followUp.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 0) {
      return {
        chip: "bg-red-100 text-red-700",
        border: "border-red-200 bg-red-50",
        label: "Overdue",
      };
    }

    if (diffHours <= 24) {
      return {
        chip: "bg-amber-100 text-amber-700",
        border: "border-amber-200 bg-amber-50",
        label: "Due today",
      };
    }

    return {
      chip: "bg-sky-100 text-sky-700",
      border: "border-sky-200 bg-sky-50",
      label: "Upcoming",
    };
  }

  const filteredFollowUps = followUps.filter((item) => {
    const label = getUrgencyStyle(item.followUpAt).label;
    if (followUpFilter === "ALL") return true;
    if (followUpFilter === "OVERDUE") return label === "Overdue";
    if (followUpFilter === "TODAY") return label === "Due today";
    if (followUpFilter === "UPCOMING") return label === "Upcoming";
    return true;
  });

  const tabs = [
    { id: "today" as const, label: "Today" },
    { id: "students" as const, label: "Students" },
    { id: "finance" as const, label: "Finance" },
    { id: "growth" as const, label: "Growth" },
  ];

  return (
    <div className="grid gap-3 md:gap-6">
      {error ? <p className="text-sm font-semibold text-amber-700">{error}</p> : null}

      {/* Tab bar */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 rounded-full px-5 py-2 text-sm font-black uppercase tracking-[0.18em] transition ${
              activeTab === tab.id
                ? "bg-[var(--lp-primary)] text-white"
                : "border border-[var(--lp-border)] bg-white text-[var(--lp-muted)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Today */}
      {activeTab === "today" ? (
        <div className="grid gap-3 md:gap-6">
          {/* Compact metric strip */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {metrics.map((item) => (
              <div key={item.label} className="flex-shrink-0 rounded-xl border border-[var(--lp-border)] bg-[rgba(255,250,244,0.96)] px-4 py-3 shadow-sm" style={{ minWidth: "140px" }}>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--lp-muted)]">{item.label}</p>
                <p className="mt-1.5 text-lg font-black text-[var(--lp-text)]">{item.value}</p>
                <span className={`mt-1 inline-flex rounded-full px-2 py-1 text-[10px] font-black ${item.tone}`}>{item.change}</span>
              </div>
            ))}
          </div>

          {/* Priority alerts */}
          <div className="grid gap-2 md:grid-cols-2">
            {alerts.map((alert) => (
              <article key={alert.title} className={`rounded-xl border p-3 ${alert.tone}`}>
                <h4 className="text-sm font-black">{alert.title}</h4>
                <p className="mt-1 text-sm leading-6">{alert.detail}</p>
              </article>
            ))}
          </div>

          {/* Operator shortcuts */}
          <DashboardCard title="Quick actions" size="compact">
            <div className="grid gap-2.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-slate-500">Most-used owner actions</p>
                <button
                  type="button"
                  onClick={() => setShortcutsOpen((current) => !current)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-slate-700"
                >
                  {shortcutsOpen ? "Hide" : "Show"}
                </button>
              </div>
              {shortcutsOpen ? (
                <>
                  <div className="grid gap-2">
                    {actionCards.map((card) => (
                      <Link key={card.title} href={card.href} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-slate-300 hover:bg-white">
                        <p className="font-black text-slate-950">{card.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{card.detail}</p>
                      </Link>
                    ))}
                  </div>
                  <button type="button" onClick={() => void sendDueRecovery()} className="rounded-xl bg-[var(--lp-primary)] px-4 py-3 text-left text-sm font-bold text-white">
                    Send automatic due recovery reminders
                  </button>
                </>
              ) : null}
              {campaignMessage ? <p className="text-sm font-semibold text-slate-600">{campaignMessage}</p> : null}
            </div>
          </DashboardCard>

          {/* Collection pipeline — top 5 */}
          <DashboardCard title="Collection pipeline" subtitle="Students needing payment or renewal action">
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="hidden grid-cols-[1.4fr_0.8fr_0.9fr_0.8fr_0.8fr] gap-3 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-slate-500 md:grid">
                <span>Student</span><span>Seat</span><span>Validity</span><span>Status</span><span>Due</span>
              </div>
              {data.dueStudents.slice(0, 5).map((student) => (
                <div key={student.assignment_id} className="border-t border-slate-200 bg-white px-3 py-2.5 text-sm">
                  <div className="grid gap-2 md:grid-cols-[1.4fr_0.8fr_0.9fr_0.8fr_0.8fr]">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-950">{student.student_name}</p>
                      <p className="text-slate-500">{student.student_phone ?? "-"}</p>
                    </div>
                    <span className="font-semibold text-slate-700"><span className="mr-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 md:hidden">Seat </span>{student.seat_number ?? "-"}</span>
                    <span className="font-semibold text-slate-700"><span className="mr-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 md:hidden">Valid </span>{student.ends_at}</span>
                    <span className="w-fit rounded-full bg-amber-100 px-2 py-1 text-xs font-black text-amber-700">{student.payment_status}</span>
                    <span className="font-bold text-slate-950">Rs. {Number(student.due_amount).toLocaleString()}</span>
                  </div>
                </div>
              ))}
              {data.dueStudents.length === 0 ? <div className="bg-white px-4 py-6 text-sm text-slate-500">No urgent students right now.</div> : null}
              {data.dueStudents.length > 5 ? (
                <div className="border-t border-slate-200 bg-slate-50 px-4 py-2.5">
                  <Link href="/owner/payments" className="text-xs font-bold text-[var(--lp-primary)]">View all {data.dueStudents.length} students →</Link>
                </div>
              ) : null}
            </div>
          </DashboardCard>
        </div>
      ) : null}

      {/* Tab 2: Students */}
      {activeTab === "students" ? (
        <div className="grid gap-3 md:gap-6">
          <DashboardCard title="Follow-up queue" subtitle="Productivity interventions that still need action">
            <div className="grid gap-3">
              <div className="flex flex-wrap gap-2">
                {([["ALL", "All"], ["OVERDUE", "Overdue"], ["TODAY", "Today"], ["UPCOMING", "Upcoming"]] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFollowUpFilter(value)}
                    className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.18em] ${
                      followUpFilter === value ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {filteredFollowUps.map((item) => {
                const urgency = getUrgencyStyle(item.followUpAt);
                return (
                  <div key={item.id} className={`rounded-xl border p-3 ${urgency.border}`}>
                    <div className="flex items-center justify-between gap-3">
                      <Link href={`/owner/students/${item.studentUserId}?name=${encodeURIComponent(item.studentName)}`} className="font-black text-slate-950 hover:underline">{item.studentName}</Link>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-1 text-[11px] font-black ${urgency.chip}`}>{urgency.label}</span>
                        <span className="rounded-full bg-slate-950 px-2 py-1 text-[11px] font-black text-white">{item.noteStatus}</span>
                      </div>
                    </div>
                    <p className="mt-1.5 text-sm text-slate-500">{item.noteType} | Follow up {item.followUpAt?.slice(0, 16).replace("T", " ") ?? "-"}</p>
                    <p className="mt-1.5 text-sm leading-6 text-slate-600">{item.noteText}</p>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={updatingNoteId === item.id || item.noteStatus === "DONE"}
                        onClick={() => void updateFollowUpStatus(item.id, "DONE")}
                        className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white disabled:opacity-60"
                      >Mark DONE</button>
                      <button
                        type="button"
                        disabled={updatingNoteId === item.id || item.noteStatus === "ESCALATED"}
                        onClick={() => void updateFollowUpStatus(item.id, "ESCALATED")}
                        className="rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white disabled:opacity-60"
                      >Mark ESCALATED</button>
                    </div>
                  </div>
                );
              })}
              {filteredFollowUps.length === 0 ? <p className="text-sm text-slate-500">No follow-ups in this filter.</p> : null}
            </div>
          </DashboardCard>

          {/* Admissions link */}
          <Link href="/owner/admissions" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div>
              <p className="text-sm font-bold text-slate-900">Admissions</p>
              <p className="text-xs text-slate-500">Pending requests and new enrollments</p>
            </div>
            <span className="text-xs font-bold text-[var(--lp-primary)]">Open →</span>
          </Link>
          <Link href="/owner/students" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div>
              <p className="text-sm font-bold text-slate-900">All Students</p>
              <p className="text-xs text-slate-500">{data.metrics.active_students} active · {data.metrics.unpaid_students} unpaid</p>
            </div>
            <span className="text-xs font-bold text-[var(--lp-primary)]">Roster →</span>
          </Link>

          {/* Playbook */}
          <DashboardCard title="Operator playbook" size="compact">
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-slate-500">Coaching prompts for the day</p>
                <button
                  type="button"
                  onClick={() => setPlaybookOpen((current) => !current)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-slate-700"
                >
                  {playbookOpen ? "Hide" : "Open"}
                </button>
              </div>
              {playbookOpen ? (
                <div className="grid gap-2 mt-1">
                  {[
                    { label: "Attendance notes", text: "Prioritize students with missed-day patterns and open attendance notes before they become churn risk." },
                    { label: "Focus notes", text: "Convert weak-focus cases into small daily targets. Short recoverable plans work better than generic advice." },
                    { label: "Payment + discipline", text: "When a due student also has weak attendance, combine billing follow-up with a study commitment conversation." },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">{item.label}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </DashboardCard>
        </div>
      ) : null}

      {/* Tab 3: Finance */}
      {activeTab === "finance" ? (
        <div className="grid gap-3 md:gap-6">
          {/* Revenue & Profit headline */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700">Monthly Revenue</p>
              <p className="mt-1.5 text-2xl md:text-3xl font-black text-slate-950">Rs. {Number(data.metrics.monthly_revenue).toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-700">Pending Dues</p>
              <p className="mt-1.5 text-2xl md:text-3xl font-black text-slate-950">Rs. {Number(data.metrics.pending_dues).toLocaleString()}</p>
              <p className="text-xs text-slate-500">{data.metrics.unpaid_students} students</p>
            </div>
          </div>

          {/* Trends */}
          <DashboardCard title="Trends" subtitle="Focus and attendance signals">
            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex gap-2">
                  {(["7d", "30d"] as const).map((window) => (
                    <button
                      key={window}
                      type="button"
                      onClick={() => setTrendWindow(window)}
                      className={`rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-[0.2em] ${
                        trendWindow === window ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      {window}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setTrendsOpen((current) => !current)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-slate-700"
                >
                  {trendsOpen ? "Hide" : "Show"}
                </button>
              </div>
              {trendsOpen ? (
                <>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Top focus day</p>
                      <p className="mt-2 text-2xl md:text-3xl font-black text-slate-950">{trends?.summary.topFocusMinutes ?? 0} min</p>
                      <p className="mt-1 text-xs text-slate-500">{trends?.summary.topFocusDay ?? "-"}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Top attendance</p>
                      <p className="mt-2 text-2xl md:text-3xl font-black text-slate-950">{trends?.summary.topAttendanceStudents ?? 0} students</p>
                      <p className="mt-1 text-xs text-slate-500">{trends?.summary.topAttendanceDay ?? "-"}</p>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    {trendPoints.map((point) => (
                      <div key={point.date} className="rounded-xl border border-slate-200 bg-white p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-black text-slate-950">{point.date}</p>
                          <p className="text-xs font-bold text-slate-400">{point.focusSessions} sessions</p>
                        </div>
                        <div className="mt-2 grid gap-2 md:grid-cols-2">
                          <div>
                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                              <span>Focus</span><span>{point.focusMinutes} min</span>
                            </div>
                            <div className="mt-1.5 rounded-full bg-slate-100 p-0.5">
                              <div className="h-2 rounded-full bg-[var(--lp-primary)]" style={{ width: `${Math.max(8, Math.round((point.focusMinutes / maxFocusMinutes) * 100))}%` }} />
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                              <span>Attendance</span><span>{point.attendanceStudents}</span>
                            </div>
                            <div className="mt-1.5 rounded-full bg-slate-100 p-0.5">
                              <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.max(8, Math.round((point.attendanceStudents / maxAttendance) * 100))}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {trendPoints.length === 0 ? <p className="text-sm text-slate-500">No trend data yet.</p> : null}
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-500">Open when you want comparison data.</p>
              )}
            </div>
          </DashboardCard>

          {/* Seat snapshot */}
          <DashboardCard title="Seat snapshot">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {[
                { label: "Total seats", value: data.metrics.total_seats, bg: "bg-emerald-50 text-emerald-700" },
                { label: "Free seats", value: data.metrics.available_seats, bg: "bg-sky-50 text-sky-700" },
                { label: "Renewing soon", value: data.metrics.expiring_students, bg: "bg-amber-50 text-amber-700" },
                { label: "Active students", value: data.metrics.active_students, bg: "bg-rose-50 text-rose-700" },
              ].map((item) => (
                <div key={item.label} className={`rounded-xl p-3 ${item.bg}`}>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] opacity-70">{item.label}</p>
                  <p className="mt-1.5 text-2xl md:text-3xl font-black text-slate-950">{item.value}</p>
                </div>
              ))}
            </div>
          </DashboardCard>

          {/* Finance log */}
          <DashboardCard title="Recent finance log" subtitle="Latest collection activity">
            <div className="space-y-2">
              {data.recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                  <div>
                    <p className="font-bold text-slate-950">{payment.student_name}</p>
                    <p className="text-xs text-slate-500">{payment.method} · {(payment.paid_at ?? payment.created_at).slice(0, 10)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-slate-950">Rs. {Number(payment.amount).toLocaleString()}</p>
                    <p className={`text-xs font-black ${payment.status === "PAID" ? "text-emerald-700" : "text-amber-700"}`}>{payment.status}</p>
                  </div>
                </div>
              ))}
              {data.recentPayments.length === 0 ? <p className="text-sm text-slate-500">No payment records yet.</p> : null}
            </div>
          </DashboardCard>

          <Link href="/owner/reports" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-sm font-bold text-slate-900">Full Reports</p>
            <span className="text-xs font-bold text-[var(--lp-primary)]">Open →</span>
          </Link>
          <Link href="/owner/expenses" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-sm font-bold text-slate-900">Expenses Log</p>
            <span className="text-xs font-bold text-[var(--lp-primary)]">Open →</span>
          </Link>
        </div>
      ) : null}

      {/* Tab 4: Growth */}
      {activeTab === "growth" ? (
        <div className="grid gap-3 md:gap-6">
          {/* Website status */}
          <DashboardCard title="Website & Marketplace" subtitle="Public presence and library listing">
            <div className="grid gap-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Library</p>
                <p className="mt-1.5 text-lg font-black text-slate-950">{data.library?.name ?? "Unnamed"}</p>
                <p className="text-sm text-slate-500">{data.library?.city}{data.library?.area ? `, ${data.library.area}` : ""}</p>
              </div>
              <Link href="/owner/website" className="flex items-center justify-between rounded-xl border border-[var(--lp-primary)] bg-[var(--lp-primary)] px-4 py-3 text-white">
                <p className="text-sm font-bold">Website Builder</p>
                <span className="text-xs font-bold">Edit & Publish →</span>
              </Link>
            </div>
          </DashboardCard>

          {/* Growth links */}
          <div className="grid gap-2">
            {[
              { href: "/owner/leads", label: "Lead Inbox", detail: "Marketplace enquiries and contact requests" },
              { href: "/owner/campaigns", label: "Campaigns", detail: "Due recovery, re-engagement, and announcements" },
              { href: "/owner/offers", label: "Offers", detail: "Active discounts and limited-time promotions" },
              { href: "/owner/notifications", label: "Broadcasts", detail: "Send notices to all students at once" },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.detail}</p>
                </div>
                <span className="text-xs font-bold text-[var(--lp-primary)]">Open →</span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}



