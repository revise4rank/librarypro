"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";

type ProductivityDetailResponse = {
  success: boolean;
  data: {
    summary: {
      totalStudyHours: number;
      weeklyStudyHours: number;
      attendanceDays: number;
      missedDays: number;
      longestStreak: number;
      deepWorkHours: number;
      mostStudiedSubject: string | null;
      completedTopics: number;
      totalTopics: number;
      dailyCompletedTopics: number;
    };
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
    focusSubjects: Array<{
      subjectLabel: string;
      totalMinutes: number;
      totalSessions: number;
    }>;
    recentSessions: Array<{
      topicTitle: string | null;
      sessionType: string;
      durationMinutes: number;
      completedAt: string;
    }>;
    trends: Array<{
      date: string;
      focusMinutes: number;
      attendanceCount: number;
      focusSessions: number;
    }>;
    interventionNotes: Array<{
      id: string;
      noteText: string;
      noteType: string;
      noteStatus: string;
      followUpAt: string | null;
      actorName: string;
      createdAt: string;
    }>;
  };
};

export function OwnerStudentProductivityManager({
  studentUserId,
  studentName,
}: {
  studentUserId: string;
  studentName?: string;
}) {
  const [data, setData] = useState<ProductivityDetailResponse["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [noteForm, setNoteForm] = useState({ noteText: "", noteType: "GENERAL", followUpAt: "" });
  const [savingNote, setSavingNote] = useState(false);
  const [updatingNoteId, setUpdatingNoteId] = useState<string | null>(null);

  async function loadProductivity() {
    try {
      const response = await apiFetch<ProductivityDetailResponse>(`/owner/students/${studentUserId}/productivity`);
      setData(response.data);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load productivity details.");
    }
  }

  useEffect(() => {
    void loadProductivity();
  }, [studentUserId]);

  async function saveInterventionNote() {
    try {
      setSavingNote(true);
      await apiFetch(`/owner/students/${studentUserId}/interventions`, {
        method: "POST",
        body: JSON.stringify(noteForm),
      });
      setNoteForm({ noteText: "", noteType: "GENERAL", followUpAt: "" });
      await loadProductivity();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save intervention note.");
    } finally {
      setSavingNote(false);
    }
  }

  async function updateNoteStatus(noteId: string, noteStatus: "OPEN" | "DONE" | "ESCALATED") {
    try {
      setUpdatingNoteId(noteId);
      await apiFetch(`/owner/interventions/${noteId}`, {
        method: "PATCH",
        body: JSON.stringify({ noteStatus }),
      });
      await loadProductivity();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update note status.");
    } finally {
      setUpdatingNoteId(null);
    }
  }

  const recoveryMessage = useMemo(() => {
    if (!data) return null;
    if (data.summary.missedDays <= 0) {
      return "No attendance recovery needed. Focus on maintaining rhythm.";
    }

    const suggestedMinutes = Math.max(30, Math.ceil((data.summary.missedDays * 45) / 7));
    return `Suggested catch-up plan: ${suggestedMinutes} extra minutes daily for the next 7 days.`;
  }, [data]);

  function getBadgeTheme(badgeCode: string) {
    if (badgeCode.includes("14") || badgeCode.includes("50")) {
      return { icon: "Crown", tier: "Gold", tone: "border-amber-200 bg-amber-50 text-amber-700" };
    }
    if (badgeCode.includes("7") || badgeCode.includes("20") || badgeCode.includes("10")) {
      return { icon: "Spark", tier: "Silver", tone: "border-slate-300 bg-slate-50 text-slate-700" };
    }
    return { icon: "Bolt", tier: "Bronze", tone: "border-emerald-200 bg-emerald-50 text-emerald-700" };
  }

  function getUrgencyStyle(followUpAt: string | null) {
    if (!followUpAt) {
      return {
        border: "border-slate-200 bg-white",
        chip: "bg-slate-100 text-slate-600",
        label: "No schedule",
      };
    }

    const diffHours = (new Date(followUpAt).getTime() - Date.now()) / (1000 * 60 * 60);
    if (diffHours < 0) {
      return { border: "border-red-200 bg-red-50", chip: "bg-red-100 text-red-700", label: "Overdue" };
    }
    if (diffHours <= 24) {
      return { border: "border-amber-200 bg-amber-50", chip: "bg-amber-100 text-amber-700", label: "Due today" };
    }
    return { border: "border-sky-200 bg-sky-50", chip: "bg-sky-100 text-sky-700", label: "Upcoming" };
  }

  if (!data) {
    return <p className="text-sm text-slate-500">{error ?? "Loading student productivity..."}</p>;
  }

  const summaryCards = [
    { label: "Total Study", value: `${data.summary.totalStudyHours} hrs`, note: "Lifetime tracked focus" },
    { label: "Weekly Focus", value: `${data.summary.weeklyStudyHours} hrs`, note: "Rolling 7-day signal" },
    { label: "Attendance", value: `${data.summary.attendanceDays} days`, note: `${data.summary.missedDays} missed days` },
    { label: "Syllabus", value: `${data.summary.completedTopics}/${data.summary.totalTopics}`, note: `${data.summary.dailyCompletedTopics} topics today` },
  ];
  const maxTrendFocus = Math.max(...data.trends.map((point) => point.focusMinutes), 1);

  return (
    <div className="grid gap-6">
      {error ? <p className="text-sm font-semibold text-amber-700">{error}</p> : null}

      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">{card.label}</p>
            <p className="mt-3 text-3xl font-black text-slate-950">{card.value}</p>
            <p className="mt-2 text-sm text-slate-500">{card.note}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <DashboardCard title="Performance summary" subtitle="Owner-friendly discipline signals">
          <div className="grid gap-4">
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Top subject</p>
              <p className="mt-3 text-2xl font-black text-slate-950">{data.summary.mostStudiedSubject ?? "Not enough data"}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Longest streak</p>
                <p className="mt-3 text-2xl font-black text-slate-950">{data.summary.longestStreak} days</p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Deep work</p>
                <p className="mt-3 text-2xl font-black text-slate-950">{data.summary.deepWorkHours} hrs</p>
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-cyan-200 bg-cyan-50 p-5">
              <p className="text-sm font-semibold text-slate-800">{recoveryMessage}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {data.badges.map((badge) => {
                const fallbackTheme = getBadgeTheme(badge.badgeCode);
                const theme = {
                  ...fallbackTheme,
                  tier: badge.metadata?.tier ?? fallbackTheme.tier,
                  icon: badge.metadata?.icon ?? fallbackTheme.icon,
                };
                return (
                <div key={badge.badgeCode} className={`rounded-[1.25rem] border p-4 ${theme.tone}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-black text-slate-950">{badge.badgeLabel}</p>
                    <span className="rounded-full bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]">{theme.tier}</span>
                  </div>
                  <p className="mt-2 text-xs font-black uppercase tracking-[0.2em]">{theme.icon}</p>
                  <p className="mt-2 text-sm text-slate-500">Awarded {badge.awardedAt.slice(0, 10)}</p>
                </div>
              );})}
              {data.badges.length === 0 ? <p className="text-sm text-slate-500">No badges unlocked yet.</p> : null}
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title="Study mix" subtitle="Where the student is actually spending time">
          <div className="grid gap-3">
            {data.focusSubjects.map((subject) => (
              <div key={subject.subjectLabel} className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black text-slate-950">{subject.subjectLabel}</p>
                  <p className="text-sm font-bold text-[var(--lp-primary)]">{subject.totalMinutes} min</p>
                </div>
                <div className="mt-3 rounded-full bg-slate-100 p-2">
                  <div
                    className="h-3 rounded-full bg-[var(--lp-primary)]"
                    style={{
                      width: `${Math.max(
                        8,
                        data.focusSubjects.length > 0
                          ? Math.round((subject.totalMinutes / Math.max(...data.focusSubjects.map((item) => item.totalMinutes), 1)) * 100)
                          : 8,
                      )}%`,
                    }}
                  />
                </div>
                <p className="mt-2 text-sm text-slate-500">{subject.totalSessions} sessions</p>
              </div>
            ))}
            {data.focusSubjects.length === 0 ? <p className="text-sm text-slate-500">No focus distribution data yet.</p> : null}
          </div>
        </DashboardCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <DashboardCard title="Trend line" subtitle="Last 14 days of focus and attendance">
          <div className="grid gap-3">
            {data.trends.map((point) => (
              <div key={point.date} className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black text-slate-950">{point.date}</p>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{point.focusSessions} sessions</p>
                </div>
                <div className="mt-3 rounded-full bg-slate-100 p-1">
                  <div className="h-3 rounded-full bg-[var(--lp-primary)]" style={{ width: `${Math.max(8, Math.round((point.focusMinutes / maxTrendFocus) * 100))}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-sm text-slate-500">
                  <span>{point.focusMinutes} focus min</span>
                  <span>{point.attendanceCount > 0 ? "Present" : "Absent"}</span>
                </div>
              </div>
            ))}
            {data.trends.length === 0 ? <p className="text-sm text-slate-500">No trend history yet.</p> : null}
          </div>
        </DashboardCard>

        <DashboardCard title="Recent study log" subtitle={`Latest tracked sessions${studentName ? ` for ${studentName}` : ""}`}>
          <div className="grid gap-3">
            {data.recentSessions.map((session, index) => (
              <div key={`${session.completedAt}-${index}`} className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black text-slate-950">{session.topicTitle ?? "Focus session"}</p>
                  <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">{session.sessionType}</span>
                </div>
                <p className="mt-2 text-sm text-slate-500">{session.completedAt.slice(0, 16).replace("T", " ")}</p>
                <p className="mt-2 text-sm font-semibold text-[var(--lp-primary)]">{session.durationMinutes} minutes</p>
              </div>
            ))}
            {data.recentSessions.length === 0 ? <p className="text-sm text-slate-500">No recent study activity yet.</p> : null}
          </div>
        </DashboardCard>

        <DashboardCard title="Owner coaching cues" subtitle="Simple actions an operator can take next">
          <div className="grid gap-4">
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">If attendance is weak</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">Recommend a fixed arrival window and seat-stability plan. Students with irregular check-ins usually need timing discipline before longer focus blocks.</p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">If focus is weak</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">Push one short daily target first. Smaller consistent wins generally convert better than forcing long sessions immediately.</p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">If syllabus is stalled</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">Ask the student to break the next chapter into smaller topics and complete at least one visible topic per day.</p>
            </div>
          </div>
        </DashboardCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <DashboardCard title="Add intervention note" subtitle="Keep a simple coaching memory for this student">
          <div className="grid gap-4">
            <select
              value={noteForm.noteType}
              onChange={(event) => setNoteForm((current) => ({ ...current, noteType: event.target.value }))}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none"
            >
              <option value="GENERAL">General</option>
              <option value="ATTENDANCE">Attendance</option>
              <option value="FOCUS">Focus</option>
              <option value="PAYMENT">Payment</option>
              <option value="SYLLABUS">Syllabus</option>
            </select>
            <textarea
              value={noteForm.noteText}
              onChange={(event) => setNoteForm((current) => ({ ...current, noteText: event.target.value }))}
              className="min-h-32 rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none"
              placeholder="Called student, advised fixed 7 AM arrival, suggested 25-minute restart target..."
            />
            <input
              type="datetime-local"
              value={noteForm.followUpAt}
              onChange={(event) => setNoteForm((current) => ({ ...current, followUpAt: event.target.value }))}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none"
            />
            <button
              type="button"
              disabled={savingNote}
              onClick={() => void saveInterventionNote()}
              className="rounded-full border border-[var(--lp-accent-soft)] bg-[var(--lp-accent-soft)] px-5 py-3 text-sm font-bold text-[var(--lp-accent-strong)]"
            >
              {savingNote ? "Saving..." : "Save note"}
            </button>
          </div>
        </DashboardCard>

        <DashboardCard title="Intervention history" subtitle="Last coaching, follow-up, and operational notes">
          <div className="grid gap-3">
            {data.interventionNotes.map((note) => (
              <div key={note.id} className={`rounded-[1.25rem] border p-4 ${getUrgencyStyle(note.followUpAt).border}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <p className="font-black text-slate-950">{note.noteType}</p>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">{note.noteStatus}</span>
                  </div>
                  <p className="text-xs font-bold text-slate-500">{note.createdAt.slice(0, 16).replace("T", " ")}</p>
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-600">{note.noteText}</p>
                <p className="mt-2 text-xs font-semibold text-[var(--lp-primary)]">By {note.actorName}</p>
                {note.followUpAt ? <p className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getUrgencyStyle(note.followUpAt).chip}`}>{getUrgencyStyle(note.followUpAt).label} | {note.followUpAt.slice(0, 16).replace("T", " ")}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["OPEN", "DONE", "ESCALATED"] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={updatingNoteId === note.id || note.noteStatus === status}
                      onClick={() => void updateNoteStatus(note.id, status)}
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        note.noteStatus === status
                          ? "border border-[var(--lp-accent-soft)] bg-[var(--lp-accent-soft)] text-[var(--lp-accent-strong)]"
                          : "border border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {data.interventionNotes.length === 0 ? <p className="text-sm text-slate-500">No intervention notes yet.</p> : null}
          </div>
        </DashboardCard>
      </section>
    </div>
  );
}
