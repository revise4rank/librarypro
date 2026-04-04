"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";

function formatClock(totalSeconds: number) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function StudentFocusMode() {
  const [taskTitle, setTaskTitle] = useState("Deep work session");
  const [durationMinutes, setDurationMinutes] = useState("25");
  const [running, setRunning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const plannedMinutes = useMemo(() => {
    const numeric = Number(durationMinutes);
    if (!Number.isFinite(numeric) || numeric < 5) {
      return 25;
    }
    return Math.min(180, numeric);
  }, [durationMinutes]);

  useEffect(() => {
    if (!running) {
      setRemainingSeconds(plannedMinutes * 60);
    }
  }, [plannedMinutes, running]);

  useEffect(() => {
    if (!running) {
      return;
    }

    const interval = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          setRunning(false);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [running]);

  async function completeSession(status: "COMPLETED" | "ABANDONED") {
    const minutesSpent = Math.max(1, Math.round((plannedMinutes * 60 - remainingSeconds) / 60));
    if (status === "COMPLETED" || minutesSpent >= 5) {
      try {
        await apiFetch("/student/focus/sessions", {
          method: "POST",
          body: JSON.stringify({
            topicTitle: taskTitle,
            durationMinutes: minutesSpent,
            sessionType: "FOCUS_MODE",
          }),
        });
        setMessage(status === "COMPLETED" ? "Focus session saved." : "Partial deep-work session saved.");
        setError(null);
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Unable to save focus mode session.");
      }
    }

    setRunning(false);
    setRemainingSeconds(plannedMinutes * 60);
  }

  if (!running) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#09090b_0%,#111827_100%)] px-6 py-8 text-white">
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-4xl content-center gap-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.32em] text-emerald-400">Focus Mode</p>
              <h1 className="mt-3 text-4xl font-black md:text-6xl">One task. One timer. No noise.</h1>
            </div>
            <Link href="/student/focus" className="rounded-full border border-white/15 px-5 py-3 text-sm font-bold text-white/90">
              Exit to tracker
            </Link>
          </div>

          <div className="grid gap-6 rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur md:grid-cols-[1.1fr_0.9fr]">
            <div className="grid gap-4">
              <label className="grid gap-2 text-sm font-semibold text-white/80">
                Current task
                <input
                  value={taskTitle}
                  onChange={(event) => setTaskTitle(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white outline-none"
                  placeholder="Revision sprint, test analysis, chapter solve..."
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-white/80">
                Session minutes
                <input
                  value={durationMinutes}
                  onChange={(event) => setDurationMinutes(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white outline-none"
                  type="number"
                  min="5"
                  max="180"
                />
              </label>
              <div className="flex flex-wrap gap-3">
                {[25, 50, 90].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDurationMinutes(String(value))}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white/90"
                  >
                    {value} min
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 rounded-[1.75rem] border border-emerald-400/20 bg-emerald-400/10 p-5">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-300">Mode rules</p>
              <p className="text-sm leading-7 text-white/75">No offers, no notice stream, no dashboard widgets. This screen stays intentionally minimal for dopamine control.</p>
              <div className="grid gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white/80">Emergency call indicator only</div>
                <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white/80">Notifications visually muted</div>
                <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white/80">Session auto-logs on completion</div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <button type="button" onClick={() => { setRemainingSeconds(plannedMinutes * 60); setRunning(true); setMessage(null); }} className="rounded-full bg-white px-6 py-4 text-sm font-black text-black">
              Start focus mode
            </button>
            {message ? <p className="self-center text-sm font-semibold text-emerald-300">{message}</p> : null}
            {error ? <p className="self-center text-sm font-semibold text-amber-300">{error}</p> : null}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-8 px-6 py-10 text-center">
        <div className="absolute left-6 top-6 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-emerald-300">
          Emergency calls only
        </div>
        <p className="text-xs font-black uppercase tracking-[0.35em] text-emerald-400">Focus Mode Active</p>
        <h1 className="max-w-3xl text-4xl font-black md:text-6xl">{taskTitle}</h1>
        <p className="text-7xl font-black tabular-nums md:text-8xl">{formatClock(remainingSeconds)}</p>
        <p className="max-w-xl text-sm leading-7 text-zinc-400">
          Everything non-essential is visually removed here. Finish one meaningful block, then return to the dashboard.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <button type="button" onClick={() => void completeSession("COMPLETED")} className="rounded-full bg-white px-6 py-3 text-sm font-black text-black">
            Complete session
          </button>
          <button type="button" onClick={() => void completeSession("ABANDONED")} className="rounded-full border border-white/15 px-6 py-3 text-sm font-black text-white">
            End early
          </button>
        </div>
      </div>
    </main>
  );
}
