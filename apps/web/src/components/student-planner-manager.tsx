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

type MonthDay = {
  planDate: string;
  totalEntries: number;
  completedEntries: number;
  totalTarget: number;
  totalActual: number;
};

function getMondayOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function getMonthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function fmtMins(m: number) {
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function StudentPlannerManager() {
  const [tab, setTab] = useState<"daily" | "weekly" | "monthly">("daily");
  const [weekStart, setWeekStart] = useState(getMondayOfWeek(new Date()));
  const [monthStart, setMonthStart] = useState(getMonthStart());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [entries, setEntries] = useState<PlanEntry[]>([]);
  const [monthData, setMonthData] = useState<MonthDay[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [logId, setLogId] = useState<string | null>(null);
  const [logMinutes, setLogMinutes] = useState("");
  const [addForm, setAddForm] = useState({
    subject: "",
    targetMinutes: "60",
    notes: "",
  });

  async function loadWeek() {
    try {
      const res = await apiFetch<{ success: boolean; data: PlanEntry[] }>(`/student/planner/week?weekStart=${weekStart}`);
      setEntries(res.data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load planner");
    }
  }

  async function loadMonth() {
    try {
      const res = await apiFetch<{ success: boolean; data: MonthDay[] }>(`/student/planner/month?month=${monthStart.slice(0, 7)}`);
      setMonthData(res.data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load month");
    }
  }

  useEffect(() => {
    if (tab === "daily" || tab === "weekly") void loadWeek();
    if (tab === "monthly") void loadMonth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, weekStart, monthStart]);

  async function addEntry() {
    try {
      await apiFetch("/student/planner", {
        method: "POST",
        body: JSON.stringify({
          planDate: selectedDate,
          subject: addForm.subject || null,
          targetMinutes: parseInt(addForm.targetMinutes, 10) || 60,
          notes: addForm.notes || null,
        }),
      });
      setMessage("Entry added.");
      setShowAdd(false);
      setAddForm({ subject: "", targetMinutes: "60", notes: "" });
      await loadWeek();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add entry");
    }
  }

  async function toggleComplete(entry: PlanEntry) {
    try {
      await apiFetch(`/student/planner/${entry.id}`, {
        method: "PATCH",
        body: JSON.stringify({ completed: !entry.completed }),
      });
      await loadWeek();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    }
  }

  async function logTime(entryId: string) {
    const mins = parseInt(logMinutes, 10);
    if (isNaN(mins) || mins < 0) return;
    try {
      await apiFetch(`/student/planner/${entryId}`, {
        method: "PATCH",
        body: JSON.stringify({ actualMinutes: mins }),
      });
      setLogId(null);
      setLogMinutes("");
      await loadWeek();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to log time");
    }
  }

  async function deleteEntry(entryId: string) {
    try {
      await apiFetch(`/student/planner/${entryId}`, { method: "DELETE" });
      await loadWeek();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  // For daily tab: filter entries to selectedDate
  const dayEntries = entries.filter((e) => e.plan_date === selectedDate);

  // For weekly tab: generate 7 days Mon–Sun
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  // Monthly calendar
  const monthYear = monthStart.slice(0, 7);
  const [year, month] = monthYear.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => {
    const dayStr = `${monthYear}-${String(i + 1).padStart(2, "0")}`;
    return monthData.find((d) => d.planDate === dayStr) ?? { planDate: dayStr, totalEntries: 0, completedEntries: 0, totalTarget: 0, totalActual: 0 };
  });

  const TABS = [
    { key: "daily", label: "Daily" },
    { key: "weekly", label: "Weekly" },
    { key: "monthly", label: "Monthly" },
  ] as const;

  return (
    <div className="grid gap-6">
      {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm font-semibold text-amber-700">{error}</p> : null}

      {/* Tab bar */}
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
              tab === t.key ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Daily tab */}
      {tab === "daily" && (
        <DashboardCard title="Daily planner" subtitle="Plan your study sessions, one day at a time.">
          <div className="grid gap-4">
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => setShowAdd((v) => !v)}
                className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-bold text-white"
              >
                {showAdd ? "Cancel" : "+ Add session"}
              </button>
            </div>

            {showAdd && (
              <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <input
                  value={addForm.subject}
                  onChange={(e) => setAddForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder="Subject (e.g. Physics, Maths)"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none"
                />
                <div className="flex gap-3">
                  <input
                    type="number"
                    value={addForm.targetMinutes}
                    onChange={(e) => setAddForm((f) => ({ ...f, targetMinutes: e.target.value }))}
                    placeholder="Target minutes"
                    min={1}
                    className="w-36 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none"
                  />
                  <input
                    value={addForm.notes}
                    onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Notes (optional)"
                    className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none"
                  />
                </div>
                <button type="button" onClick={() => void addEntry()} className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700">
                  Add to {selectedDate}
                </button>
              </div>
            )}

            {dayEntries.length === 0 ? (
              <p className="text-sm text-slate-400">No sessions planned for this day. Add one above.</p>
            ) : (
              <div className="grid gap-3">
                {dayEntries.map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{entry.subject ?? "General Study"}</p>
                        {entry.notes ? <p className="mt-0.5 text-xs text-slate-500">{entry.notes}</p> : null}
                        <p className="mt-1 text-xs text-slate-400">
                          Target: {fmtMins(entry.target_minutes)} · Actual: {fmtMins(entry.actual_minutes)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void toggleComplete(entry)}
                          className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                            entry.completed ? "bg-emerald-100 text-emerald-700" : "border border-slate-200 text-slate-500"
                          }`}
                        >
                          {entry.completed ? "Done ✓" : "Mark done"}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setLogId(entry.id); setLogMinutes(String(entry.actual_minutes)); }}
                          className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500"
                        >
                          Log time
                        </button>
                        <button type="button" onClick={() => void deleteEntry(entry.id)} className="text-xs text-rose-400 hover:text-rose-600">✕</button>
                      </div>
                    </div>
                    {logId === entry.id && (
                      <div className="mt-3 flex gap-2">
                        <input
                          type="number"
                          value={logMinutes}
                          onChange={(e) => setLogMinutes(e.target.value)}
                          placeholder="Actual minutes"
                          min={0}
                          className="w-32 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
                        />
                        <button type="button" onClick={() => void logTime(entry.id)} className="rounded-full bg-slate-950 px-4 py-2 text-xs font-bold text-white">Save</button>
                        <button type="button" onClick={() => setLogId(null)} className="text-xs text-slate-400">Cancel</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DashboardCard>
      )}

      {/* Weekly tab */}
      {tab === "weekly" && (
        <DashboardCard title="Weekly overview" subtitle="Your study sessions across the week.">
          <div className="grid gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const d = new Date(weekStart);
                  d.setDate(d.getDate() - 7);
                  setWeekStart(d.toISOString().slice(0, 10));
                }}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-600"
              >← Prev</button>
              <span className="text-sm font-semibold text-slate-700">Week of {weekStart}</span>
              <button
                type="button"
                onClick={() => {
                  const d = new Date(weekStart);
                  d.setDate(d.getDate() + 7);
                  setWeekStart(d.toISOString().slice(0, 10));
                }}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-600"
              >Next →</button>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => {
                const dayEntries = entries.filter((e) => e.plan_date === day);
                const done = dayEntries.filter((e) => e.completed).length;
                const total = dayEntries.length;
                const dayLabel = new Date(day + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric" });
                return (
                  <div
                    key={day}
                    className={`rounded-2xl border p-3 text-center cursor-pointer ${
                      day === selectedDate ? "border-slate-950 bg-slate-50" : "border-slate-200 bg-white"
                    }`}
                    onClick={() => { setSelectedDate(day); setTab("daily"); }}
                  >
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{dayLabel}</p>
                    {total > 0 ? (
                      <>
                        <p className="mt-1 text-lg font-black text-slate-800">{done}/{total}</p>
                        <p className="text-[10px] text-slate-500">sessions</p>
                      </>
                    ) : (
                      <p className="mt-2 text-xs text-slate-300">—</p>
                    )}
                  </div>
                );
              })}
            </div>
            {entries.length > 0 && (
              <div className="mt-2">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Subjects this week</p>
                {[...new Set(entries.map((e) => e.subject ?? "General Study"))].map((subj) => {
                  const subjEntries = entries.filter((e) => (e.subject ?? "General Study") === subj);
                  const total = subjEntries.reduce((s, e) => s + e.target_minutes, 0);
                  const actual = subjEntries.reduce((s, e) => s + e.actual_minutes, 0);
                  const pct = total > 0 ? Math.min(100, Math.round((actual / total) * 100)) : 0;
                  return (
                    <div key={subj} className="mb-3">
                      <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                        <span>{subj}</span>
                        <span>{fmtMins(actual)} / {fmtMins(total)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-slate-800 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DashboardCard>
      )}

      {/* Monthly tab */}
      {tab === "monthly" && (
        <DashboardCard title="Monthly calendar" subtitle="Colour-coded by completion rate.">
          <div className="grid gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const [y, m] = monthStart.slice(0, 7).split("-").map(Number);
                  const prev = new Date(y, m - 2, 1);
                  setMonthStart(prev.toISOString().slice(0, 10));
                }}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-600"
              >← Prev</button>
              <span className="text-sm font-semibold text-slate-700">
                {new Date(monthStart).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
              </span>
              <button
                type="button"
                onClick={() => {
                  const [y, m] = monthStart.slice(0, 7).split("-").map(Number);
                  const next = new Date(y, m, 1);
                  setMonthStart(next.toISOString().slice(0, 10));
                }}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-600"
              >Next →</button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <p key={i} className="text-[10px] font-black uppercase text-slate-400">{d}</p>
              ))}
              {/* Offset for first day (0=Sun → 6 offset, 1=Mon → 0 offset) */}
              {Array.from({ length: firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1 }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {calendarDays.map((day) => {
                const pct = day.totalEntries > 0 ? Math.round((day.completedEntries / day.totalEntries) * 100) : -1;
                const bg = pct < 0 ? "bg-slate-50" : pct >= 80 ? "bg-emerald-100" : pct >= 40 ? "bg-amber-100" : "bg-red-100";
                const label = day.planDate.slice(8);
                return (
                  <div
                    key={day.planDate}
                    className={`${bg} flex aspect-square cursor-pointer items-center justify-center rounded-xl text-xs font-bold text-slate-700 hover:opacity-80`}
                    title={day.totalEntries > 0 ? `${day.completedEntries}/${day.totalEntries} done` : "No sessions"}
                    onClick={() => { setSelectedDate(day.planDate); setWeekStart(getMondayOfWeek(new Date(day.planDate))); setTab("daily"); }}
                  >
                    {label}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-emerald-100" />≥80% done</span>
              <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-amber-100" />40–79%</span>
              <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-red-100" />&lt;40%</span>
            </div>
          </div>
        </DashboardCard>
      )}
    </div>
  );
}
