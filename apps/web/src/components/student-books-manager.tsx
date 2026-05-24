"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";

type BookStatus = "READING" | "COMPLETED" | "WISHLIST" | "DROPPED";

type StudentBook = {
  id: string;
  title: string;
  author: string | null;
  status: BookStatus;
  total_pages: number | null;
  current_page: number;
  notes: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
};

const STATUS_LABELS: Record<BookStatus, string> = {
  READING: "Reading",
  COMPLETED: "Completed",
  WISHLIST: "Wishlist",
  DROPPED: "Dropped",
};

const STATUS_COLORS: Record<BookStatus, string> = {
  READING: "bg-sky-100 text-sky-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  WISHLIST: "bg-violet-100 text-violet-700",
  DROPPED: "bg-slate-100 text-slate-500",
};

function ProgressBar({ current, total }: { current: number; total: number | null }) {
  if (!total || total === 0) return null;
  const pct = Math.min(100, Math.round((current / total) * 100));
  return (
    <div className="mt-2">
      <div className="mb-1 flex justify-between text-[10px] font-bold text-slate-500">
        <span>Page {current} / {total}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-[var(--lp-primary)] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function StudentBooksManager() {
  const [books, setBooks] = useState<StudentBook[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<BookStatus | "ALL">("ALL");
  const [showForm, setShowForm] = useState(false);
  const [editingBook, setEditingBook] = useState<StudentBook | null>(null);

  const [form, setForm] = useState({
    title: "",
    author: "",
    status: "READING" as BookStatus,
    totalPages: "",
    currentPage: "",
    notes: "",
    startedAt: "",
  });

  async function load() {
    try {
      const res = await apiFetch<{ success: boolean; data: StudentBook[] }>("/student/books");
      setBooks(res.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load books.");
    }
  }

  useEffect(() => { void load(); }, []);

  function openAdd() {
    setEditingBook(null);
    setForm({ title: "", author: "", status: "READING", totalPages: "", currentPage: "", notes: "", startedAt: "" });
    setShowForm(true);
    setMessage(null);
  }

  function openEdit(book: StudentBook) {
    setEditingBook(book);
    setForm({
      title: book.title,
      author: book.author ?? "",
      status: book.status,
      totalPages: book.total_pages?.toString() ?? "",
      currentPage: book.current_page.toString(),
      notes: book.notes ?? "",
      startedAt: book.started_at ?? "",
    });
    setShowForm(true);
    setMessage(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    try {
      if (editingBook) {
        await apiFetch(`/student/books/${editingBook.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            status: form.status,
            currentPage: form.currentPage ? Number(form.currentPage) : undefined,
            totalPages: form.totalPages ? Number(form.totalPages) : undefined,
            notes: form.notes || undefined,
            finishedAt: form.status === "COMPLETED" && !editingBook.finished_at
              ? new Date().toISOString().split("T")[0]
              : undefined,
          }),
        });
        setMessage("Book updated.");
      } else {
        await apiFetch("/student/books", {
          method: "POST",
          body: JSON.stringify({
            title: form.title,
            author: form.author || undefined,
            status: form.status,
            totalPages: form.totalPages ? Number(form.totalPages) : undefined,
            currentPage: form.currentPage ? Number(form.currentPage) : undefined,
            notes: form.notes || undefined,
            startedAt: form.startedAt || undefined,
          }),
        });
        setMessage("Book added.");
      }
      setShowForm(false);
      setEditingBook(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save book.");
    }
  }

  async function removeBook(id: string) {
    try {
      await apiFetch(`/student/books/${id}`, { method: "DELETE" });
      setBooks((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove book.");
    }
  }

  const tabs: Array<{ value: BookStatus | "ALL"; label: string; count: number }> = [
    { value: "ALL", label: "All", count: books.length },
    { value: "READING", label: "Reading", count: books.filter((b) => b.status === "READING").length },
    { value: "WISHLIST", label: "Wishlist", count: books.filter((b) => b.status === "WISHLIST").length },
    { value: "COMPLETED", label: "Completed", count: books.filter((b) => b.status === "COMPLETED").length },
    { value: "DROPPED", label: "Dropped", count: books.filter((b) => b.status === "DROPPED").length },
  ];

  const filtered = activeTab === "ALL" ? books : books.filter((b) => b.status === activeTab);

  return (
    <div className="grid gap-3 md:gap-6">
      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      {message ? <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p> : null}

      <DashboardCard
        title="My Books"
        subtitle="Track your reading journey — currently reading, wishlist, and completed books."
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold ${
                  activeTab === tab.value
                    ? "bg-[var(--lp-primary)] text-white"
                    : "border border-slate-200 bg-white text-slate-600"
                }`}
              >
                {tab.label}
                {tab.count > 0 ? <span className="ml-1.5 opacity-70">{tab.count}</span> : null}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="flex-shrink-0 rounded-full bg-[var(--lp-primary)] px-5 py-2 text-xs font-bold text-white"
          >
            + Add Book
          </button>
        </div>

        {showForm ? (
          <form onSubmit={submit} className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Book title
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Atomic Habits"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
                  disabled={!!editingBook}
                />
              </label>
              <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Author
                <input
                  value={form.author}
                  onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
                  placeholder="e.g. James Clear"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
                  disabled={!!editingBook}
                />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Status
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as BookStatus }))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
                >
                  <option value="READING">Reading</option>
                  <option value="WISHLIST">Wishlist</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="DROPPED">Dropped</option>
                </select>
              </label>
              <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Total pages
                <input
                  type="number"
                  min="1"
                  value={form.totalPages}
                  onChange={(e) => setForm((f) => ({ ...f, totalPages: e.target.value }))}
                  placeholder="300"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Current page
                <input
                  type="number"
                  min="0"
                  value={form.currentPage}
                  onChange={(e) => setForm((f) => ({ ...f, currentPage: e.target.value }))}
                  placeholder="0"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
                />
              </label>
            </div>
            {!editingBook ? (
              <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-slate-500 sm:w-48">
                Started on
                <input
                  type="date"
                  value={form.startedAt}
                  onChange={(e) => setForm((f) => ({ ...f, startedAt: e.target.value }))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
                />
              </label>
            ) : null}
            <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
              Notes
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="What do you think of this book?"
                rows={2}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
              />
            </label>
            <div className="flex gap-3">
              <button type="submit" className="rounded-xl bg-[var(--lp-primary)] px-6 py-2.5 text-sm font-bold text-white">
                {editingBook ? "Save changes" : "Add book"}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingBook(null); }}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        {filtered.length === 0 ? (
          <p className="text-sm text-slate-500">
            {activeTab === "ALL" ? "No books added yet. Add your first book above." : `No books with status "${STATUS_LABELS[activeTab as BookStatus]}".`}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((book) => (
              <div key={book.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-black text-slate-950">{book.title}</p>
                    {book.author ? <p className="mt-0.5 text-xs text-slate-500">{book.author}</p> : null}
                  </div>
                  <span className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-black ${STATUS_COLORS[book.status]}`}>
                    {STATUS_LABELS[book.status]}
                  </span>
                </div>

                <ProgressBar current={book.current_page} total={book.total_pages} />

                {book.notes ? (
                  <p className="mt-2 line-clamp-2 text-xs text-slate-500">{book.notes}</p>
                ) : null}

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(book)}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Update progress
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeBook(book.id)}
                    className="rounded-full border border-red-100 px-3 py-1 text-xs font-bold text-red-500 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DashboardCard>
    </div>
  );
}
