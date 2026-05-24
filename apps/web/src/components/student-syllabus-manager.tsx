"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";

type TopicStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

type BookTopic = {
  id: string;
  local_topic_id?: string;
  chapter_id: string;
  topic_title: string;
  topic_order: number;
  estimated_minutes: number;
  status?: TopicStatus;
  progress_percent?: number;
  completed_at?: string | null;
};

type BookChapter = {
  id: string;
  chapter_title: string;
  chapter_order: number;
  topics: BookTopic[];
};

type StudentBook = {
  id: string;
  book_id: string;
  title: string;
  author: string | null;
  class_name: string | null;
  subject: string | null;
  language: string | null;
  total_topics: string;
  completed_topics: string;
  in_progress_topics: string;
  new_topics_available: string;
  chapters: BookChapter[];
};

type SearchBook = {
  id: string;
  title: string;
  author: string | null;
  class_name: string | null;
  subject: string | null;
  language: string | null;
  chapter_count: string;
  topic_count: string;
  student_count: string;
};

type SyllabusResponse = {
  success: boolean;
  data: {
    books: StudentBook[];
    analytics: {
      activeBooks: number;
      bookTopics: number;
      completedBookTopics: number;
      booksWithNewTopics: number;
      dailyCompletedTopics: number;
      completionStreakDays: number;
      longestCompletionStreak: number;
      nextTopics: Array<{
        id: string;
        title: string;
        subjectTitle: string;
        estimatedMinutes: number;
        progressPercent: number;
      }>;
    };
  };
};

function percent(done: number, total: number) {
  if (!total) return 0;
  return Math.round((done / total) * 100);
}

function statusLabel(status?: TopicStatus) {
  if (status === "COMPLETED") return "Completed";
  if (status === "IN_PROGRESS") return "In progress";
  return "Start";
}

