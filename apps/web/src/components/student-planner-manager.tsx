"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";

type PlannerTab = "daily" | "weekly" | "monthly";
type PlannerPriority = "HIGH" | "MEDIUM" | "LOW" | "REVISION";
type PlannerStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "RESCHEDULED";
type PlannerTaskType = "STUDY" | "REVISION" | "PRACTICE" | "MOCK" | "NOTE";

type PlanEntry = {
  id: string;
  plan_date: string;
  title: string | null;
  subject: string | null;
  chapter_topic: string | null;
  target_minutes: number;
  actual_minutes: number;
  notes: string | null;
  completed: boolean;
  priority: PlannerPriority | null;
  status: PlannerStatus | null;
  deadline_at: string | null;
  start_time: string | null;
  end_time: string | null;
  task_type: PlannerTaskType | null;
  source_type: string | null;
  revision_stage: number | null;
  last_revised_at: string | null;
};

type MonthDay = {
  planDate: string;
  totalEntries: number;
  completedEntries: number;
  totalTarget: number;
  totalActual: number;
};

type PlannerGoal = {
  id: string;
  goal_type: "WEEKLY" | "MONTHLY";
  period_start: string;
  title: string;
  subject: string | null;
  target_minutes: number;
  target_tasks: number;
  completed_tasks: number;
  status: string;
  notes: string | null;
};

type PlannerNote = {
  id: string;
  note_text: string;
  color: string;
  pinned: boolean;
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
};

type PlannerExam = {
  id: string;
  title: string;
  exam_at: string;
  subject: string | null;
  priority: PlannerPriority | null;
  notes: string | null;
};

type PlannerHabit = {
  habit_date: string;
  studied: boolean;
  water: boolean;
  sleep: boolean;
  exercise: boolean;
};

type PlannerAnalytics = {
  heatmap: Array<{ planDate: string; completedEntries: number; totalActual: number }>;
  summary: {
    productiveDays: number;
    totalActualMinutes: number;
    completedTasks: number;
    totalTasks: number;
    completionPercent: number;
  };
};

type QueuedPlannerMutation = {
  id: string;
  url: string;
  method: "POST" | "PATCH" | "DELETE";
  body?: string;
  createdAt: string;
};

const plannerQueueKey = "booklib-planner-offline-queue";

const priorityStyle: Record<PlannerPriority, string> = {
  HIGH: "border-red-200 bg-red-50 text-red-700",
  MEDIUM: "border-amber-200 bg-amber-50 text-amber-700",
  LOW: "border-emerald-200 bg-emerald-50 text-emerald-700",
  REVISION: "border-sky-200 bg-sky-50 text-sky-700",
};

const statusStyle: Record<PlannerStatus, string> = {
  PENDING: "bg-slate-100 text-slate-600",
  IN_PROGRESS: "bg-sky-100 text-sky-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  RESCHEDULED: "bg-slate-200 text-slate-700",
};

const taskTypes: PlannerTaskType[] = ["STUDY", "REVISION", "PRACTICE", "MOCK", "NOTE"];
const priorities: PlannerPriority[] = ["HIGH", "MEDIUM", "LOW", "REVISION"];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function getMondayOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function getMonthStart(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

function addDays(date: string, count: number) {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + count);
  return d.toISOString().slice(0, 10);
}

function formatMinutes(minutes: number) {
  if (!minutes) return "0m";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function percent(done: number, total: number) {
  if (!total) return 0;
  return Math.min(100, Math.round((done / total) * 100));
}

function readableDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function daysUntil(date: string) {
  const today = new Date(`${todayIso()}T00:00:00`).getTime();
  const target = new Date(date).getTime();
  return Math.ceil((target - today) / 86400000);
}

function readPlannerQueue(): QueuedPlannerMutation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(plannerQueueKey);
    return raw ? (JSON.parse(raw) as QueuedPlannerMutation[]) : [];
  } catch {
    window.localStorage.removeItem(plannerQueueKey);
    return [];
  }
}

