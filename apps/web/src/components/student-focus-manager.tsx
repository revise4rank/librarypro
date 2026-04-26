"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";

type FocusResponse = {
  success: boolean;
  data: {
    goals: {
      daily_target_minutes: number;
      weekly_target_hours: number;
    };
    subjects: Array<{
      id: string;
      subject_name: string;
      topic_name: string | null;
      target_minutes: number;
      is_active: boolean;
      created_at: string;
    }>;
    sessions: Array<{
      id: string;
      subject_id: string | null;
      topic_title: string | null;
      duration_minutes: number;
      session_type: string;
      completed_at: string;
    }>;
    totals: {
      todayMinutes: number;
      weeklyMinutes: number;
    };
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

type LeaderboardResponse = {
  success: boolean;
  data: Array<{
    rank: number;
    studentUserId: string;
    studentName: string;
    totalMinutes: number;
    totalSessions: number;
  }>;
};

export function StudentFocusManager() {
  const [data, setData] = useState<FocusResponse["data"] | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsResponse["data"] | null>(null);
  const [libraries, setLibraries] = useState<LibrariesResponse["data"]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse["data"]>([]);
  const [leaderboardWindow, setLeaderboardWindow] = useState<"7d" | "30d">("7d");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [goalForm, setGoalForm] = useState({ dailyTargetMinutes: "180", weeklyTargetHours: "28" });
  const [subjectForm, setSubjectForm] = useState({ subjectName: "", topicName: "", targetMinutes: "120" });
  const [sessionForm, setSessionForm] = useState({ subjectId: "", topicTitle: "", durationMinutes: "25", sessionType: "POMODORO" });
  const [expanded, setExpanded] = useState({
    goals: false,
    analytics: false,
    libraries: false,
    subjects: false,
    leaderboard: false,
    history: false,
  });

  async function loadFocus() {
    try {
      const [focusResponse, analyticsResponse, librariesResponse, leaderboardResponse] = await Promise.all([
        apiFetch<FocusResponse>("/student/focus"),
        apiFetch<AnalyticsResponse>("/student/analytics"),
        apiFetch<LibrariesResponse>("/student/libraries"),
        apiFetch<LeaderboardResponse>(`/student/focus/leaderboard?window=${leaderboardWindow}`),
      ]);
      setData(focusResponse.data);
      setAnalytics(analyticsResponse.data);
      setLibraries(librariesResponse.data);
      setLeaderboard(leaderboardResponse.data);
      setGoalForm({
        dailyTargetMinutes: String(focusResponse.data.goals.daily_target_minutes),
        weeklyTargetHours: String(focusResponse.data.goals.weekly_target_hours),
      });
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load focus tracker.");
    }
  }

  useEffect(() => {
    void loadFocus();
  }, [leaderboardWindow]);

  async function saveGoals() {
    try {
      await apiFetch("/student/focus/goals", {
        method: "PATCH",
        body: JSON.stringify({
          dailyTargetMinutes: Number(goalForm.dailyTargetMinutes),
          weeklyTargetHours: Number(goalForm.weeklyTargetHours),
        }),
      });
      setMessage("Study targets saved.");
      await loadFocus();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save focus targets.");
    }
  }

  async function createSubject() {
    try {
      await apiFetch("/student/focus/subjects", {
        method: "POST",
        body: JSON.stringify({
          subjectName: subjectForm.subjectName,
          topicName: subjectForm.topicName,
          targetMinutes: Number(subjectForm.targetMinutes),
        }),
      });
      setSubjectForm({ subjectName: "", topicName: "", targetMinutes: "120" });
      setMessage("Subject and topic added.");
      await loadFocus();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save subject.");
    }
  }

  async function logSession() {
    try {
      await apiFetch("/student/focus/sessions", {
        method: "POST",
        body: JSON.stringify({
          subjectId: sessionForm.subjectId || "",
          topicTitle: sessionForm.topicTitle,
          durationMinutes: Number(sessionForm.durationMinutes),
          sessionType: sessionForm.sessionType,
        }),
      });
      setSessionForm((current) => ({
        ...current,
        topicTitle: "",
        durationMinutes: current.sessionType === "POMODORO" ? "25" : current.durationMinutes,
      }));
      setMessage("Focus session logged.");
      await loadFocus();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to log focus session.");
    }
  }

  async function setActiveLibrary(libraryId: string) {
    try {
      await apiFetch(`/student/libraries/${libraryId}/active`, {
        method: "PATCH",
      });
      setMessage("Active library switched.");
      await loadFocus();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to switch library.");
    }
  }

  function toggle(section: keyof typeof expanded) {
    setExpanded((current) => ({ ...current, [section]: !current[section] }));
  }

  if (!data || !analytics) {
    return <p className="text-sm text-slate-500">{error ?? "Loading focus tracker..."}</p>;
  }

  const activeLibrary = libraries.find((library) => library.is_active) ?? null;

  return (
    <div className="grid gap-6">
      {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm font-semibold text-amber-700">{error}</p> : null}

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Today</p>
          <p className="mt-3 text-3xl font-black text-slate-950">{data.totals.todayMinutes} min</p>
        </div>
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">This week</p>
          <p className="mt-3 text-3xl font-black text-slate-950">{data.totals.weeklyMinutes} min</p>
        </div>
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Deep work</p>
          <p className="mt-3 text-3xl font-black text-slate-950">{analytics.deepWorkHours} hrs</p>
        </div>
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Streak</p>
          <p className="mt-3 text-3xl font-black text-slate-950">{analytics.longestStreak} days</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <DashboardCard title="Log a study session" subtitle="Fastest action first. Rest can stay tucked away.">
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <select value={sessionForm.subjectId} onChange={(event) => setSessionForm((current) => ({ ...current, subjectId: event.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none">
                <option value="">No subject selected</option>
                {data.subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.subject_name}{subject.topic_name ? ` | ${subject.topic_name}` : ""}
                  </option>
                ))}
              </select>
              <select value={sessionForm.sessionType} onChange={(event) => setSessionForm((current) => ({ ...current, sessionType: event.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none">
                <option value="POMODORO">Pomodoro</option>
                <option value="MANUAL">Manual</option>
                <option value="FOCUS_MODE">Focus mode</option>
              </select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <input value={sessionForm.topicTitle} onChange={(event) => setSessionForm((current) => ({ ...current, topicTitle: event.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none" placeholder="Topic title" />
              <input value={sessionForm.durationMinutes} onChange={(event) => setSessionForm((current) => ({ ...current, durationMinutes: event.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none" placeholder="Minutes" type="number" min="5" />
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => void logSession()} className="rounded-full bg-[var(--lp-primary)] px-5 py-3 text-sm font-bold text-white">
                Log session
              </button>
              <Link href="/student/focus-mode" className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-800">
                Open focus mode
              </Link>
              <Link href="/student/syllabus" className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-800">
                Open syllabus
              </Link>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title="Focus snapshot" subtitle="Only the top signal stays open by default">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Total study</p>
              <p className="mt-3 text-2xl font-black text-slate-950">{analytics.totalStudyHours} hrs</p>
              <p className="mt-2 text-sm text-slate-500">Monthly {analytics.monthlyStudyHours} hrs</p>
            </div>
            <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Most studied</p>
              <p className="mt-3 text-2xl font-black text-slate-950">{analytics.mostStudiedSubject ?? "-"}</p>
              <p className="mt-2 text-sm text-slate-500">{analytics.focusSessionsCount} sessions logged</p>
            </div>
          </div>
        </DashboardCard>
      </section>

      <DashboardCard title="Study goals" subtitle="Targets, secondary analytics, and library context open only when needed">
        <div className="grid gap-4">
          <button type="button" onClick={() => toggle("goals")} className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-slate-700">
            {expanded.goals ? "Hide goal editor" : "Show goal editor"}
          </button>
          {expanded.goals ? (
            <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
              <input value={goalForm.dailyTargetMinutes} onChange={(event) => setGoalForm((current) => ({ ...current, dailyTargetMinutes: event.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none" placeholder="Daily target minutes" type="number" min="30" />
              <input value={goalForm.weeklyTargetHours} onChange={(event) => setGoalForm((current) => ({ ...current, weeklyTargetHours: event.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none" placeholder="Weekly target hours" type="number" min="1" />
	              <button type="button" onClick={() => void saveGoals()} className="rounded-full border border-[var(--lp-accent-soft)] bg-[var(--lp-accent-soft)] px-5 py-3 text-sm font-bold text-[var(--lp-accent-strong)]">
	                Save goals
	              </button>
            </div>
          ) : (
            <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 text-sm text-slate-600">
              Daily target {data.goals.daily_target_minutes} min | Weekly target {data.goals.weekly_target_hours} hrs
            </div>
          )}

          <button type="button" onClick={() => toggle("analytics")} className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-slate-700">
            {expanded.analytics ? "Hide productivity analytics" : "Show productivity analytics"}
          </button>
          {expanded.analytics ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Attendance</p>
                <p className="mt-3 text-2xl font-black text-slate-950">{analytics.attendanceDays} days</p>
                <p className="mt-2 text-sm text-slate-500">{analytics.missedDays} missed days in rolling window</p>
              </div>
              <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Entry pattern</p>
                <p className="mt-3 text-2xl font-black text-slate-950">{analytics.avgEntryHour ?? "-"}</p>
                <p className="mt-2 text-sm text-slate-500">Average library entry time</p>
              </div>
            </div>
          ) : null}

          <button type="button" onClick={() => toggle("libraries")} className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-slate-700">
            {expanded.libraries ? "Hide joined libraries" : "Show joined libraries"}
          </button>
          {expanded.libraries ? (
            <div className="grid gap-3">
              {libraries.map((library) => (
                <div key={library.library_id} className={`rounded-[1.25rem] border p-4 ${library.is_active ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-black text-slate-950">{library.library_name}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {library.city} | Login ID {library.login_id} | Seat {library.seat_number ?? "-"}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={library.is_active}
                      onClick={() => void setActiveLibrary(library.library_id)}
	                      className={`rounded-full px-4 py-2 text-sm font-bold ${library.is_active ? "border border-[var(--lp-accent-soft)] bg-[var(--lp-accent-soft)] text-[var(--lp-accent-strong)]" : "border border-slate-200 bg-white text-slate-800"}`}
                    >
                      {library.is_active ? "Active" : "Set active"}
                    </button>
                  </div>
                </div>
              ))}
              {libraries.length === 0 ? <p className="text-sm text-slate-500">No joined library mapping found yet.</p> : null}
              {activeLibrary ? <p className="text-sm text-slate-500">Leaderboard currently follows {activeLibrary.library_name}.</p> : null}
            </div>
          ) : (
            <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 text-sm text-slate-600">
              {activeLibrary ? `${activeLibrary.library_name} is your active library.` : "No active library selected right now."}
            </div>
          )}
        </div>
      </DashboardCard>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <DashboardCard title="Subjects and topics" subtitle="Only open the planning layer when you need to shape study structure">
          <div className="grid gap-4">
            <button type="button" onClick={() => toggle("subjects")} className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-slate-700">
              {expanded.subjects ? "Hide subjects and topics" : "Show subjects and topics"}
            </button>
            {expanded.subjects ? (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <input value={subjectForm.subjectName} onChange={(event) => setSubjectForm((current) => ({ ...current, subjectName: event.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none" placeholder="Subject" />
                  <input value={subjectForm.topicName} onChange={(event) => setSubjectForm((current) => ({ ...current, topicName: event.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none" placeholder="Topic" />
                  <input value={subjectForm.targetMinutes} onChange={(event) => setSubjectForm((current) => ({ ...current, targetMinutes: event.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none" placeholder="Target minutes" type="number" min="15" />
                </div>
                <button type="button" onClick={() => void createSubject()} className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-800">
                  Add subject or topic
                </button>
                <div className="grid gap-3">
                  {data.subjects.map((subject) => (
                    <div key={subject.id} className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                      <p className="font-black text-slate-950">{subject.subject_name}</p>
                      <p className="mt-1 text-sm text-slate-500">{subject.topic_name ?? "No topic added yet"}</p>
                      <p className="mt-2 text-sm font-semibold text-[var(--lp-primary)]">Target {subject.target_minutes} min</p>
                    </div>
                  ))}
                  {data.subjects.length === 0 ? <p className="text-sm text-slate-500">Add your first subject to start tracking study plans.</p> : null}
                </div>
              </>
            ) : (
              <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 text-sm text-slate-600">
                {data.subjects.length} active subject records saved. Open this only when updating study structure.
              </div>
            )}
          </div>
        </DashboardCard>

        <DashboardCard title="Focus leaderboard" subtitle="Competition stays optional, not always in your face">
          <div className="grid gap-4">
            <button type="button" onClick={() => toggle("leaderboard")} className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-slate-700">
              {expanded.leaderboard ? "Hide focus leaderboard" : "Show focus leaderboard"}
            </button>
            {expanded.leaderboard ? (
              <>
                <div className="flex flex-wrap gap-3">
	                  <button type="button" onClick={() => setLeaderboardWindow("7d")} className={`rounded-full px-4 py-2 text-sm font-bold ${leaderboardWindow === "7d" ? "border border-[var(--lp-accent-soft)] bg-[var(--lp-accent-soft)] text-[var(--lp-accent-strong)]" : "border border-slate-200 bg-white text-slate-800"}`}>
                    7 days
                  </button>
	                  <button type="button" onClick={() => setLeaderboardWindow("30d")} className={`rounded-full px-4 py-2 text-sm font-bold ${leaderboardWindow === "30d" ? "border border-[var(--lp-accent-soft)] bg-[var(--lp-accent-soft)] text-[var(--lp-accent-strong)]" : "border border-slate-200 bg-white text-slate-800"}`}>
                    30 days
                  </button>
                </div>
                {leaderboard.map((row) => (
                  <div key={row.studentUserId} className="flex flex-col gap-3 rounded-[1.25rem] border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-black text-slate-950">#{row.rank} {row.studentName}</p>
                      <p className="mt-1 text-sm text-slate-500">{row.totalSessions} sessions</p>
                    </div>
                    <p className="text-lg font-black text-[var(--lp-primary)]">{row.totalMinutes} min</p>
                  </div>
                ))}
                {leaderboard.length === 0 ? <p className="text-sm text-slate-500">No leaderboard data yet for your active library.</p> : null}
              </>
            ) : (
              <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 text-sm text-slate-600">
                Leaderboard stays hidden until you want a comparison view.
              </div>
            )}
          </div>
        </DashboardCard>
      </section>

      <DashboardCard title="Recent study history" subtitle="Logs stay available without overwhelming the main workspace">
        <div className="grid gap-4">
          <button type="button" onClick={() => toggle("history")} className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-slate-700">
            {expanded.history ? "Hide study history" : "Show study history"}
          </button>
          {expanded.history ? (
            <div className="grid gap-3">
              {data.sessions.map((session) => (
                <div key={session.id} className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-black text-slate-950">{session.topic_title ?? "Focus session"}</p>
                    <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">{session.session_type}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{session.completed_at.slice(0, 16).replace("T", " ")}</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--lp-primary)]">{session.duration_minutes} minutes</p>
                </div>
              ))}
              {data.sessions.length === 0 ? <p className="text-sm text-slate-500">No focus sessions logged yet. Start with one 25-minute pomodoro.</p> : null}
            </div>
          ) : (
            <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 text-sm text-slate-600">
              {data.sessions.length} sessions logged so far. Open history only when reviewing consistency.
            </div>
          )}
        </div>
      </DashboardCard>
    </div>
  );
}
