"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";

type TopicStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

type SyllabusSubject = {
  id: string;
  title: string;
  class_name: string | null;
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
    status: TopicStatus;
    progress_percent: number;
    completed_at: string | null;
  }>;
};

type SyllabusResponse = {
  success: boolean;
  data: {
    subjects: SyllabusSubject[];
    analytics: {
      totalSubjects: number;
      totalTopics: number;
      completedTopics: number;
      dailyCompletedTopics: number;
      completionPercent: number;
      completionStreakDays: number;
      longestCompletionStreak: number;
      remainingTopics: number;
      remainingMinutes: number;
      inProgressTopics: number;
      weeklyCompletions: Array<{
        date: string;
        completedTopics: number;
      }>;
      nextTopics: Array<{
        id: string;
        title: string;
        subjectTitle: string;
        className: string | null;
        estimatedMinutes: number;
        progressPercent: number;
      }>;
    };
  };
};

type TemplateSubject = {
  id: string;
  class_name: string;
  subject_title: string;
  color_hex: string | null;
  topics: Array<{
    id: string;
    topic_title: string;
    topic_order: number;
    estimated_minutes: number;
  }>;
};

type TemplatesResponse = {
  success: boolean;
  data: TemplateSubject[];
};

const topicStatusOptions = [
  { value: "NOT_STARTED", label: "Not started" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "COMPLETED", label: "Completed" },
] as const;