function writePlannerQueue(queue: QueuedPlannerMutation[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(plannerQueueKey, JSON.stringify(queue));
}

function queuePlannerMutation(mutation: Omit<QueuedPlannerMutation, "id" | "createdAt">) {
  const queued: QueuedPlannerMutation = {
    ...mutation,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
  };
  writePlannerQueue([...readPlannerQueue(), queued]);
  return queued;
}

function ApiMessage({ message, error }: { message: string | null; error: string | null }) {
  if (!message && !error) return null;
  return (
    <div className={`rounded-lg px-3 py-2 text-sm font-semibold ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
      {error ?? message}
    </div>
  );
}

function TinyBadge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-black leading-none ${className}`}>{children}</span>;
}

export function StudentPlannerManager() {
  const [tab, setTab] = useState<PlannerTab>("daily");
  const [weekStart, setWeekStart] = useState(getMondayOfWeek(new Date()));
  const [monthStart, setMonthStart] = useState(getMonthStart());
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [entries, setEntries] = useState<PlanEntry[]>([]);
  const [monthData, setMonthData] = useState<MonthDay[]>([]);
  const [goals, setGoals] = useState<PlannerGoal[]>([]);
  const [notes, setNotes] = useState<PlannerNote[]>([]);
  const [exams, setExams] = useState<PlannerExam[]>([]);
  const [habits, setHabits] = useState<PlannerHabit[]>([]);
  const [analytics, setAnalytics] = useState<PlannerAnalytics | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [draggingEntryId, setDraggingEntryId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [timerEntryId, setTimerEntryId] = useState<string | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [quickForm, setQuickForm] = useState({
    title: "",
    subject: "",
    chapterTopic: "",
    targetMinutes: "60",
    priority: "MEDIUM" as PlannerPriority,
    taskType: "STUDY" as PlannerTaskType,
    startTime: "",
    endTime: "",
    deadlineAt: "",
    notes: "",
  });
  const [goalForm, setGoalForm] = useState({
    title: "",
    subject: "",
    targetMinutes: "600",
    targetTasks: "8",
  });
  const [noteText, setNoteText] = useState("");
  const [examForm, setExamForm] = useState({ title: "", subject: "", examAt: "", notes: "" });

  async function loadWeek(targetWeekStart = weekStart) {
    const res = await apiFetch<{ success: boolean; data: PlanEntry[] }>(`/student/planner/week?weekStart=${targetWeekStart}`);
    setEntries(res.data ?? []);
  }

  async function loadMonth(targetMonthStart = monthStart) {
    const res = await apiFetch<{ success: boolean; data: MonthDay[] }>(`/student/planner/month?month=${targetMonthStart.slice(0, 7)}`);
    setMonthData(res.data ?? []);
  }

  async function loadGoals(goalType: "WEEKLY" | "MONTHLY", periodStart: string) {
    const res = await apiFetch<{ success: boolean; data: PlannerGoal[] }>(`/student/planner/goals?goalType=${goalType}&periodStart=${periodStart}`);
    return res.data ?? [];
  }

  async function loadExtras() {
    const goalType = tab === "monthly" ? "MONTHLY" : "WEEKLY";
    const goalPeriod = tab === "monthly" ? monthStart : weekStart;
    const [goalData, noteRes, examRes, habitRes, analyticsRes] = await Promise.all([
      loadGoals(goalType, goalPeriod),
      apiFetch<{ success: boolean; data: PlannerNote[] }>("/student/planner/notes"),
      apiFetch<{ success: boolean; data: PlannerExam[] }>("/student/planner/exams"),
      apiFetch<{ success: boolean; data: PlannerHabit[] }>(`/student/planner/habits?fromDate=${weekStart}&toDate=${addDays(weekStart, 6)}`),
      apiFetch<{ success: boolean; data: PlannerAnalytics }>(`/student/planner/analytics?fromDate=${monthStart}&toDate=${addDays(monthStart, 34)}`),
    ]);
    setGoals(goalData);
    setNotes(noteRes.data ?? []);
    setExams(examRes.data ?? []);
    setHabits(habitRes.data ?? []);
    setAnalytics(analyticsRes.data ?? null);
  }

  async function loadAll() {
    try {
      await Promise.all([loadWeek(), loadMonth(), loadExtras()]);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Planner data load nahi hua.");
    }
  }

  async function flushPlannerQueue() {
    const queue = readPlannerQueue();
    if (!queue.length) {
      setOfflineQueueCount(0);
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setOfflineQueueCount(queue.length);
      setMessage(`${queue.length} planner change(s) offline queue me saved hain.`);
      return;
    }
    const remaining: QueuedPlannerMutation[] = [];
    for (const mutation of queue) {
      try {
        await apiFetch(mutation.url, {
          method: mutation.method,
          body: mutation.body,
        });
      } catch {
        remaining.push(mutation);
      }
    }
    writePlannerQueue(remaining);
    setOfflineQueueCount(remaining.length);
    if (remaining.length) {
      setMessage(`${remaining.length} planner change(s) abhi sync nahi hue. Sync retry hoga.`);
      return;
    }
    setMessage("Offline planner changes synced.");
    await loadAll();
  }

  async function plannerMutation(url: string, options: { method: "POST" | "PATCH" | "DELETE"; body?: string }) {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      queuePlannerMutation({ url, ...options });
      const count = readPlannerQueue().length;
      setOfflineQueueCount(count);
      setMessage(`Offline saved. ${count} planner change(s) internet aate hi sync honge.`);
      return false;
    }
    try {
      await apiFetch(url, options);
      return true;
    } catch (e) {
      const isNetworkIssue = e instanceof Error && /network issue|Failed to fetch|Network|fetch/i.test(e.message);
      if (!isNetworkIssue) {
        throw e;
      }
      queuePlannerMutation({ url, ...options });
      const count = readPlannerQueue().length;
      setOfflineQueueCount(count);
      setMessage(`Network issue tha. Change saved offline; ${count} item(s) sync pending.`);
      return false;
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, weekStart, monthStart]);

  useEffect(() => {
    setOfflineQueueCount(readPlannerQueue().length);
    const onOnline = () => void flushPlannerQueue();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem("booklib-planner-draft");
    if (saved) {
      try {
        setQuickForm((current) => ({ ...current, ...(JSON.parse(saved) as Partial<typeof quickForm>) }));
      } catch {
        window.localStorage.removeItem("booklib-planner-draft");
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("booklib-planner-draft", JSON.stringify(quickForm));
  }, [quickForm]);

  useEffect(() => {
    if (!timerRunning) return undefined;
    const interval = window.setInterval(() => setTimerSeconds((current) => current + 1), 1000);
    return () => window.clearInterval(interval);
  }, [timerRunning]);

  useEffect(() => {
    setNotificationsEnabled(typeof Notification !== "undefined" && Notification.permission === "granted");
  }, []);

  useEffect(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const reminderKey = `booklib-planner-reminder-${todayIso()}`;
    if (window.localStorage.getItem(reminderKey)) return;
    const pendingToday = entries.filter((entry) => entry.plan_date === todayIso() && !entry.completed && entry.status !== "COMPLETED");
    const nextExam = exams
      .filter((exam) => daysUntil(exam.exam_at) >= 0)
      .sort((a, b) => new Date(a.exam_at).getTime() - new Date(b.exam_at).getTime())[0];
    if (pendingToday.length || nextExam) {
      notifyNow(
        "BookLib Planner",
        pendingToday.length ? `${pendingToday.length} pending study task(s) today. Keep it light, finish one first.` : `${nextExam.title} is coming in ${daysUntil(nextExam.exam_at)} day(s).`,
      );
      window.localStorage.setItem(reminderKey, "sent");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, exams]);

  useEffect(() => {
    if (!notificationsEnabled) return undefined;
    const timers: number[] = [];
    const now = Date.now();
    entries
      .filter((entry) => entry.plan_date === todayIso() && entry.start_time && !entry.completed && entry.status !== "COMPLETED")
      .forEach((entry) => {
        const fireAt = new Date(`${entry.plan_date}T${entry.start_time}:00`).getTime();
        const delay = fireAt - now;
        const reminderKey = `booklib-planner-task-reminder-${entry.id}-${entry.plan_date}-${entry.start_time}`;
        if (delay > 0 && delay < 86400000 && !window.localStorage.getItem(reminderKey)) {
          timers.push(
            window.setTimeout(() => {
              notifyNow("Study session starting", entry.title || entry.chapter_topic || entry.subject || "Planner task");
              window.localStorage.setItem(reminderKey, "sent");
            }, delay),
          );
        }
      });
    exams
      .filter((exam) => daysUntil(exam.exam_at) >= 0 && daysUntil(exam.exam_at) <= 1)
      .forEach((exam) => {
        const reminderKey = `booklib-planner-exam-reminder-${exam.id}-${exam.exam_at.slice(0, 10)}`;
        if (!window.localStorage.getItem(reminderKey)) {
          timers.push(
            window.setTimeout(() => {
              notifyNow("Exam reminder", `${exam.title} is coming soon. Keep revision light and focused.`);
              window.localStorage.setItem(reminderKey, "sent");
            }, 1500),
          );
        }
      });
    return () => timers.forEach((timer) => window.clearTimeout(timer));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, exams, notificationsEnabled]);

  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = addDays(weekStart, index);
        return {
          date,
          label: new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short" }),
        };
      }),
    [weekStart],
  );

  const todayEntries = entries.filter((entry) => entry.plan_date === selectedDate);
  const sortedTodayEntries = [...todayEntries].sort((a, b) => (a.start_time || "99").localeCompare(b.start_time || "99"));
  const todayCompleted = todayEntries.filter((entry) => entry.completed || entry.status === "COMPLETED").length;
  const todayTarget = todayEntries.reduce((sum, entry) => sum + Number(entry.target_minutes || 0), 0);
  const todayActual = todayEntries.reduce((sum, entry) => sum + Number(entry.actual_minutes || 0), 0);
  const highPriorityCount = todayEntries.filter((entry) => entry.priority === "HIGH" && !entry.completed).length;
  const selectedTimerEntry = entries.find((entry) => entry.id === timerEntryId) ?? null;

  const monthYear = monthStart.slice(0, 7);
  const [year, month] = monthYear.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const calendarDays = Array.from({ length: daysInMonth }, (_, index) => {
    const dayStr = `${monthYear}-${String(index + 1).padStart(2, "0")}`;
    return monthData.find((day) => day.planDate === dayStr) ?? { planDate: dayStr, totalEntries: 0, completedEntries: 0, totalTarget: 0, totalActual: 0 };
  });

  const subjectTotals = entries.reduce<Record<string, { target: number; actual: number; count: number }>>((acc, entry) => {
    const subject = entry.subject || "General";
    acc[subject] = acc[subject] ?? { target: 0, actual: 0, count: 0 };
    acc[subject].target += Number(entry.target_minutes || 0);
    acc[subject].actual += Number(entry.actual_minutes || 0);
    acc[subject].count += 1;
    return acc;
  }, {});

  const weeklyReview = useMemo(() => {
    const dayScores = weekDays.map((day) => {
      const dayItems = entries.filter((entry) => entry.plan_date === day.date);
      const completed = dayItems.filter((entry) => entry.completed || entry.status === "COMPLETED").length;
      const actual = dayItems.reduce((sum, entry) => sum + Number(entry.actual_minutes || 0), 0);
      return { ...day, total: dayItems.length, completed, actual };
    });
    const completed = dayScores.reduce((sum, day) => sum + day.completed, 0);
    const total = dayScores.reduce((sum, day) => sum + day.total, 0);
    const missed = total - completed;
    const best = dayScores.reduce((winner, day) => (day.actual > winner.actual ? day : winner), dayScores[0]);
    const lowest = dayScores.reduce((loser, day) => (day.total > 0 && day.actual < loser.actual ? day : loser), dayScores.find((day) => day.total > 0) ?? dayScores[0]);
    const consistency = dayScores.filter((day) => day.completed > 0 || day.actual > 0).length;
    return { completed, total, missed, best, lowest, consistency };
  }, [entries, weekDays]);

  async function addEntry(planDate = selectedDate) {
    const hasTaskText = Boolean(quickForm.title.trim() || quickForm.subject.trim() || quickForm.chapterTopic.trim());
    if (!hasTaskText) {
      setError("Subject ya topic add karo, phir task save hoga.");
      return;
    }
    const actionKey = `add-entry-${planDate}`;
    try {
      setPendingAction(actionKey);
      setError(null);
      const targetMinutes = parseInt(quickForm.targetMinutes, 10) || 60;
      const synced = await createPlannerTask({
        planDate,
        title: quickForm.title || quickForm.subject || "Study task",
        subject: quickForm.subject || null,
        chapterTopic: quickForm.chapterTopic || null,
        targetMinutes,
        priority: quickForm.priority,
        taskType: quickForm.taskType,
        startTime: quickForm.startTime || null,
        endTime: quickForm.endTime || null,
        deadlineAt: quickForm.deadlineAt ? `${quickForm.deadlineAt}T23:59:00` : null,
        notes: quickForm.notes || null,
      });
      setMessage(synced ? "Task added." : "Task saved offline.");
      setQuickForm({
        title: "",
        subject: "",
        chapterTopic: "",
        targetMinutes: "60",
        priority: "MEDIUM",
        taskType: "STUDY",
        startTime: "",
        endTime: "",
        deadlineAt: "",
        notes: "",
      });
      window.localStorage.removeItem("booklib-planner-draft");
      if (synced) await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Task add nahi hua.");
    } finally {
      setPendingAction(null);
    }
  }

  async function createPlannerTask(body: Record<string, unknown>) {
    return plannerMutation("/student/planner", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async function updateEntry(entryId: string, body: Record<string, unknown>) {
    try {
      setPendingAction(`update-entry-${entryId}`);
      setError(null);
      const synced = await plannerMutation(`/student/planner/${entryId}`, { method: "PATCH", body: JSON.stringify(body) });
      if (synced) await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Task update nahi hua.");
    } finally {
      setPendingAction(null);
    }
  }

  async function completeEntry(entry: PlanEntry) {
    await updateEntry(entry.id, {
      completed: !entry.completed,
      status: entry.completed ? "PENDING" : "COMPLETED",
      actualMinutes: entry.completed ? entry.actual_minutes : Math.max(entry.actual_minutes || 0, entry.target_minutes || 0),
    });
  }

  async function deleteEntry(entryId: string) {
    try {
      setPendingAction(`delete-entry-${entryId}`);
      setError(null);
      const synced = await plannerMutation(`/student/planner/${entryId}`, { method: "DELETE" });
      if (synced) await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Task delete nahi hua.");
    } finally {
      setPendingAction(null);
    }
  }

  async function carryForward(entryId: string) {
    try {
      setPendingAction(`carry-forward-${entryId}`);
      setError(null);
      const synced = await plannerMutation(`/student/planner/entries/${entryId}/carry-forward`, {
        method: "POST",
        body: JSON.stringify({ nextDate: addDays(selectedDate, 1) }),
      });
      setMessage("Task next day me move ho gaya.");
      if (synced) await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Carry forward nahi hua.");
    } finally {
      setPendingAction(null);
    }
  }

  async function markRevision(entryId: string, revisionStage: number) {
    try {
      setPendingAction(`revision-${entryId}`);
      setError(null);
      const synced = await plannerMutation(`/student/planner/entries/${entryId}/revision`, {
        method: "POST",
        body: JSON.stringify({ revisionStage }),
      });
      if (synced) await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Revision mark nahi hua.");
    } finally {
      setPendingAction(null);
    }
  }

  async function moveEntryToDate(entryId: string, planDate: string) {
    await updateEntry(entryId, { planDate, status: "RESCHEDULED" });
    setMessage(`Task moved to ${readableDate(planDate)}.`);
  }

  async function enableNotifications() {
    if (typeof Notification === "undefined") {
      setError("Browser notifications available nahi hain.");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === "granted");
    setMessage(permission === "granted" ? "Planner reminders enabled." : "Notifications allow nahi hua.");
  }

  function notifyNow(title: string, body: string) {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(title, { body });
    } else {
      setMessage(body);
    }
  }

  async function generateTasksFromGoal(goal: PlannerGoal) {
    try {
      setPendingAction(`generate-goal-${goal.id}`);
      setError(null);
      const count = Math.max(1, goal.target_tasks || 1);
      const minutes = Math.max(20, Math.round((goal.target_minutes || 60) / count));
      const results = await Promise.all(
        Array.from({ length: count }, (_, index) =>
          createPlannerTask({
            planDate: addDays(weekStart, index % 7),
            title: `${goal.title} ${count > 1 ? index + 1 : ""}`.trim(),
            subject: goal.subject,
            chapterTopic: goal.title,
            targetMinutes: minutes,
            priority: index < 2 ? "HIGH" : "MEDIUM",
            taskType: goal.title.toLowerCase().includes("revision") ? "REVISION" : "STUDY",
            sourceType: "WEEKLY_GOAL",
            notes: "Generated from weekly goal",
          }),
        ),
      );
      const syncedCount = results.filter(Boolean).length;
      setMessage(syncedCount === count ? `${count} daily tasks created from weekly goal.` : `${count - syncedCount} task(s) saved offline for sync.`);
      if (syncedCount) await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Goal breakdown nahi hua.");
    } finally {
      setPendingAction(null);
    }
  }

  async function splitMonthlyGoalIntoWeeks(goal: PlannerGoal) {
    try {
      setPendingAction(`split-goal-${goal.id}`);
      setError(null);
      const totalMinutes = goal.target_minutes || 0;
      const totalTasks = goal.target_tasks || 4;
      const firstWeekStart = getMondayOfWeek(new Date(`${monthStart}T00:00:00`));
      const weekStarts = Array.from({ length: 4 }, (_, index) => addDays(firstWeekStart, index * 7));
      const results = await Promise.all(
        weekStarts.map((periodStart, index) =>
          plannerMutation("/student/planner/goals", {
            method: "POST",
            body: JSON.stringify({
              goalType: "WEEKLY",
              periodStart,
              title: `${goal.title} - Week ${index + 1}`,
              subject: goal.subject,
              targetMinutes: Math.round(totalMinutes / 4),
              targetTasks: Math.max(1, Math.round(totalTasks / 4)),
              notes: "Generated from monthly goal",
            }),
          }),
        ),
      );
      const syncedCount = results.filter(Boolean).length;
      setWeekStart(firstWeekStart);
      setSelectedDate(firstWeekStart);
      setTab("weekly");
      if (syncedCount) {
        const weeklyGoals = await loadGoals("WEEKLY", firstWeekStart);
        setGoals(weeklyGoals);
        await loadWeek(firstWeekStart);
      }
      setMessage(
        syncedCount === 4
          ? `Monthly goal split ho gaya. Weekly board ${readableDate(firstWeekStart)} par open hai.`
          : `${4 - syncedCount} weekly goal(s) offline saved hain. Online hote hi sync honge.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Monthly goal breakdown nahi hua.");
    } finally {
      setPendingAction(null);
    }
  }

  async function logTimer() {
    if (!selectedTimerEntry) return;
    setPendingAction("log-timer");
    const minutes = Math.max(1, Math.round(timerSeconds / 60));
    try {
      const synced = await plannerMutation(`/student/planner/${selectedTimerEntry.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          actualMinutes: Number(selectedTimerEntry.actual_minutes || 0) + minutes,
          status: "IN_PROGRESS",
        }),
      });
      setTimerRunning(false);
      setTimerSeconds(0);
      setMessage(`Logged ${formatMinutes(minutes)} focus time.`);
      if (synced) await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Timer log nahi hua.");
    } finally {
      setPendingAction(null);
    }
  }

  async function addGoal(goalType: "WEEKLY" | "MONTHLY") {
    try {
      setPendingAction(`add-goal-${goalType}`);
      setError(null);
      const synced = await plannerMutation("/student/planner/goals", {
        method: "POST",
        body: JSON.stringify({
          goalType,
          periodStart: goalType === "MONTHLY" ? monthStart : weekStart,
          title: goalForm.title || `${goalType === "MONTHLY" ? "Monthly" : "Weekly"} study goal`,
          subject: goalForm.subject || null,
          targetMinutes: parseInt(goalForm.targetMinutes, 10) || 0,
          targetTasks: parseInt(goalForm.targetTasks, 10) || 0,
          notes: null,
        }),
      });
      setGoalForm({ title: "", subject: "", targetMinutes: "600", targetTasks: "8" });
      if (synced) await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Goal save nahi hua.");
    } finally {
      setPendingAction(null);
    }
  }

  async function deleteGoal(goalId: string) {
    try {
      setPendingAction(`delete-goal-${goalId}`);
      setError(null);
      const synced = await plannerMutation(`/student/planner/goals/${goalId}`, { method: "DELETE" });
      if (synced) await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Goal delete nahi hua.");
    } finally {
      setPendingAction(null);
    }
  }

  async function addNote() {
    if (!noteText.trim()) return;
    try {
      setPendingAction("add-note");
      setError(null);
      const synced = await plannerMutation("/student/planner/notes", {
        method: "POST",
        body: JSON.stringify({ noteText, color: "#fef3c7", pinned: true }),
      });
      setNoteText("");
      if (synced) await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Note save nahi hua.");
    } finally {
      setPendingAction(null);
    }
  }

  async function updateNote(noteId: string, body: Record<string, unknown>) {
    const previousNotes = notes;
    setNotes((current) =>
      current.map((note) =>
        note.id === noteId
          ? {
              ...note,
              note_text: typeof body.noteText === "string" ? body.noteText : note.note_text,
              color: typeof body.color === "string" ? body.color : note.color,
              pinned: typeof body.pinned === "boolean" ? body.pinned : note.pinned,
            }
          : note,
      ),
    );
    try {
      setPendingAction(`update-note-${noteId}`);
      setError(null);
      const synced = await plannerMutation(`/student/planner/notes/${noteId}`, { method: "PATCH", body: JSON.stringify(body) });
      if (synced) await loadAll();
    } catch (e) {
      setNotes(previousNotes);
      setError(e instanceof Error ? e.message : "Note update nahi hua.");
    } finally {
      setPendingAction(null);
    }
  }

  async function deleteNote(noteId: string) {
    const previousNotes = notes;
    setNotes((current) => current.filter((note) => note.id !== noteId));
    try {
      setPendingAction(`delete-note-${noteId}`);
      setError(null);
      const synced = await plannerMutation(`/student/planner/notes/${noteId}`, { method: "DELETE" });
      if (synced) await loadAll();
    } catch (e) {
      setNotes(previousNotes);
      setError(e instanceof Error ? e.message : "Note delete nahi hua.");
    } finally {
      setPendingAction(null);
    }
  }

  async function addExam() {
    if (!examForm.title || !examForm.examAt) {
      setError("Exam title aur date dono chahiye.");
      return;
    }
    try {
      setPendingAction("add-exam");
      setError(null);
      const synced = await plannerMutation("/student/planner/exams", {
        method: "POST",
        body: JSON.stringify({
          title: examForm.title,
          subject: examForm.subject || null,
          examAt: examForm.examAt,
          priority: "HIGH",
          notes: examForm.notes || null,
        }),
      });
      setExamForm({ title: "", subject: "", examAt: "", notes: "" });
      if (synced) await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Exam save nahi hua.");
    } finally {
      setPendingAction(null);
    }
  }

  async function deleteExam(examId: string) {
    try {
      setPendingAction(`delete-exam-${examId}`);
      setError(null);
      const synced = await plannerMutation(`/student/planner/exams/${examId}`, { method: "DELETE" });
      if (synced) await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Exam delete nahi hua.");
    } finally {
      setPendingAction(null);
    }
  }

  async function toggleHabit(key: "studied" | "water" | "sleep" | "exercise") {
    const current = habits.find((habit) => habit.habit_date === selectedDate);
    try {
      setPendingAction(`habit-${key}`);
      setError(null);
      const synced = await plannerMutation("/student/planner/habits", {
        method: "PATCH",
        body: JSON.stringify({
          habitDate: selectedDate,
          studied: key === "studied" ? !current?.studied : current?.studied ?? false,
          water: key === "water" ? !current?.water : current?.water ?? false,
          sleep: key === "sleep" ? !current?.sleep : current?.sleep ?? false,
          exercise: key === "exercise" ? !current?.exercise : current?.exercise ?? false,
        }),
      });
      if (synced) await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Habit update nahi hua.");
    } finally {
      setPendingAction(null);
    }
  }

  function renderQuickAdd(defaultDate = selectedDate) {
    return (
      <div className="grid gap-2 rounded-lg border border-[var(--lp-border)] bg-white p-2.5">
        <div className="grid gap-2 md:grid-cols-4">
          <input
            value={quickForm.subject}
            onChange={(event) => setQuickForm((form) => ({ ...form, subject: event.target.value }))}
            placeholder="Subject"
            className="min-w-0 rounded-lg border border-[var(--lp-border)] px-3 py-2 text-sm outline-none"
          />
          <input
            value={quickForm.chapterTopic}
            onChange={(event) => setQuickForm((form) => ({ ...form, chapterTopic: event.target.value, title: event.target.value || form.title }))}
            placeholder="Chapter or topic"
            className="min-w-0 rounded-lg border border-[var(--lp-border)] px-3 py-2 text-sm outline-none"
          />
          <input
            type="number"
            min={5}
            value={quickForm.targetMinutes}
            onChange={(event) => setQuickForm((form) => ({ ...form, targetMinutes: event.target.value }))}
            placeholder="Minutes"
            className="min-w-0 rounded-lg border border-[var(--lp-border)] px-3 py-2 text-sm outline-none"
          />
          <select
            value={quickForm.priority}
            onChange={(event) => setQuickForm((form) => ({ ...form, priority: event.target.value as PlannerPriority }))}
            className="min-w-0 rounded-lg border border-[var(--lp-border)] px-3 py-2 text-sm outline-none"
          >
            {priorities.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2 md:grid-cols-5">
          <select
            value={quickForm.taskType}
            onChange={(event) => setQuickForm((form) => ({ ...form, taskType: event.target.value as PlannerTaskType }))}
            className="min-w-0 rounded-lg border border-[var(--lp-border)] px-3 py-2 text-sm outline-none"
          >
            {taskTypes.map((taskType) => (
              <option key={taskType} value={taskType}>
                {taskType}
              </option>
            ))}
          </select>
          <input
            type="time"
            value={quickForm.startTime}
            onChange={(event) => setQuickForm((form) => ({ ...form, startTime: event.target.value }))}
            className="min-w-0 rounded-lg border border-[var(--lp-border)] px-3 py-2 text-sm outline-none"
          />
          <input
            type="time"
            value={quickForm.endTime}
            onChange={(event) => setQuickForm((form) => ({ ...form, endTime: event.target.value }))}
            className="min-w-0 rounded-lg border border-[var(--lp-border)] px-3 py-2 text-sm outline-none"
          />
          <input
            type="date"
            value={quickForm.deadlineAt}
            onChange={(event) => setQuickForm((form) => ({ ...form, deadlineAt: event.target.value }))}
            className="min-w-0 rounded-lg border border-[var(--lp-border)] px-3 py-2 text-sm outline-none"
          />
          <button
            type="button"
            onClick={() => void addEntry(defaultDate)}
            disabled={Boolean(pendingAction)}
            className="rounded-lg bg-[var(--lp-accent)] px-3 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pendingAction?.startsWith("add-entry") ? "Adding..." : `Add ${defaultDate === todayIso() ? "today" : readableDate(defaultDate)}`}
          </button>
        </div>
      </div>
    );
  }

  function renderTaskCard(entry: PlanEntry) {
    const priority = entry.priority ?? "MEDIUM";
    const status = entry.completed ? "COMPLETED" : entry.status ?? "PENDING";
    const busy = Boolean(pendingAction && pendingAction.includes(entry.id));
    return (
      <article key={entry.id} className="rounded-lg border border-[var(--lp-border)] bg-white p-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <TinyBadge className={priorityStyle[priority]}>{priority}</TinyBadge>
              <TinyBadge className={`${statusStyle[status]} border-transparent`}>{status.replace("_", " ")}</TinyBadge>
              {entry.task_type ? <TinyBadge className="border-slate-200 bg-slate-50 text-slate-600">{entry.task_type}</TinyBadge> : null}
            </div>
            <h4 className="mt-2 truncate text-sm font-black text-[var(--lp-text)]">{entry.title || entry.chapter_topic || entry.subject || "Study task"}</h4>
            <p className="mt-1 text-xs text-[var(--lp-muted)]">
              {[entry.subject, entry.chapter_topic].filter(Boolean).join(" - ") || "General plan"}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {entry.start_time || "Anytime"} {entry.end_time ? `- ${entry.end_time}` : ""} · Target {formatMinutes(entry.target_minutes || 0)} · Done{" "}
              {formatMinutes(entry.actual_minutes || 0)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void completeEntry(entry)}
            disabled={busy}
            className={`shrink-0 rounded-lg px-3 py-2 text-xs font-black disabled:cursor-not-allowed disabled:opacity-50 ${entry.completed ? "bg-emerald-100 text-emerald-700" : "bg-slate-950 text-white"}`}
          >
            {busy ? "Saving..." : entry.completed ? "Done" : "Complete"}
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setTimerEntryId(entry.id);
              setTimerSeconds(0);
              setTimerRunning(true);
            }}
            disabled={busy}
            className="rounded-lg border border-[var(--lp-border)] px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-50"
          >
            Start timer
          </button>
          <button type="button" onClick={() => void carryForward(entry.id)} disabled={busy} className="rounded-lg border border-[var(--lp-border)] px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-50">
            Carry forward
          </button>
          <button type="button" onClick={() => void markRevision(entry.id, (entry.revision_stage || 0) + 1)} disabled={busy} className="rounded-lg border border-sky-200 px-3 py-1.5 text-xs font-bold text-sky-700 disabled:opacity-50">
            {entry.revision_stage ? `Revision ${entry.revision_stage + 1}` : "Revision +1"}
          </button>
          <input
            type="date"
            aria-label="Move task date"
            defaultValue={entry.plan_date}
            onChange={(event) => void updateEntry(entry.id, { planDate: event.target.value, status: "RESCHEDULED" })}
            className="rounded-lg border border-[var(--lp-border)] px-2 py-1.5 text-xs font-semibold"
          />
          <button type="button" onClick={() => void deleteEntry(entry.id)} disabled={busy} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 disabled:opacity-50">
            Delete
          </button>
        </div>
      </article>
    );
  }

  return (
    <div className="grid gap-3">
      <ApiMessage message={message} error={error} />
      {offlineQueueCount ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">
          <span>{offlineQueueCount} planner change(s) offline saved hain. Internet aate hi auto-sync hoga.</span>
          <button type="button" onClick={() => void flushPlannerQueue()} className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-black text-white">
            Sync now
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <DashboardCard title="Today progress">
          <p className="text-2xl font-black text-[var(--lp-text)]">{percent(todayCompleted, todayEntries.length)}%</p>
          <div className="mt-2 h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-[var(--lp-accent)]" style={{ width: `${percent(todayCompleted, todayEntries.length)}%` }} />
          </div>
        </DashboardCard>
        <DashboardCard title="Planned hours">
          <p className="text-2xl font-black text-[var(--lp-text)]">{formatMinutes(todayTarget)}</p>
          <p className="text-xs font-semibold text-[var(--lp-muted)]">Done {formatMinutes(todayActual)}</p>
        </DashboardCard>
        <DashboardCard title="Completed">
          <p className="text-2xl font-black text-[var(--lp-text)]">
            {todayCompleted}/{todayEntries.length}
          </p>
          <p className="text-xs font-semibold text-[var(--lp-muted)]">tasks today</p>
        </DashboardCard>
        <DashboardCard title="Study streak">
          <p className="text-2xl font-black text-[var(--lp-text)]">{analytics?.summary.productiveDays ?? 0}</p>
          <p className="text-xs font-semibold text-[var(--lp-muted)]">productive days this month</p>
        </DashboardCard>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--lp-border)] bg-white p-1.5">
        <div className="grid flex-1 grid-cols-3 gap-1">
          {(["daily", "weekly", "monthly"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`rounded-md px-3 py-2 text-sm font-black capitalize ${tab === item ? "bg-[var(--lp-accent-soft)] text-[var(--lp-accent)]" : "text-slate-600 hover:bg-slate-50"}`}
            >
              {item}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            setSelectedDate(todayIso());
            setTab("daily");
            setQuickOpen((current) => !current);
          }}
          className="rounded-md bg-slate-950 px-3 py-2 text-sm font-black text-white"
        >
          New task
        </button>
        <button
          type="button"
          onClick={() => void (notificationsEnabled ? notifyNow("BookLib Planner", "Reminders are already enabled for this browser.") : enableNotifications())}
          className="rounded-md border border-[var(--lp-border)] px-3 py-2 text-sm font-black text-slate-700"
        >
          {notificationsEnabled ? "Reminders on" : "Enable reminders"}
        </button>
      </div>

      {quickOpen && tab !== "daily" ? renderQuickAdd() : null}
      {highPriorityCount > 3 ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
          High-priority overload: {highPriorityCount} urgent tasks today. Move some to tomorrow to keep the day realistic.
        </div>
      ) : null}

      {tab === "daily" ? (
        <div className="grid gap-3 xl:grid-cols-[1.5fr_0.9fr]">
          <DashboardCard title="Daily timeline" subtitle="What to study today, how long, and what is still pending.">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="rounded-lg border border-[var(--lp-border)] px-3 py-2 text-sm outline-none"
              />
              <span className="text-xs font-bold text-[var(--lp-muted)]">{todayEntries.length} tasks</span>
            </div>
            <div className="mb-3">
              {renderQuickAdd(selectedDate)}
            </div>
            <div className="grid gap-2">
              {sortedTodayEntries.length ? sortedTodayEntries.map(renderTaskCard) : (
                <div className="rounded-lg border border-dashed border-[var(--lp-border)] p-4 text-sm font-semibold text-[var(--lp-muted)]">
                  Aaj ka plan empty hai. Upar se pehla task add karo.
                </div>
              )}
            </div>
          </DashboardCard>

          <div className="grid gap-3">
            <DashboardCard title="Focus timer" subtitle="Simple timer: start from any task, then log minutes back to that task.">
              <div className="rounded-lg bg-slate-950 p-3 text-white">
                <p className="text-xs font-bold text-white/60">{selectedTimerEntry?.title || "No task selected"}</p>
                <p className="mt-1 text-3xl font-black">{formatMinutes(Math.floor(timerSeconds / 60))}</p>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => setTimerRunning((current) => !current)} disabled={!selectedTimerEntry} className="rounded-lg bg-white px-3 py-2 text-xs font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">
                    {timerRunning ? "Pause" : selectedTimerEntry ? "Start" : "Pick task first"}
                  </button>
                  <button type="button" onClick={() => void logTimer()} disabled={!selectedTimerEntry || timerSeconds < 1 || pendingAction === "log-timer"} className="rounded-lg border border-white/30 px-3 py-2 text-xs font-black disabled:opacity-40">
                    {pendingAction === "log-timer" ? "Logging..." : "Log session"}
                  </button>
                </div>
              </div>
            </DashboardCard>

            <DashboardCard title="Sticky notes">
              <div className="flex gap-2">
                <input value={noteText} onChange={(event) => setNoteText(event.target.value)} placeholder="Formula, reminder, thought" className="min-w-0 flex-1 rounded-lg border border-[var(--lp-border)] px-3 py-2 text-sm outline-none" />
                <button type="button" onClick={() => void addNote()} disabled={pendingAction === "add-note"} className="rounded-lg bg-amber-100 px-3 py-2 text-sm font-black text-amber-800 disabled:opacity-60">
                  {pendingAction === "add-note" ? "Saving..." : "Pin"}
                </button>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {notes.slice(0, 4).map((note) => (
                  <div
                    key={note.id}
                    className="rounded-lg border border-amber-100 px-3 py-2 text-sm font-semibold text-amber-950 shadow-sm"
                    style={{ backgroundColor: note.color || "#fef3c7", minHeight: Math.max(70, Math.min(180, note.height || 100)) }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span>{note.note_text}</span>
                      <button
                        type="button"
                        aria-label="Delete note"
                        onClick={(event) => {
                          event.stopPropagation();
                          void deleteNote(note.id);
                        }}
                        disabled={pendingAction === `delete-note-${note.id}`}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-lg font-black text-amber-800 transition hover:bg-white/60 disabled:opacity-50"
                      >
                        X
                      </button>
                    </div>
                    <div className="mt-2 flex gap-2">
                      {["#fef3c7", "#dcfce7", "#dbeafe", "#fce7f3"].map((color) => (
                        <button
                          key={color}
                          type="button"
                          aria-label="Change note color"
                          onClick={(event) => {
                            event.stopPropagation();
                            void updateNote(note.id, { color });
                          }}
                          disabled={pendingAction === `update-note-${note.id}`}
                          className={`h-8 w-8 rounded-full border-2 shadow-sm transition hover:scale-105 disabled:opacity-50 ${note.color === color ? "border-slate-900" : "border-white"}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </DashboardCard>

            <DashboardCard title="Exam countdown">
              <div className="grid gap-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <input value={examForm.title} onChange={(event) => setExamForm((form) => ({ ...form, title: event.target.value }))} placeholder="Exam title" className="rounded-lg border border-[var(--lp-border)] px-3 py-2 text-sm outline-none" />
                  <input type="datetime-local" value={examForm.examAt} onChange={(event) => setExamForm((form) => ({ ...form, examAt: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] px-3 py-2 text-sm outline-none" />
                </div>
                <button type="button" onClick={() => void addExam()} disabled={pendingAction === "add-exam"} className="rounded-lg border border-[var(--lp-border)] px-3 py-2 text-sm font-black text-slate-700 disabled:opacity-60">
                  {pendingAction === "add-exam" ? "Saving..." : "Add exam"}
                </button>
                {exams.slice(0, 3).map((exam) => (
                  <div key={exam.id} className="rounded-lg border border-red-100 bg-red-50 px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-black text-red-800">{exam.title}</p>
                        <p className="text-xs font-semibold text-red-700">{daysUntil(exam.exam_at)} days left</p>
                      </div>
                      <button type="button" onClick={() => void deleteExam(exam.id)} disabled={pendingAction === `delete-exam-${exam.id}`} className="rounded-md bg-white/70 px-2 py-1 text-xs font-black text-red-700 disabled:opacity-50">
                        X
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </DashboardCard>
          </div>
        </div>
      ) : null}

      {tab === "weekly" ? (
        <div className="grid gap-3">
          <DashboardCard title="Weekly workload board" subtitle="Drag tasks between days or move them from the date input.">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <input type="date" value={weekStart} onChange={(event) => setWeekStart(getMondayOfWeek(new Date(`${event.target.value}T00:00:00`)))} className="rounded-lg border border-[var(--lp-border)] px-3 py-2 text-sm outline-none" />
              <button
                type="button"
                onClick={() => {
                  setSelectedDate(weekStart);
                  setTab("daily");
                  setQuickOpen(false);
                }}
                className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-black text-white"
              >
                Add task
              </button>
            </div>
            <div className="grid gap-2 lg:grid-cols-7">
              {weekDays.map((day) => {
                const dayItems = entries.filter((entry) => entry.plan_date === day.date);
                return (
                  <section
                    key={day.date}
                    onDragEnter={() => setDragOverDate(day.date)}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragOverDate(day.date);
                    }}
                    onDragLeave={() => setDragOverDate((current) => (current === day.date ? null : current))}
                    onDrop={() => {
                      if (draggingEntryId) void moveEntryToDate(draggingEntryId, day.date);
                      setDraggingEntryId(null);
                      setDragOverDate(null);
                    }}
                    className={`min-h-[9rem] rounded-lg border p-2 transition ${dragOverDate === day.date ? "border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] shadow-sm" : "border-[var(--lp-border)] bg-slate-50"}`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black text-slate-700">{day.label}</p>
                      <span className="text-[11px] font-bold text-slate-500">{readableDate(day.date)}</span>
                    </div>
                    <div className="mt-2 grid gap-1.5">
                      {dayItems.slice(0, 4).map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          draggable
                          onDragStart={() => setDraggingEntryId(entry.id)}
                          onDragEnd={() => setDraggingEntryId(null)}
                          onClick={() => {
                            setSelectedDate(day.date);
                            setTab("daily");
                            setQuickOpen(false);
                          }}
                          className={`truncate rounded-md px-2 py-1.5 text-left text-xs font-bold transition ${draggingEntryId === entry.id ? "scale-[0.98] opacity-60" : ""} ${entry.completed ? "bg-emerald-100 text-emerald-800" : "bg-white text-slate-700"}`}
                        >
                          {entry.title || entry.subject || "Study"}
                        </button>
                      ))}
                      {draggingEntryId && !dayItems.length ? <p className="rounded-md border border-dashed border-[var(--lp-accent)] px-2 py-2 text-center text-[11px] font-black text-[var(--lp-accent)]">Drop here</p> : null}
                      {dayItems.length > 4 ? <p className="text-[11px] font-bold text-slate-400">+{dayItems.length - 4} more</p> : null}
                    </div>
                  </section>
                );
              })}
            </div>
          </DashboardCard>

          <div className="grid gap-3 xl:grid-cols-2">
            <DashboardCard title="Weekly goals">
              <div className="grid gap-2 md:grid-cols-6">
                <input value={goalForm.title} onChange={(event) => setGoalForm((form) => ({ ...form, title: event.target.value }))} placeholder="Goal title" className="rounded-lg border border-[var(--lp-border)] px-3 py-2 text-sm outline-none md:col-span-2" />
                <input value={goalForm.subject} onChange={(event) => setGoalForm((form) => ({ ...form, subject: event.target.value }))} placeholder="Subject" className="rounded-lg border border-[var(--lp-border)] px-3 py-2 text-sm outline-none" />
                <input type="number" min={0} value={goalForm.targetMinutes} onChange={(event) => setGoalForm((form) => ({ ...form, targetMinutes: event.target.value }))} placeholder="Minutes" className="rounded-lg border border-[var(--lp-border)] px-3 py-2 text-sm outline-none" />
                <input type="number" min={0} value={goalForm.targetTasks} onChange={(event) => setGoalForm((form) => ({ ...form, targetTasks: event.target.value }))} placeholder="Tasks" className="rounded-lg border border-[var(--lp-border)] px-3 py-2 text-sm outline-none" />
                <button type="button" onClick={() => void addGoal("WEEKLY")} disabled={Boolean(pendingAction)} className="rounded-lg bg-[var(--lp-accent)] px-3 py-2 text-sm font-black text-white disabled:opacity-60">
                  {pendingAction === "add-goal-WEEKLY" ? "Saving..." : "Add goal"}
                </button>
              </div>
              <div className="mt-2 grid gap-2">
                {goals.map((goal) => (
                  <div key={goal.id} className="rounded-lg border border-[var(--lp-border)] px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-black text-[var(--lp-text)]">{goal.title}</p>
                      <span className="text-xs font-bold text-[var(--lp-muted)]">{formatMinutes(goal.target_minutes)}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-[var(--lp-accent)]" style={{ width: `${percent(goal.completed_tasks, goal.target_tasks)}%` }} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" onClick={() => void generateTasksFromGoal(goal)} disabled={pendingAction === `generate-goal-${goal.id}`} className="rounded-lg border border-[var(--lp-border)] px-3 py-1.5 text-xs font-black text-slate-700 disabled:opacity-60">
                        {pendingAction === `generate-goal-${goal.id}` ? "Generating..." : "Generate daily tasks"}
                      </button>
                      <button type="button" onClick={() => void deleteGoal(goal.id)} disabled={pendingAction === `delete-goal-${goal.id}`} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-black text-red-700 disabled:opacity-60">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </DashboardCard>

            <DashboardCard title="Subject volume">
              <div className="grid gap-2">
                {Object.entries(subjectTotals).map(([subject, value]) => (
                  <div key={subject} className="rounded-lg border border-[var(--lp-border)] px-3 py-2">
                    <div className="flex justify-between gap-2">
                      <p className="text-sm font-black text-[var(--lp-text)]">{subject}</p>
                      <p className="text-xs font-bold text-[var(--lp-muted)]">
                        {formatMinutes(value.actual)} / {formatMinutes(value.target)}
                      </p>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-sky-500" style={{ width: `${percent(value.actual, value.target)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </DashboardCard>

            <DashboardCard title="Weekly review">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-emerald-50 px-3 py-2">
                  <p className="text-xs font-bold text-emerald-700">Completed</p>
                  <p className="text-xl font-black text-emerald-900">{weeklyReview.completed}/{weeklyReview.total}</p>
                </div>
                <div className="rounded-lg bg-red-50 px-3 py-2">
                  <p className="text-xs font-bold text-red-700">Missed</p>
                  <p className="text-xl font-black text-red-900">{weeklyReview.missed}</p>
                </div>
                <div className="rounded-lg bg-sky-50 px-3 py-2">
                  <p className="text-xs font-bold text-sky-700">Best day</p>
                  <p className="text-sm font-black text-sky-900">{weeklyReview.best?.label ?? "-"} · {formatMinutes(weeklyReview.best?.actual ?? 0)}</p>
                </div>
                <div className="rounded-lg bg-amber-50 px-3 py-2">
                  <p className="text-xs font-bold text-amber-700">Consistency</p>
                  <p className="text-sm font-black text-amber-900">{weeklyReview.consistency}/7 days</p>
                </div>
              </div>
            </DashboardCard>
          </div>
        </div>
      ) : null}

      {tab === "monthly" ? (
        <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
          <DashboardCard title="Monthly calendar" subtitle="Calendar markers show planned and completed study days.">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <input type="month" value={monthStart.slice(0, 7)} onChange={(event) => setMonthStart(`${event.target.value}-01`)} className="rounded-lg border border-[var(--lp-border)] px-3 py-2 text-sm outline-none" />
              <span className="text-xs font-bold text-[var(--lp-muted)]">{analytics?.summary.completionPercent ?? 0}% monthly completion</span>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-black text-slate-400">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <span key={day}>{day}</span>
              ))}
              {Array.from({ length: firstDayOfWeek }, (_, index) => (
                <span key={`blank-${index}`} />
              ))}
              {calendarDays.map((day) => {
                const intensity = Math.min(4, Math.ceil((day.totalActual || day.totalTarget || 0) / 60));
                const bg = ["bg-slate-50", "bg-emerald-50", "bg-emerald-100", "bg-emerald-200", "bg-emerald-400"][intensity];
                return (
                  <button key={day.planDate} type="button" onClick={() => { setSelectedDate(day.planDate); setTab("daily"); }} className={`min-h-14 rounded-lg border border-[var(--lp-border)] p-1 text-left ${bg}`}>
                    <span className="text-xs font-black text-slate-700">{Number(day.planDate.slice(-2))}</span>
                    <p className="mt-1 text-[10px] font-bold text-slate-500">{day.completedEntries}/{day.totalEntries}</p>
                  </button>
                );
              })}
            </div>
          </DashboardCard>

          <div className="grid gap-3">
            <DashboardCard title="Monthly goals">
              <div className="grid gap-2">
                <input value={goalForm.title} onChange={(event) => setGoalForm((form) => ({ ...form, title: event.target.value }))} placeholder="Monthly milestone" className="rounded-lg border border-[var(--lp-border)] px-3 py-2 text-sm outline-none" />
                <div className="grid gap-2 sm:grid-cols-3">
                  <input value={goalForm.subject} onChange={(event) => setGoalForm((form) => ({ ...form, subject: event.target.value }))} placeholder="Subject optional" className="rounded-lg border border-[var(--lp-border)] px-3 py-2 text-sm outline-none" />
                  <input type="number" min={0} value={goalForm.targetMinutes} onChange={(event) => setGoalForm((form) => ({ ...form, targetMinutes: event.target.value }))} placeholder="Target minutes" className="rounded-lg border border-[var(--lp-border)] px-3 py-2 text-sm outline-none" />
                  <input type="number" min={0} value={goalForm.targetTasks} onChange={(event) => setGoalForm((form) => ({ ...form, targetTasks: event.target.value }))} placeholder="Target tasks" className="rounded-lg border border-[var(--lp-border)] px-3 py-2 text-sm outline-none" />
                </div>
                <button type="button" onClick={() => void addGoal("MONTHLY")} disabled={Boolean(pendingAction)} className="rounded-lg bg-[var(--lp-accent)] px-3 py-2 text-sm font-black text-white disabled:opacity-60">
                  {pendingAction === "add-goal-MONTHLY" ? "Saving..." : "Add monthly goal"}
                </button>
                {goals.map((goal) => (
                  <div key={goal.id} className="rounded-lg border border-[var(--lp-border)] px-3 py-2">
                    <p className="text-sm font-black text-[var(--lp-text)]">{goal.title}</p>
                    <p className="text-xs font-semibold text-[var(--lp-muted)]">{formatMinutes(goal.target_minutes)} target</p>
                    <p className="mt-1 text-xs font-semibold text-[var(--lp-muted)]">Split karne par 4 weekly goals banenge aur Weekly board open hoga.</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" onClick={() => void splitMonthlyGoalIntoWeeks(goal)} disabled={pendingAction === `split-goal-${goal.id}`} className="rounded-lg border border-[var(--lp-border)] px-3 py-1.5 text-xs font-black text-slate-700 disabled:opacity-60">
                        {pendingAction === `split-goal-${goal.id}` ? "Splitting..." : "Split into weekly goals"}
                      </button>
                      <button type="button" onClick={() => void deleteGoal(goal.id)} disabled={pendingAction === `delete-goal-${goal.id}`} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-black text-red-700 disabled:opacity-60">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </DashboardCard>

            <DashboardCard title="Habits today">
              <div className="grid grid-cols-2 gap-2">
                {(["studied", "water", "sleep", "exercise"] as const).map((habit) => {
                  const current = habits.find((item) => item.habit_date === selectedDate);
                  const active = Boolean(current?.[habit]);
                  return (
                    <button key={habit} type="button" onClick={() => void toggleHabit(habit)} disabled={pendingAction === `habit-${habit}`} className={`rounded-lg border px-3 py-2 text-sm font-black capitalize disabled:opacity-60 ${active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-[var(--lp-border)] bg-white text-slate-600"}`}>
                      {habit}
                    </button>
                  );
                })}
              </div>
            </DashboardCard>

            <DashboardCard title="Monthly summary">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-emerald-50 px-3 py-2">
                  <p className="text-xs font-bold text-emerald-700">Productive days</p>
                  <p className="text-xl font-black text-emerald-900">{analytics?.summary.productiveDays ?? 0}</p>
                </div>
                <div className="rounded-lg bg-sky-50 px-3 py-2">
                  <p className="text-xs font-bold text-sky-700">Study hours</p>
                  <p className="text-xl font-black text-sky-900">{formatMinutes(analytics?.summary.totalActualMinutes ?? 0)}</p>
                </div>
                <div className="rounded-lg bg-amber-50 px-3 py-2">
                  <p className="text-xs font-bold text-amber-700">Completed</p>
                  <p className="text-xl font-black text-amber-900">{analytics?.summary.completedTasks ?? 0}/{analytics?.summary.totalTasks ?? 0}</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-xs font-bold text-slate-700">Completion</p>
                  <p className="text-xl font-black text-slate-900">{analytics?.summary.completionPercent ?? 0}%</p>
                </div>
              </div>
            </DashboardCard>
          </div>
        </div>
      ) : null}
    </div>
  );
}
