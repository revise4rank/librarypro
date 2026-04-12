"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";

type SyllabusResponse = {
  success: boolean;
  data: {
    subjects: Array<{
      id: string;
      title: string;
      topics: Array<{
        id: string;
        title: string;
      }>;
    }>;
  };
};

type RevisionResponse = {
  success: boolean;
  data: {
    items: Array<{
      id: string;
      topicId: string;
      subjectId: string | null;
      subjectTitle: string | null;
      topicTitle: string;
      sourceType: string;
      revisionStage: number;
      scheduledFor: string;
      status: "PENDING" | "COMPLETED" | "OVERDUE";
      priorityScore: number;
      completedAt: string | null;
    }>;
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

export function StudentRevisionManager() {
  const [revision, setRevision] = useState<RevisionResponse["data"] | null>(null);
  const [syllabus, setSyllabus] = useState<SyllabusResponse["data"] | null>(null);
  const [manualForm, setManualForm] = useState({
    topicId: "",
    scheduledFor: "",
    minutesTarget: "30",
  });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showManualReminder, setShowManualReminder] = useState(false);
  const [visibleQueues, setVisibleQueues] = useState<Record<string, boolean>>({
    overdue: true,
    pending: true,
    completed: false,
  });

  async function loadData() {
    try {
      const [revisionResponse, syllabusResponse] = await Promise.all([
        apiFetch<RevisionResponse>("/student/revisions"),
        apiFetch<SyllabusResponse>("/student/syllabus"),
      ]);
      setRevision(revisionResponse.data);
      setSyllabus(syllabusResponse.data);
      setError(null);
      if (!manualForm.topicId) {
        const firstTopic = syllabusResponse.data.subjects.flatMap((subject) => subject.topics)[0];
        if (firstTopic) {
          setManualForm((current) => ({ ...current, topicId: firstTopic.id }));
        }
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load revision dashboard.");
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const grouped = useMemo(() => {
    if (!revision) {
      return { overdue: [], pending: [], completed: [] } as Record<string, RevisionResponse["data"]["items"]>;
    }
    return {
      overdue: revision.items.filter((item) => item.status === "OVERDUE"),
      pending: revision.items.filter((item) => item.status === "PENDING"),
      completed: revision.items.filter((item) => item.status === "COMPLETED"),
    };
  }, [revision]);

  async function completeRevision(revisionId: string) {
    try {
      await apiFetch(`/student/revisions/${revisionId}/complete`, {
        method: "PATCH",
        body: JSON.stringify({
          minutesSpent: 25,
          confidenceScore: 4,
          notes: "Reviewed and refreshed key concepts.",
        }),
      });
      setMessage("Revision marked complete.");
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to complete revision.");
    }
  }

  async function createManualRevision() {
    try {
      await apiFetch("/student/revisions", {
        method: "POST",
        body: JSON.stringify({
          topicId: manualForm.topicId,
          scheduledFor: manualForm.scheduledFor,
          minutesTarget: Number(manualForm.minutesTarget),
        }),
      });
      setMessage("Manual revision scheduled.");
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to schedule manual revision.");
    }
  }

  if (!revision || !syllabus) {
    return <p className="text-sm text-slate-500">{error ?? "Loading revision system..."}</p>;
  }

  return (
    <div className="grid gap-6">
      {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm font-semibold text-amber-700">{error}</p> : null}

      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-5">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-700">Pending</p>
          <p className="mt-3 text-3xl font-black text-slate-950">{revision.analytics.pendingCount}</p>
        </div>
        <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-5">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-rose-700">Overdue</p>
          <p className="mt-3 text-3xl font-black text-slate-950">{revision.analytics.overdueCount}</p>
        </div>
        <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-700">Completed</p>
          <p className="mt-3 text-3xl font-black text-slate-950">{revision.analytics.completedCount}</p>
        </div>
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Consistency</p>
          <p className="mt-3 text-3xl font-black text-slate-950">{revision.analytics.revisionConsistencyDays} days</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <DashboardCard title="Manual reminder" subtitle="Add custom revisions for weak or high-risk topics">
          <div className="grid gap-4">
            <button
              type="button"
              onClick={() => setShowManualReminder((current) => !current)}
              className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-slate-700"
            >
              {showManualReminder ? "Hide manual reminder form" : "Add manual reminder"}
            </button>
            {showManualReminder ? (
              <>
                <select
                  value={manualForm.topicId}
                  onChange={(event) => setManualForm((current) => ({ ...current, topicId: event.target.value }))}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none"
                >
                  <option value="">Choose topic</option>
                  {syllabus.subjects.flatMap((subject) =>
                    subject.topics.map((topic) => (
                      <option key={topic.id} value={topic.id}>
                        {subject.title} | {topic.title}
                      </option>
                    )),
                  )}
                </select>
                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    type="datetime-local"
                    value={manualForm.scheduledFor}
                    onChange={(event) => setManualForm((current) => ({ ...current, scheduledFor: event.target.value }))}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none"
                  />
                  <input
                    type="number"
                    min="10"
                    value={manualForm.minutesTarget}
                    onChange={(event) => setManualForm((current) => ({ ...current, minutesTarget: event.target.value }))}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none"
                  />
                </div>
                <button type="button" onClick={() => void createManualRevision()} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white">
                  Schedule revision
                </button>
              </>
            ) : (
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-600">Weak topic ya exam-near chapter ke liye custom reminder yahin se add karo.</p>
              </div>
            )}
          </div>
        </DashboardCard>

        <DashboardCard title="Retention insight" subtitle="The system should push recall, not just completion">
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Completion</p>
              <p className="mt-3 text-2xl font-black text-slate-950">{revision.analytics.revisionCompletionPercent}%</p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Weak topics</p>
              <p className="mt-3 text-2xl font-black text-slate-950">{revision.analytics.weakTopics}</p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Reminder logic</p>
              <p className="mt-3 text-sm font-semibold text-slate-600">Auto cadence: 1d, 3d, 7d, 15d after topic completion.</p>
            </div>
          </div>
        </DashboardCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        {[
          { key: "overdue", title: "Overdue revisions", tone: "border-rose-200 bg-rose-50" },
          { key: "pending", title: "Pending revisions", tone: "border-amber-200 bg-amber-50" },
          { key: "completed", title: "Completed revisions", tone: "border-emerald-200 bg-emerald-50" },
        ].map((column) => (
          <DashboardCard key={column.key} title={column.title} subtitle="Minimal queue, high signal">
            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => setVisibleQueues((current) => ({ ...current, [column.key]: !current[column.key] }))}
                className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-slate-700"
              >
                {visibleQueues[column.key] ? `Hide ${column.title.toLowerCase()}` : `Show ${column.title.toLowerCase()} (${grouped[column.key].length})`}
              </button>
              {visibleQueues[column.key] ? (
                <>
                  {grouped[column.key].map((item) => (
                    <div key={item.id} className={`rounded-[1.25rem] border p-4 ${column.tone}`}>
                      <p className="font-black text-slate-950">{item.topicTitle}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.subjectTitle ?? "General"} | Stage {item.revisionStage}</p>
                      <p className="mt-2 text-sm text-slate-600">Scheduled {item.scheduledFor.slice(0, 10)}</p>
                      <p className="mt-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Priority {item.priorityScore}</p>
                      {item.status !== "COMPLETED" ? (
                        <button type="button" onClick={() => void completeRevision(item.id)} className="mt-4 rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white">
                          Mark done
                        </button>
                      ) : null}
                    </div>
                  ))}
                  {grouped[column.key].length === 0 ? <p className="text-sm text-slate-500">No items here right now.</p> : null}
                </>
              ) : null}
            </div>
          </DashboardCard>
        ))}
      </section>
    </div>
  );
}
