"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";

type SyllabusResponse = {
  success: boolean;
  data: {
    subjects: Array<{
      id: string;
      title: string;
      color_hex: string | null;
      total_topics: number;
      completed_topics: number;
      completion_percent: number;
      topics: Array<{
        id: string;
        subject_id: string;
        title: string;
        topic_order: number;
        estimated_minutes: number;
        status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
        progress_percent: number;
        completed_at: string | null;
      }>;
    }>;
    analytics: {
      totalSubjects: number;
      totalTopics: number;
      completedTopics: number;
      dailyCompletedTopics: number;
    };
  };
};

const topicStatusOptions = [
  { value: "NOT_STARTED", label: "Not started" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "COMPLETED", label: "Completed" },
] as const;

export function StudentSyllabusManager() {
  const [data, setData] = useState<SyllabusResponse["data"] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subjectForm, setSubjectForm] = useState({ title: "", colorHex: "#d2723d" });
  const [topicForm, setTopicForm] = useState({ subjectId: "", title: "", estimatedMinutes: "90" });
  const [savingTopicId, setSavingTopicId] = useState<string | null>(null);
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [openSubjects, setOpenSubjects] = useState<Record<string, boolean>>({});

  async function loadSyllabus() {
    try {
      const response = await apiFetch<SyllabusResponse>("/student/syllabus");
      setData(response.data);
      setError(null);
      if (!topicForm.subjectId && response.data.subjects[0]) {
        setTopicForm((current) => ({ ...current, subjectId: response.data.subjects[0].id }));
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load syllabus.");
    }
  }

  useEffect(() => {
    void loadSyllabus();
  }, []);

  async function createSubject() {
    try {
      await apiFetch("/student/syllabus/subjects", {
        method: "POST",
        body: JSON.stringify({
          title: subjectForm.title,
          colorHex: subjectForm.colorHex,
        }),
      });
      setSubjectForm({ title: "", colorHex: "#d2723d" });
      setMessage("Subject created.");
      await loadSyllabus();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to create subject.");
    }
  }

  async function createTopic() {
    try {
      await apiFetch("/student/syllabus/topics", {
        method: "POST",
        body: JSON.stringify({
          subjectId: topicForm.subjectId,
          title: topicForm.title,
          estimatedMinutes: Number(topicForm.estimatedMinutes),
          topicOrder:
            data?.subjects.find((subject) => subject.id === topicForm.subjectId)?.topics.length ?? 0,
        }),
      });
      setTopicForm((current) => ({ ...current, title: "", estimatedMinutes: "90" }));
      setMessage("Topic added.");
      await loadSyllabus();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to add topic.");
    }
  }

  async function updateTopic(topicId: string, status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED", progressPercent: number) {
    try {
      setSavingTopicId(topicId);
      await apiFetch(`/student/syllabus/topics/${topicId}/progress`, {
        method: "PATCH",
        body: JSON.stringify({ status, progressPercent }),
      });
      await loadSyllabus();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update topic progress.");
    } finally {
      setSavingTopicId(null);
    }
  }

  function toggleSubject(subjectId: string) {
    setOpenSubjects((current) => ({ ...current, [subjectId]: !current[subjectId] }));
  }

  if (!data) {
    return <p className="text-sm text-slate-500">{error ?? "Loading syllabus..."}</p>;
  }

  return (
    <div className="grid gap-6">
      {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm font-semibold text-amber-700">{error}</p> : null}

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Subjects</p>
          <p className="mt-3 text-2xl font-bold text-slate-950">{data.analytics.totalSubjects}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Topics</p>
          <p className="mt-3 text-2xl font-bold text-slate-950">{data.analytics.totalTopics}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Completed</p>
          <p className="mt-3 text-2xl font-bold text-slate-950">{data.analytics.completedTopics}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Today</p>
          <p className="mt-3 text-2xl font-bold text-slate-950">{data.analytics.dailyCompletedTopics}</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <DashboardCard title="Create subject" subtitle="Only open creation panels when actually planning">
          <div className="grid gap-4">
            <button type="button" onClick={() => setShowSubjectForm((current) => !current)} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-slate-700">
              {showSubjectForm ? "Hide subject creator" : "Show subject creator"}
            </button>
            {showSubjectForm ? (
              <>
                <div className="grid gap-4 md:grid-cols-[1fr_170px]">
                  <input
                    value={subjectForm.title}
                    onChange={(event) => setSubjectForm((current) => ({ ...current, title: event.target.value }))}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none"
                    placeholder="Physics, Maths, Reasoning..."
                  />
                  <input
                    value={subjectForm.colorHex}
                    onChange={(event) => setSubjectForm((current) => ({ ...current, colorHex: event.target.value }))}
                    className="h-[58px] rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                    type="color"
                  />
                </div>
                <button type="button" onClick={() => void createSubject()} className="rounded-full border border-[var(--lp-accent-soft)] bg-[var(--lp-accent-soft)] px-5 py-3 text-sm font-bold text-[var(--lp-accent-strong)]">
                  Add subject
                </button>
              </>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                Add a new subject only when your study map changes. Existing subjects stay below.
              </div>
            )}
          </div>
        </DashboardCard>

        <DashboardCard title="Create topic" subtitle="Break subjects into small, finishable blocks">
          <div className="grid gap-4">
            <button type="button" onClick={() => setShowTopicForm((current) => !current)} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-slate-700">
              {showTopicForm ? "Hide topic creator" : "Show topic creator"}
            </button>
            {showTopicForm ? (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <select
                    value={topicForm.subjectId}
                    onChange={(event) => setTopicForm((current) => ({ ...current, subjectId: event.target.value }))}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none"
                  >
                    <option value="">Choose subject</option>
                    {data.subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.title}
                      </option>
                    ))}
                  </select>
                  <input
                    value={topicForm.title}
                    onChange={(event) => setTopicForm((current) => ({ ...current, title: event.target.value }))}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none"
                    placeholder="Current electricity"
                  />
                  <input
                    value={topicForm.estimatedMinutes}
                    onChange={(event) => setTopicForm((current) => ({ ...current, estimatedMinutes: event.target.value }))}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none"
                    type="number"
                    min="15"
                    placeholder="Estimated minutes"
                  />
                </div>
                <button type="button" onClick={() => void createTopic()} className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-800">
                  Add topic
                </button>
              </>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                Topic creation stays tucked away until you need to expand the syllabus.
              </div>
            )}
          </div>
        </DashboardCard>
      </section>

      <section className="grid gap-4">
        {data.subjects.map((subject) => (
          <DashboardCard
            key={subject.id}
            title={subject.title}
            subtitle={`${subject.completed_topics}/${subject.total_topics} topics complete`}
            tone="bg-white"
          >
            <div className="grid gap-4">
              <div className="rounded-full bg-slate-100 p-2">
                <div
                  className="h-3 rounded-full transition-all"
                  style={{
                    width: `${Math.max(subject.completion_percent, 6)}%`,
                    background: subject.color_hex ?? "var(--lp-primary)",
                  }}
                />
              </div>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-sm font-semibold text-slate-600">{subject.completion_percent}% complete</p>
                <button type="button" onClick={() => toggleSubject(subject.id)} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-700">
                  {openSubjects[subject.id] ? "Hide topics" : "Show topics"}
                </button>
              </div>
              {openSubjects[subject.id] ? (
                <div className="grid gap-3">
                  {subject.topics.map((topic) => (
                    <div key={topic.id} className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="font-black text-slate-950">{topic.title}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            Estimated {topic.estimated_minutes} min
                            {topic.completed_at ? ` | completed ${topic.completed_at.slice(0, 10)}` : ""}
                          </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-[180px_140px]">
                          <select
                            value={topic.status}
                            onChange={(event) => {
                              const nextStatus = event.target.value as "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
                              const nextProgress = nextStatus === "COMPLETED" ? 100 : nextStatus === "NOT_STARTED" ? 0 : Math.max(topic.progress_percent, 10);
                              void updateTopic(topic.id, nextStatus, nextProgress);
                            }}
                            disabled={savingTopicId === topic.id}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                          >
                            {topicStatusOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <input
                            value={topic.progress_percent}
                            onChange={(event) => {
                              const value = Number(event.target.value);
                              const nextStatus = value >= 100 ? "COMPLETED" : value > 0 ? "IN_PROGRESS" : "NOT_STARTED";
                              void updateTopic(topic.id, nextStatus, Number.isFinite(value) ? value : 0);
                            }}
                            disabled={savingTopicId === topic.id}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                            type="number"
                            min="0"
                            max="100"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {subject.topics.length === 0 ? <p className="text-sm text-slate-500">No topics in this subject yet.</p> : null}
                </div>
              ) : null}
            </div>
          </DashboardCard>
        ))}
        {data.subjects.length === 0 ? (
          <DashboardCard title="No syllabus yet" subtitle="Start by creating your first subject.">
            <p className="text-sm text-slate-500">Build your study plan topic by topic so progress is measurable, not vague.</p>
          </DashboardCard>
        ) : null}
      </section>
    </div>
  );
}