function uniqueSorted(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])).sort((a, b) =>
    a.localeCompare(b),
  );
}

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function StudentSyllabusManager() {
  const [data, setData] = useState<SyllabusResponse["data"] | null>(null);
  const [templates, setTemplates] = useState<TemplateSubject[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subjectForm, setSubjectForm] = useState({ title: "", className: "", colorHex: "#d2723d" });
  const [topicForm, setTopicForm] = useState({ subjectId: "", title: "", estimatedMinutes: "90" });
  const [templateForm, setTemplateForm] = useState({ className: "", subjectTitle: "" });
  const [classFilter, setClassFilter] = useState("");
  const [savingTopicId, setSavingTopicId] = useState<string | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
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

  async function loadTemplates(className?: string) {
    try {
      const query = className ? `?className=${encodeURIComponent(className)}` : "";
      const response = await apiFetch<TemplatesResponse>(`/student/syllabus/templates${query}`);
      setTemplates(response.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load syllabus templates.");
    }
  }

  useEffect(() => {
    void loadSyllabus();
    void loadTemplates();
  }, []);

  const classOptions = useMemo(
    () => uniqueSorted([...(data?.subjects.map((subject) => subject.class_name) ?? []), ...templates.map((template) => template.class_name)]),
    [data?.subjects, templates],
  );

  const filteredSubjects = useMemo(() => {
    if (!data) return [];
    return data.subjects.filter((subject) => !classFilter || subject.class_name === classFilter);
  }, [classFilter, data]);

  const templateSubjectOptions = useMemo(
    () => templates.filter((template) => !templateForm.className || template.class_name === templateForm.className),
    [templates, templateForm.className],
  );

  const subjects = data?.subjects ?? [];
  const analytics = data?.analytics ?? {
    totalSubjects: 0,
    totalTopics: 0,
    completedTopics: 0,
    dailyCompletedTopics: 0,
    completionPercent: 0,
    completionStreakDays: 0,
    longestCompletionStreak: 0,
    remainingTopics: 0,
    remainingMinutes: 0,
    inProgressTopics: 0,
    weeklyCompletions: [],
    nextTopics: [],
  };

  const weakSubjects = useMemo(() => {
    return [...subjects]
      .filter((subject) => subject.total_topics > 0 && subject.completion_percent < 100)
      .sort((a, b) => a.completion_percent - b.completion_percent)
      .slice(0, 3);
  }, [subjects]);

  const weeklyMax = Math.max(...analytics.weeklyCompletions.map((item) => item.completedTopics), 1);
  const todayTargetDone = analytics.dailyCompletedTopics > 0;
  const motivationLine = todayTargetDone
    ? `Aaj ${analytics.dailyCompletedTopics} topic complete hua. Streak ko kal bhi continue karna.`
    : analytics.remainingTopics > 0
      ? "Aaj ek chhota topic complete kar de, streak active ho jayegi."
      : "Syllabus clear hai. Revision queue maintain kar.";

  async function createSubject() {
    try {
      await apiFetch("/student/syllabus/subjects", {
        method: "POST",
        body: JSON.stringify({
          title: subjectForm.title,
          className: subjectForm.className,
          colorHex: subjectForm.colorHex,
        }),
      });
      setSubjectForm((current) => ({ ...current, title: "" }));
      setMessage("Subject created.");
      await loadSyllabus();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to create subject.");
    }
  }

  async function importTemplate() {
    try {
      setTemplateLoading(true);
      await apiFetch("/student/syllabus/import-template", {
        method: "POST",
        body: JSON.stringify({
          className: templateForm.className,
          subjectTitle: templateForm.subjectTitle,
        }),
      });
      setMessage(templateForm.subjectTitle ? "Template subject imported." : "Class syllabus imported.");
      await loadSyllabus();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to import template.");
    } finally {
      setTemplateLoading(false);
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

  async function updateTopic(topicId: string, status: TopicStatus, progressPercent: number) {
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
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Subjects</p>
          <p className="mt-3 text-2xl font-bold text-slate-950">{data.analytics.totalSubjects}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Topics</p>
          <p className="mt-3 text-2xl font-bold text-slate-950">{data.analytics.totalTopics}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Completed</p>
          <p className="mt-3 text-2xl font-bold text-slate-950">{data.analytics.completedTopics}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Today</p>
          <p className="mt-3 text-2xl font-bold text-slate-950">{data.analytics.dailyCompletedTopics}</p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <DashboardCard title="Syllabus momentum" subtitle={motivationLine}>
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Current streak</p>
                <p className="mt-2 text-2xl font-black text-emerald-950">{data.analytics.completionStreakDays} days</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Best streak</p>
                <p className="mt-2 text-2xl font-black text-slate-950">{data.analytics.longestCompletionStreak} days</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Remaining</p>
                <p className="mt-2 text-2xl font-black text-slate-950">{formatMinutes(data.analytics.remainingMinutes)}</p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-slate-950">Overall completion</p>
                <span className="text-sm font-black text-slate-600">{data.analytics.completionPercent}%</span>
              </div>
              <div className="mt-3 rounded-full bg-slate-100 p-2">
                <div className="h-3 rounded-full bg-[var(--lp-primary)]" style={{ width: `${Math.max(data.analytics.completionPercent, 4)}%` }} />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-500">
                {data.analytics.remainingTopics} topics pending, {data.analytics.inProgressTopics} currently in progress.
              </p>
            </div>
            <div className="grid grid-cols-7 items-end gap-2 rounded-xl border border-slate-200 bg-white p-4">
              {data.analytics.weeklyCompletions.map((day) => (
                <div key={day.date} className="grid gap-2 text-center">
                  <div className="flex h-24 items-end rounded-lg bg-slate-50 px-2">
                    <div
                      className="w-full rounded-t-md bg-[var(--lp-accent-soft)]"
                      style={{ height: `${Math.max(8, (day.completedTopics / weeklyMax) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[11px] font-bold text-slate-500">{day.date.slice(5)}</p>
                  <p className="text-xs font-black text-slate-800">{day.completedTopics}</p>
                </div>
              ))}
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title="Today focus queue" subtitle="Pick one small block instead of scrolling the whole syllabus.">
          <div className="grid gap-3">
            {data.analytics.nextTopics.map((topic) => (
              <article key={topic.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-950">{topic.title}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {topic.className ? `${topic.className} | ` : ""}{topic.subjectTitle} | {topic.estimatedMinutes} min
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{topic.progressPercent}%</span>
                </div>
              </article>
            ))}
            {data.analytics.nextTopics.length === 0 ? <p className="text-sm text-slate-500">No pending topics. Move to revision.</p> : null}
          </div>
        </DashboardCard>
      </section>

      {weakSubjects.length > 0 ? (
        <DashboardCard title="Weak subject watch" subtitle="Lowest completion subjects stay visible until they improve.">
          <div className="grid gap-3 md:grid-cols-3">
            {weakSubjects.map((subject) => (
              <div key={subject.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-black text-slate-950">{subject.title}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{subject.class_name ?? "General"}</p>
                <div className="mt-3 rounded-full bg-slate-100 p-1.5">
                  <div className="h-2 rounded-full" style={{ width: `${Math.max(subject.completion_percent, 5)}%`, background: subject.color_hex ?? "var(--lp-primary)" }} />
                </div>
                <p className="mt-2 text-sm font-bold text-slate-600">{subject.completion_percent}% complete</p>
              </div>
            ))}
          </div>
        </DashboardCard>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <DashboardCard title="Import syllabus" subtitle="Pick a class template uploaded by super admin.">
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <select
                value={templateForm.className}
                onChange={(event) => {
                  const className = event.target.value;
                  setTemplateForm({ className, subjectTitle: "" });
                  setSubjectForm((current) => ({ ...current, className }));
                  void loadTemplates(className);
                }}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none"
              >
                <option value="">Choose class</option>
                {classOptions.map((className) => (
                  <option key={className} value={className}>
                    {className}
                  </option>
                ))}
              </select>
              <select
                value={templateForm.subjectTitle}
                onChange={(event) => setTemplateForm((current) => ({ ...current, subjectTitle: event.target.value }))}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none"
                disabled={!templateForm.className}
              >
                <option value="">All subjects</option>
                {templateSubjectOptions.map((template) => (
                  <option key={template.id} value={template.subject_title}>
                    {template.subject_title} ({template.topics.length})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void importTemplate()}
                disabled={!templateForm.className || templateLoading}
                className="rounded-full border border-[var(--lp-accent-soft)] bg-[var(--lp-accent-soft)] px-5 py-3 text-sm font-bold text-[var(--lp-accent-strong)] disabled:opacity-50"
              >
                Import
              </button>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              {templateSubjectOptions.length > 0
                ? `${templateSubjectOptions.length} template subjects available for this class.`
                : "No template selected yet."}
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title="Class view" subtitle="Filter your tracker without mixing different exam paths.">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setClassFilter("")}
              className={`rounded-full border px-4 py-2 text-sm font-bold ${!classFilter ? "border-[var(--lp-primary)] bg-[var(--lp-primary)] text-white" : "border-slate-200 bg-white text-slate-700"}`}
            >
              All classes
            </button>
            {classOptions.map((className) => (
              <button
                key={className}
                type="button"
                onClick={() => setClassFilter(className)}
                className={`rounded-full border px-4 py-2 text-sm font-bold ${classFilter === className ? "border-[var(--lp-primary)] bg-[var(--lp-primary)] text-white" : "border-slate-200 bg-white text-slate-700"}`}
              >
                {className}
              </button>
            ))}
          </div>
        </DashboardCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <DashboardCard title="Create subject" subtitle="Add custom subjects when templates do not cover your plan.">
          <div className="grid gap-4">
            <button type="button" onClick={() => setShowSubjectForm((current) => !current)} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-slate-700">
              {showSubjectForm ? "Hide subject creator" : "Show subject creator"}
            </button>
            {showSubjectForm ? (
              <>
                <div className="grid gap-4 md:grid-cols-[1fr_160px_120px]">
                  <input
                    value={subjectForm.title}
                    onChange={(event) => setSubjectForm((current) => ({ ...current, title: event.target.value }))}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none"
                    placeholder="Physics, Maths, Reasoning..."
                  />
                  <input
                    value={subjectForm.className}
                    onChange={(event) => setSubjectForm((current) => ({ ...current, className: event.target.value }))}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none"
                    placeholder="Class 12"
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

        <DashboardCard title="Create topic" subtitle="Break subjects into small, finishable blocks.">
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
                        {subject.class_name ? `${subject.class_name} - ` : ""}{subject.title}
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
        {filteredSubjects.map((subject) => (
          <DashboardCard
            key={subject.id}
            title={subject.title}
            subtitle={`${subject.class_name ?? "General"} | ${subject.completed_topics}/${subject.total_topics} topics complete`}
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
                      <div className="grid gap-3 lg:grid-cols-[auto_1fr_auto] lg:items-center">
                        <input
                          type="checkbox"
                          checked={topic.status === "COMPLETED"}
                          disabled={savingTopicId === topic.id}
                          onChange={(event) => {
                            const checked = event.target.checked;
                            void updateTopic(topic.id, checked ? "COMPLETED" : "NOT_STARTED", checked ? 100 : 0);
                          }}
                          className="h-5 w-5 rounded border-slate-300 accent-[var(--lp-primary)]"
                          aria-label={`Mark ${topic.title} complete`}
                        />
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
                              const nextStatus = event.target.value as TopicStatus;
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
        {filteredSubjects.length === 0 ? (
          <DashboardCard title="No syllabus yet" subtitle="Import a template or create your first subject.">
            <p className="text-sm text-slate-500">Build your study plan topic by topic so progress is measurable, not vague.</p>
          </DashboardCard>
        ) : null}
      </section>
    </div>
  );
}
