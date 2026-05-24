"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";
import { FormDrawer } from "./form-drawer";
import { StatCard } from "./stat-card";

type BookStatus = "DRAFT" | "PUBLISHED" | "UNPUBLISHED";

type BookTopic = {
  id: string;
  chapter_id: string;
  topic_title: string;
  topic_order: number;
  estimated_minutes: number;
};

type BookChapter = {
  id: string;
  chapter_title: string;
  chapter_order: number;
  topics: BookTopic[];
};

type AdminBook = {
  id: string;
  title: string;
  author: string | null;
  class_name: string | null;
  subject: string | null;
  language: string | null;
  status: BookStatus;
  chapter_count: string;
  topic_count: string;
  student_count: string;
  chapters?: BookChapter[];
};

function statusTone(status: BookStatus) {
  if (status === "PUBLISHED") return "bg-emerald-100 text-emerald-700";
  if (status === "UNPUBLISHED") return "bg-slate-100 text-slate-700";
  return "bg-amber-100 text-amber-700";
}

export function SuperadminSyllabusManager() {
  const [books, setBooks] = useState<AdminBook[]>([]);
  const [selected, setSelected] = useState<AdminBook | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", author: "", className: "", subject: "", language: "", status: "DRAFT" as BookStatus });
  const [chapterForm, setChapterForm] = useState({ chapterTitle: "", chapterOrder: "1" });
  const [topicForm, setTopicForm] = useState({ chapterId: "", topicTitle: "", topicOrder: "1", estimatedMinutes: "60" });

  async function loadBooks() {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (status !== "All") params.set("status", status);
    const response = await apiFetch<{ success: boolean; data: AdminBook[] }>(`/admin/books${params.toString() ? `?${params}` : ""}`);
    setBooks(response.data);
    setError(null);
  }

  async function openBook(bookId: string) {
    const response = await apiFetch<{ success: boolean; data: AdminBook }>(`/admin/books/${bookId}`);
    setSelected(response.data);
    setEditForm({
      title: response.data.title,
      author: response.data.author ?? "",
      className: response.data.class_name ?? "",
      subject: response.data.subject ?? "",
      language: response.data.language ?? "",
      status: response.data.status,
    });
    setTopicForm((current) => ({ ...current, chapterId: response.data.chapters?.[0]?.id ?? "" }));
  }

  useEffect(() => {
    loadBooks().catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load books."));
  }, []);

  const stats = useMemo(() => {
    const published = books.filter((book) => book.status === "PUBLISHED").length;
    const chapters = books.reduce((sum, book) => sum + Number(book.chapter_count), 0);
    const topics = books.reduce((sum, book) => sum + Number(book.topic_count), 0);
    return { published, drafts: books.length - published, chapters, topics };
  }, [books]);

  async function uploadFile(file: File) {
    try {
      setBusy(true);
      const formData = new FormData();
      formData.append("file", file);
      const response = await apiFetch<{ success: boolean; data: { booksTouched: number; chaptersTouched: number; topicsTouched: number } }>("/admin/books/import-file", {
        method: "POST",
        body: formData,
      });
      setMessage(`${response.data.booksTouched} books, ${response.data.chaptersTouched} chapters, ${response.data.topicsTouched} topics imported.`);
      setImportOpen(false);
      await loadBooks();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to import book file.");
    } finally {
      setBusy(false);
    }
  }

  async function saveBook(nextStatus?: BookStatus) {
    if (!selected) return;
    try {
      setBusy(true);
      await apiFetch(`/admin/books/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: editForm.title,
          author: editForm.author,
          className: editForm.className,
          subject: editForm.subject,
          language: editForm.language,
          status: nextStatus ?? editForm.status,
        }),
      });
      setMessage("Book updated.");
      await loadBooks();
      await openBook(selected.id);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update book.");
    } finally {
      setBusy(false);
    }
  }

  async function addChapter() {
    if (!selected) return;
    try {
      await apiFetch(`/admin/books/${selected.id}/chapters`, {
        method: "POST",
        body: JSON.stringify({ chapterTitle: chapterForm.chapterTitle, chapterOrder: Number(chapterForm.chapterOrder) }),
      });
      setChapterForm({ chapterTitle: "", chapterOrder: "1" });
      await openBook(selected.id);
      await loadBooks();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to add chapter.");
    }
  }

  async function addTopic() {
    if (!selected) return;
    try {
      await apiFetch(`/admin/books/${selected.id}/topics`, {
        method: "POST",
        body: JSON.stringify({
          chapterId: topicForm.chapterId,
          topicTitle: topicForm.topicTitle,
          topicOrder: Number(topicForm.topicOrder),
          estimatedMinutes: Number(topicForm.estimatedMinutes),
        }),
      });
      setTopicForm((current) => ({ ...current, topicTitle: "" }));
      await openBook(selected.id);
      await loadBooks();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to add topic.");
    }
  }

  return (
    <div className="grid gap-4">
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
      {message ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Published books" value={stats.published} note="Searchable by students." />
        <StatCard label="Draft/unpublished" value={stats.drafts} note="Hidden from student search." />
        <StatCard label="Chapters" value={stats.chapters} note="Book table of contents." />
        <StatCard label="Topics" value={stats.topics} note="Trackable checklist rows." />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <DashboardCard title="Book syllabus library" subtitle="Import, publish, and extend book-wise trackers for all students.">
          <div className="grid gap-3">
            <div className="grid gap-2 lg:grid-cols-[1fr_auto_auto]">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search book or author"
                className="min-w-0 rounded-lg border border-[var(--lp-border)] bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[var(--lp-primary)]"
              />
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-3 text-sm font-semibold">
                <option>All</option>
                <option>DRAFT</option>
                <option>PUBLISHED</option>
                <option>UNPUBLISHED</option>
              </select>
              <button type="button" onClick={() => void loadBooks()} className="rounded-lg bg-[var(--lp-primary)] px-4 py-3 text-sm font-bold text-white">
                Apply filter
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setImportOpen(true)} className="rounded-lg bg-[var(--lp-primary)] px-4 py-2 text-sm font-bold text-white">
                Import books
              </button>
              <a href="/api-proxy/v1/admin/books/template.xlsx" className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 text-sm font-bold text-[var(--lp-text)]">
                Download book template
              </a>
            </div>
            <div className="grid max-h-[34rem] gap-2 overflow-y-auto pr-1">
              {books.map((book) => (
                <button
                  key={book.id}
                  type="button"
                  onClick={() => void openBook(book.id)}
                  className={`rounded-lg border p-3 text-left ${selected?.id === book.id ? "border-[var(--lp-primary)] bg-emerald-50" : "border-[var(--lp-border)] bg-white"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[var(--lp-text)]">{book.title}</p>
                      <p className="mt-1 text-xs font-semibold text-[var(--lp-muted)]">{book.author || "Unknown author"} · {book.subject || "General"}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs font-black ${statusTone(book.status)}`}>{book.status}</span>
                  </div>
                  <p className="mt-3 text-xs font-bold uppercase text-[var(--lp-muted)]">{book.chapter_count} chapters · {book.topic_count} topics · {book.student_count} students</p>
                </button>
              ))}
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title={selected ? selected.title : "Book detail"} subtitle="Edit metadata and add future topics without touching student progress.">
          {selected ? (
            <div className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-2">
                <input value={editForm.title} onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] px-3 py-2 text-sm font-semibold" />
                <input value={editForm.author} onChange={(event) => setEditForm((current) => ({ ...current, author: event.target.value }))} placeholder="Author" className="rounded-lg border border-[var(--lp-border)] px-3 py-2 text-sm font-semibold" />
                <input value={editForm.className} onChange={(event) => setEditForm((current) => ({ ...current, className: event.target.value }))} placeholder="Class/exam" className="rounded-lg border border-[var(--lp-border)] px-3 py-2 text-sm font-semibold" />
                <input value={editForm.subject} onChange={(event) => setEditForm((current) => ({ ...current, subject: event.target.value }))} placeholder="Subject" className="rounded-lg border border-[var(--lp-border)] px-3 py-2 text-sm font-semibold" />
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy} onClick={() => void saveBook()} className="rounded-lg bg-[var(--lp-primary)] px-4 py-2 text-sm font-bold text-white">
                  Save book
                </button>
                <button type="button" onClick={() => void saveBook(selected.status === "PUBLISHED" ? "UNPUBLISHED" : "PUBLISHED")} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 text-sm font-bold text-[var(--lp-text)]">
                  {selected.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                </button>
                <button type="button" onClick={() => setEditOpen(true)} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 text-sm font-bold text-[var(--lp-text)]">
                  Add chapters/topics
                </button>
              </div>
              <div className="grid max-h-[34rem] gap-3 overflow-y-auto pr-1">
                {(selected.chapters ?? []).map((chapter) => (
                  <div key={chapter.id} className="rounded-lg border border-[var(--lp-border)] bg-white p-3">
                    <p className="text-sm font-black text-[var(--lp-text)]">{chapter.chapter_order}. {chapter.chapter_title}</p>
                    <div className="mt-2 grid gap-1">
                      {chapter.topics.map((topic) => (
                        <p key={topic.id} className="text-xs font-semibold text-[var(--lp-muted)]">{topic.topic_order}. {topic.topic_title} · {topic.estimated_minutes} min</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--lp-muted)]">Select a book to inspect chapters and topics.</p>
          )}
        </DashboardCard>
      </section>

      <FormDrawer open={importOpen} onClose={() => setImportOpen(false)} title="Import book syllabus" description="Upload Excel or CSV using the BookLib book TOC template.">
        <div className="grid gap-4">
          <a href="/api-proxy/v1/admin/books/template.xlsx" className="rounded-lg bg-[var(--lp-primary)] px-4 py-3 text-center text-sm font-bold text-white">
            Download Excel template
          </a>
          <input
            type="file"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadFile(file);
              event.currentTarget.value = "";
            }}
            className="rounded-xl border border-[var(--lp-border)] bg-white p-3 text-sm font-semibold text-[var(--lp-muted)]"
          />
          {busy ? <p className="text-sm font-semibold text-[var(--lp-muted)]">Importing file...</p> : null}
        </div>
      </FormDrawer>

      <FormDrawer open={editOpen} onClose={() => setEditOpen(false)} title="Add chapters and topics" description="Add new topics later. Students who already use the book can sync only missing topics.">
        <div className="grid gap-5">
          <div className="rounded-lg border border-[var(--lp-border)] bg-white p-4">
            <p className="text-sm font-black text-[var(--lp-text)]">Add chapter</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_8rem_auto]">
              <input value={chapterForm.chapterTitle} onChange={(event) => setChapterForm((current) => ({ ...current, chapterTitle: event.target.value }))} placeholder="Chapter title" className="rounded-lg border border-[var(--lp-border)] px-3 py-2 text-sm font-semibold" />
              <input value={chapterForm.chapterOrder} onChange={(event) => setChapterForm((current) => ({ ...current, chapterOrder: event.target.value }))} placeholder="Order" className="rounded-lg border border-[var(--lp-border)] px-3 py-2 text-sm font-semibold" />
              <button type="button" onClick={() => void addChapter()} className="rounded-lg bg-[var(--lp-primary)] px-4 py-2 text-sm font-bold text-white">Add</button>
            </div>
          </div>
          <div className="rounded-lg border border-[var(--lp-border)] bg-white p-4">
            <p className="text-sm font-black text-[var(--lp-text)]">Add topic</p>
            <div className="mt-3 grid gap-2">
              <select value={topicForm.chapterId} onChange={(event) => setTopicForm((current) => ({ ...current, chapterId: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] px-3 py-2 text-sm font-semibold">
                {(selected?.chapters ?? []).map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.chapter_title}</option>)}
              </select>
              <input value={topicForm.topicTitle} onChange={(event) => setTopicForm((current) => ({ ...current, topicTitle: event.target.value }))} placeholder="Topic title" className="rounded-lg border border-[var(--lp-border)] px-3 py-2 text-sm font-semibold" />
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <input value={topicForm.topicOrder} onChange={(event) => setTopicForm((current) => ({ ...current, topicOrder: event.target.value }))} placeholder="Order" className="rounded-lg border border-[var(--lp-border)] px-3 py-2 text-sm font-semibold" />
                <input value={topicForm.estimatedMinutes} onChange={(event) => setTopicForm((current) => ({ ...current, estimatedMinutes: event.target.value }))} placeholder="Minutes" className="rounded-lg border border-[var(--lp-border)] px-3 py-2 text-sm font-semibold" />
                <button type="button" onClick={() => void addTopic()} className="rounded-lg bg-[var(--lp-primary)] px-4 py-2 text-sm font-bold text-white">Add topic</button>
              </div>
            </div>
          </div>
        </div>
      </FormDrawer>
    </div>
  );
}