export function StudentSyllabusManager() {
  const [data, setData] = useState<SyllabusResponse["data"] | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchBook[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const response = await apiFetch<SyllabusResponse>("/student/syllabus");
    setData(response.data);
    setSelectedBookId((current) => current ?? response.data.books[0]?.id ?? null);
  }

  useEffect(() => {
    load().catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load books."));
  }, []);

  const books = data?.books ?? [];
  const analytics = data?.analytics ?? {
    activeBooks: 0,
    bookTopics: 0,
    completedBookTopics: 0,
    booksWithNewTopics: 0,
    dailyCompletedTopics: 0,
    completionStreakDays: 0,
    longestCompletionStreak: 0,
    nextTopics: [],
  };
  const selectedBook = books.find((book) => book.id === selectedBookId) ?? books[0] ?? null;

  const selectedProgress = useMemo(() => {
    if (!selectedBook) return 0;
    return percent(Number(selectedBook.completed_topics), Number(selectedBook.total_topics));
  }, [selectedBook]);

  async function searchBooks() {
    try {
      const response = await apiFetch<{ success: boolean; data: SearchBook[] }>(
        `/student/books/search?q=${encodeURIComponent(query.trim())}`,
      );
      setResults(response.data);
      setError(null);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Unable to search books.");
    }
  }

  async function addBook(bookId: string) {
    try {
      setBusyId(bookId);
      const response = await apiFetch<{ success: boolean; data: { studentBookId: string; topicsImported: number } }>(
        `/student/books/${bookId}/add`,
        { method: "POST" },
      );
      setMessage(`${response.data.topicsImported} topics added to My Books.`);
      await load();
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Unable to add book.");
    } finally {
      setBusyId(null);
    }
  }

  async function syncBook(studentBookId: string) {
    try {
      setBusyId(studentBookId);
      const response = await apiFetch<{ success: boolean; data: { topicsImported: number } }>(
        `/student/books/${studentBookId}/sync`,
        { method: "POST" },
      );
      setMessage(`${response.data.topicsImported} new topics synced.`);
      await load();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Unable to sync book.");
    } finally {
      setBusyId(null);
    }
  }

  async function updateTopic(topic: BookTopic, status: TopicStatus) {
    const topicId = topic.local_topic_id ?? topic.id;
    try {
      setBusyId(topicId);
      await apiFetch(`/student/books/topics/${topicId}/progress`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          progressPercent: status === "COMPLETED" ? 100 : status === "IN_PROGRESS" ? Math.max(topic.progress_percent ?? 25, 25) : 0,
        }),
      });
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update topic.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="grid gap-4">
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
      {message ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p> : null}

      <section className="grid gap-3 md:grid-cols-4">
        {[
          ["Active books", analytics.activeBooks],
          ["Topics today", analytics.dailyCompletedTopics],
          ["Current streak", `${analytics.completionStreakDays}d`],
          ["New topics", analytics.booksWithNewTopics],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-[var(--lp-border)] bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase text-[var(--lp-muted)]">{label}</p>
            <p className="mt-2 text-2xl font-black text-[var(--lp-text)]">{value}</p>
          </div>
        ))}
      </section>

      <DashboardCard title="Find a book" subtitle="Search the BookLib catalog and add the book TOC to your personal tracker.">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void searchBooks();
            }}
            placeholder="Search books by name, author, subject, exam"
            className="min-w-0 rounded-lg border border-[var(--lp-border)] bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[var(--lp-primary)]"
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => void searchBooks()} className="rounded-lg bg-[var(--lp-primary)] px-4 py-3 text-sm font-bold text-white">
              Search books
            </button>
            <Link href="/student/tools" className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-3 text-sm font-bold text-[var(--lp-text)]">
              Request missing book
            </Link>
          </div>
        </div>
        {results.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {results.map((book) => (
              <div key={book.id} className="rounded-lg border border-[var(--lp-border)] bg-[var(--lp-surface-muted)] p-4">
                <p className="text-base font-black text-[var(--lp-text)]">{book.title}</p>
                <p className="mt-1 text-sm text-[var(--lp-muted)]">{book.author || "Unknown author"} · {book.subject || "General"}</p>
                <p className="mt-3 text-xs font-bold uppercase text-[var(--lp-muted)]">{book.chapter_count} chapters · {book.topic_count} topics</p>
                <button
                  type="button"
                  onClick={() => void addBook(book.id)}
                  disabled={busyId === book.id}
                  className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                >
                  {busyId === book.id ? "Adding..." : "Add to My Books"}
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </DashboardCard>

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <DashboardCard title="My Books" subtitle="Your active reading trackers and new topic sync status.">
          <div className="grid gap-2">
            {books.map((book) => {
              const progress = percent(Number(book.completed_topics), Number(book.total_topics));
              const newTopics = Number(book.new_topics_available);
              return (
                <button
                  key={book.id}
                  type="button"
                  onClick={() => setSelectedBookId(book.id)}
                  className={`rounded-lg border p-3 text-left ${selectedBook?.id === book.id ? "border-[var(--lp-primary)] bg-emerald-50" : "border-[var(--lp-border)] bg-white"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[var(--lp-text)]">{book.title}</p>
                      <p className="mt-1 text-xs font-semibold text-[var(--lp-muted)]">{book.completed_topics}/{book.total_topics} topics · {progress}%</p>
                    </div>
                    {newTopics > 0 ? <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-black text-amber-700">{newTopics} new</span> : null}
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-[var(--lp-primary)]" style={{ width: `${progress}%` }} />
                  </div>
                </button>
              );
            })}
            {books.length === 0 ? <p className="text-sm text-[var(--lp-muted)]">Search a book above and add it to start your tracker.</p> : null}
          </div>
        </DashboardCard>

        <DashboardCard
          title={selectedBook ? selectedBook.title : "Book tracker"}
          subtitle={selectedBook ? `${selectedBook.author || "Unknown author"} · ${selectedProgress}% complete` : "Select a book to see chapters and topics."}
        >
          {selectedBook ? (
            <div className="grid gap-4">
              {Number(selectedBook.new_topics_available) > 0 ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm font-bold text-amber-800">{selectedBook.new_topics_available} new topics available from BookLib catalog.</p>
                  <button type="button" onClick={() => void syncBook(selectedBook.id)} className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-black text-white">
                    Sync new topics
                  </button>
                </div>
              ) : null}
              {selectedBook.chapters.map((chapter) => (
                <div key={chapter.id} className="rounded-lg border border-[var(--lp-border)] bg-white p-4">
                  <p className="text-sm font-black text-[var(--lp-text)]">{chapter.chapter_title}</p>
                  <div className="mt-3 grid gap-2">
                    {chapter.topics.map((topic) => (
                      <div key={topic.local_topic_id ?? topic.id} className="flex flex-col gap-3 rounded-lg bg-[var(--lp-surface-muted)] p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[var(--lp-text)]">{topic.topic_title}</p>
                          <p className="text-xs font-semibold text-[var(--lp-muted)]">{topic.estimated_minutes} min · {statusLabel(topic.status)}</p>
                        </div>
                        <div className="flex gap-2">
                          {topic.status !== "IN_PROGRESS" ? (
                            <button type="button" onClick={() => void updateTopic(topic, "IN_PROGRESS")} className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-xs font-bold">
                              In progress
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => void updateTopic(topic, topic.status === "COMPLETED" ? "IN_PROGRESS" : "COMPLETED")}
                            disabled={busyId === (topic.local_topic_id ?? topic.id)}
                            className={`rounded-lg px-3 py-2 text-xs font-bold ${topic.status === "COMPLETED" ? "bg-slate-200 text-slate-700" : "bg-[var(--lp-primary)] text-white"}`}
                          >
                            {topic.status === "COMPLETED" ? "Reopen" : "Complete"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--lp-muted)]">No book selected yet.</p>
          )}
        </DashboardCard>
      </section>
    </div>
  );
}
