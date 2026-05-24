"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";

type PlanEntry = {
  id: string;
  plan_date: string;
  subject: string | null;
  target_minutes: number;
  actual_minutes: number;
  notes: string | null;
  completed: boolean;
};

type MonthDaySummary = {
  plan_date: string;
  total_target: number;
  total_actual: number;
  entries: number;
  completed: number;
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMondayOfDate(date: Date): string {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  return monday.toISOString().split("T")[0];
}

function formatMinutes(m: number) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h === 0) return `${min}m`;
  if (min === 0) return `${h}h`;
  return `${h}h ${min}m`;
}

function getWeekDates(weekStart: string): string[] {
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

function getMonthDates(month: string): (string | null)[][] {
  const [year, mon] = month.split("-").map(Number);
  const firstDay = new Date(year, mon - 1, 1);
  const lastDay = new Date(year, mon, 0);
  const startDow = firstDay.getDay(); // 0=Sun
  const offset = startDow === 0 ? 6 : startDow - 1; // Monday-based offset

  const weeks: (string | null)[][] = [];
  let week: (string | null)[] = new Array(offset).fill(null);

  for (let d = 1; d <= lastDay.getDate(); d++) {
    week.push(`${month}-${String(d).padStart(2, "0")}`);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

export function StudentPlannerManager() {
  const [tab, setTab] = useState<"daily" | "weekly" | "monthly">("daily");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Daily / Weekly
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [weekStart, setWeekStart] = useState<string>(() => getMondayOfDate(new Date()));
  const [weekEntries, setWeekEntries] = useState<PlanEntry[]>([]);

  // Monthly
  const [month, setMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [monthData, setMonthData] = useState<MonthDaySummary[]>([]);

  // Add form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject: "", targetMinutes: "60", notes: "" });
  const [editingEntry, setEditingEntry] = useState<PlanEntry | null>(null);
  const [editActual, setEditActual] = useState("");

  async function loadWeek(ws: string) {
    try {
      const res = await apiFetch<{ success: boolean; data: PlanEntry[] }>(`/student/planner/week?weekStart=${ws}`);
      setWeekEntries(res.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load planner.");
    }
  }

  async function loadMonth(m: string) {
    try {
      const res = await apiFetch<{ success: boolean; data: MonthDaySummary[] }>(`/student/planner/month?month=${m}`);
      setMonthData(res.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load monthly data.");
    }
  }

  useEffect(() => { void loadWeek(weekStart); }, [weekStart]);
  useEffect(() => { void loadMonth(month); }, [month]);

  const dailyEntries = weekEntries.filter((e) => e.plan_date === selectedDate);

  async function addEntry(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    try {
      await apiFetch("/student/planner", {
        method: "POST",
        body: JSON.stringify({
          planDate: selectedDate,
          subject: form.subject || undefined,
          targetMinutes: Number(form.targetMinutes),
          notes: form.notes || undefined,
        }),
      });
      setMessage("Entry added.");
      setShowForm(false);
      setForm({ subject: "", targetMinutes: "60", notes: "" });
      await loadWeek(weekStart);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add entry.");
    }
  }

  async function toggleComplete(entry: PlanEntry) {
    try {
      await apiFetch(`/student/planner/${entry.id}`, {
        method: "PATCH",
        body: JSON.stringify({ completed: !entry.completed }),
      });
      await loadWeek(weekStart);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update.");
    }
  }

  async function saveActual(entry: PlanEntry) {
    try {
      await apiFetch(`/student/planner/${entry.id}`, {
        method: "PATCH",
        body: JSON.stringify({ actualMinutes: Number(editActual) }),
      });
      setEditingEntry(null);
      setEditActual("");
      await loadWeek(weekStart);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    }
  }

  async function removeEntry(id: string) {
    try {
      await apiFetch(`/student/planner/${id}`, { method: "DELETE" });
      await loadWeek(weekStart);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove.");
    }
  }

  const weekDates = getWeekDates(weekStart);
  const monthDaySummaryMap = new Map(monthData.map((d) => [d.plan_date, d]));

  return (
    <div className="grid gap-3 md:gap-6">
      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      {message ? <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p> : null}

      {/* Tab selector */}
      <div className="flex gap-2">
        {(["daily", "weekly", "monthly"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-5 py-2 text-sm font-bold capitalize ${
              tab === t ? "bg-[var(--lp-primary)] text-white" : "border border-slate-200 bg-white text-slate-600"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── DAILY TAB ─────────────────────────────────────────────────────── */}
      {tab === "daily" ? (
        <DashboardCard
          title="Daily plan"
          subtitle={`Entries for ${selectedDate}`}
        >
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                // adjust week if needed
                const ws = getMondayOfDate(new Date(e.target.value));
                if (ws !== weekStart) setWeekStart(ws);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
            />
            <button
              type="button"
              onClick={() => { setShowForm((v) => !v); setMessage(null); }}
              className="rounded-full bg-[var(--lp-primary)] px-5 py-2 text-sm font-bold text-white"
            >
              {showForm ? "Cancel" : "+ Add session"}
            </button>
          </div>

          {showForm ? (
            <form onSubmit={addEntry} className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Subject
                  <input
                    value={form.subject}
                    onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                    placeholder="e.g. Physics, Maths"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Target (minutes)
                  <input
                    type="number"
                    min="5"
                    value={form.targetMinutes}
                    onChange={(e) => setForm((f) => ({ ...f, targetMinutes: e.target.value }))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
                  />
                </label>
              </div>
              <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Notes (optional)
                <input
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Chapter 3, practice problems…"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
                />
              </label>
              <button type="submit" className="justify-self-start rounded-xl bg-[var(--lp-primary)] px-6 py-2.5 text-sm font-bold text-white">
                Add entry
              </button>
            </form>
          ) : null}

          {dailyEntries.length === 0 ? (
            <p className="text-sm text-slate-500">No sessions planned for {selectedDate}. Add one above.</p>
          ) : (
            <div className="grid gap-2">
              {dailyEntries.map((entry) => (
                <div key={entry.id} className={`rounded-xl border p-3 ${entry.completed ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => void toggleComplete(entry)}
                      className={`flex-shrink-0 h-5 w-5 rounded-full border-2 transition-colors ${entry.completed ? "border-emerald-500 bg-emerald-500" : "border-slate-300"}`}
                    >
                      {entry.completed ? <span className="block text-center text-[10px] leading-none text-white">✓</span> : null}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`font-black ${entry.completed ? "text-emerald-700 line-through" : "text-slate-950"}`}>
                        {entry.subject ?? "Study session"}
                      </p>
                      <p className="text-xs text-slate-500">
                        Target: {formatMinutes(entry.target_minutes)}
                        {entry.actual_minutes > 0 ? ` · Actual: ${formatMinutes(entry.actual_minutes)}` : ""}
                      </p>
                      {entry.notes ? <p className="mt-0.5 text-xs text-slate-400">{entry.notes}</p> : null}
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => { setEditingEntry(entry); setEditActual(entry.actual_minutes.toString()); }}
                        className="rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-600"
                      >
                        Log time
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeEntry(entry.id)}
                        className="rounded-full border border-red-100 px-2.5 py-1 text-[10px] font-bold text-red-400"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  {editingEntry?.id === entry.id ? (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={editActual}
                        onChange={(e) => setEditActual(e.target.value)}
                        placeholder="Actual minutes"
                        className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => void saveActual(entry)}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingEntry(null)}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </DashboardCard>
      ) : null}

      {/* ── WEEKLY TAB ────────────────────────────────────────────────────── */}
      {tab === "weekly" ? (
        <DashboardCard title="Weekly overview" subtitle="All sessions planned for the week">
          <div className="mb-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const prev = new Date(weekStart);
                prev.setDate(prev.getDate() - 7);
                setWeekStart(prev.toISOString().split("T")[0]);
              }}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600"
            >
              ← Prev
            </button>
            <span className="text-sm font-bold text-slate-950">{weekStart}</span>
            <button
              type="button"
              onClick={() => {
                const next = new Date(weekStart);
                next.setDate(next.getDate() + 7);
                setWeekStart(next.toISOString().split("T")[0]);
              }}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600"
            >
              Next →
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {DAYS.map((day, i) => {
              const date = weekDates[i];
              const dayEntries = weekEntries.filter((e) => e.plan_date === date);
              const totalTarget = dayEntries.reduce((s, e) => s + e.target_minutes, 0);
              const totalActual = dayEntries.reduce((s, e) => s + e.actual_minutes, 0);
              const doneCount = dayEntries.filter((e) => e.completed).length;
              const isToday = date === new Date().toISOString().split("T")[0];
              return (
                <div
                  key={date}
                  className={`rounded-xl border p-2 text-center ${isToday ? "border-[var(--lp-primary)] bg-[var(--lp-primary)]/5" : "border-slate-200 bg-white"}`}
                >
                  <p className={`text-[10px] font-black uppercase ${isToday ? "text-[var(--lp-primary)]" : "text-slate-500"}`}>{day}</p>
                  <p className="mt-1 text-xs text-slate-400">{date.slice(8)}</p>
                  {dayEntries.length > 0 ? (
                    <>
                      <p className="mt-2 text-xs font-bold text-slate-950">{dayEntries.length} session{dayEntries.length > 1 ? "s" : ""}</p>
                      <p className="text-[10px] text-slate-500">{formatMinutes(totalTarget)} planned</p>
                      {totalActual > 0 ? <p className="text-[10px] font-bold text-emerald-600">{formatMinutes(totalActual)} done</p> : null}
                      {doneCount === dayEntries.length && dayEntries.length > 0
                        ? <p className="mt-1 text-[10px] font-black text-emerald-600">✓ All done</p>
                        : <p className="mt-1 text-[10px] text-slate-400">{doneCount}/{dayEntries.length} done</p>}
                    </>
                  ) : (
                    <p className="mt-2 text-[10px] text-slate-300">—</p>
                  )}
                </div>
              );
            })}
          </div>

          {weekEntries.length > 0 ? (
            <div className="mt-4">
              <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">Subject summary this week</p>
              {(() => {
                const subjectMap = new Map<string, { target: number; actual: number }>();
                for (const e of weekEntries) {
                  const key = e.subject ?? "General";
                  const curr = subjectMap.get(key) ?? { target: 0, actual: 0 };
                  subjectMap.set(key, { target: curr.target + e.target_minutes, actual: curr.actual + e.actual_minutes });
                }
                return Array.from(subjectMap.entries()).map(([subj, stats]) => (
                  <div key={subj} className="mb-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-800">{subj}</span>
                      <span className="text-slate-500">{formatMinutes(stats.actual)} / {formatMinutes(stats.target)}</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[var(--lp-primary)]"
                        style={{ width: `${Math.min(100, stats.target > 0 ? Math.round((stats.actual / stats.target) * 100) : 0)}%` }}
                      />
                    </div>
                  </div>
                ));
              })()}
            </div>
          ) : null}
        </DashboardCard>
      ) : null}

      {/* ── MONTHLY TAB ───────────────────────────────────────────────────── */}
      {tab === "monthly" ? (
        <DashboardCard title="Monthly overview" subtitle="Color-coded by daily completion percentage">
          <div className="mb-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const [y, m] = month.split("-").map(Number);
                const prev = new Date(y, m - 2, 1);
                setMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`);
              }}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600"
            >
              ← Prev
            </button>
            <span className="text-sm font-bold text-slate-950">{month}</span>
            <button
              type="button"
              onClick={() => {
                const [y, m] = month.split("-").map(Number);
                const next = new Date(y, m, 1);
                setMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
              }}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600"
            >
              Next →
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {DAYS.map((d) => (
              <p key={d} className="py-1 text-[10px] font-black uppercase text-slate-400">{d}</p>
            ))}
            {getMonthDates(month).map((week, wi) =>
              week.map((date, di) => {
                if (!date) {
                  return <div key={`${wi}-${di}`} />;
                }
                const summary = monthDaySummaryMap.get(date);
                const pct = summary && summary.total_target > 0
                  ? Math.min(100, Math.round((summary.total_actual / summary.total_target) * 100))
                  : 0;
                const isToday = date === new Date().toISOString().split("T")[0];
                const bg = summary
                  ? pct >= 80 ? "bg-emerald-200 text-emerald-800"
                    : pct >= 40 ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-600"
                  : "";
                return (
                  <div
                    key={date}
                    className={`rounded-lg p-1 ${bg} ${isToday ? "ring-2 ring-[var(--lp-primary)]" : ""}`}
                    title={summary ? `${summary.entries} sessions, ${pct}% done` : date}
                  >
                    <p className="text-xs font-bold">{date.slice(8)}</p>
                    {summary ? <p className="text-[9px]">{pct}%</p> : null}
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-4 flex gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-emerald-200" /> ≥80%</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber-100" /> 40–79%</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-red-100" /> &lt;40%</span>
          </div>
        </DashboardCard>
      ) : null}
    </div>
  );
}
