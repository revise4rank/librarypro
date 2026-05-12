"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";
import { StudentSectionTabs } from "./student-section-tabs";

type BookRequest = {
  id: string;
  title: string;
  author: string | null;
  class_name: string | null;
  subject: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "FULFILLED";
  toc_image_url: string | null;
  created_at: string;
};

const tools = [
  {
    title: "Focus Mode",
    detail: "Start a clean timer and log deep work without opening the full dashboard.",
    href: "/student/focus-mode",
    action: "Start timer",
  },
  {
    title: "Syllabus Tracker",
    detail: "Create subjects, add topics, and mark progress chapter by chapter.",
    href: "/student/syllabus",
    action: "Track syllabus",
  },
  {
    title: "Revision Queue",
    detail: "Clear spaced revision checkpoints and overdue weak topics.",
    href: "/student/revisions",
    action: "Open revision",
  },
  {
    title: "Rewards",
    detail: "See streaks, badges, consistency, and motivation signals.",
    href: "/student/rewards",
    action: "View rewards",
  },
  {
    title: "Library Feed",
    detail: "Share focus milestones and see study updates without disturbing work.",
    href: "/student/feed",
    action: "Open feed",
  },
  {
    title: "Student Offers",
    detail: "Keep offers separate from study dashboards and daily work.",
    href: "/student/offers",
    action: "View offers",
  },
];

export function StudentToolsManager() {
  const [bookRequests, setBookRequests] = useState<BookRequest[]>([]);
  const [bookMessage, setBookMessage] = useState<string | null>(null);
  const [bookError, setBookError] = useState<string | null>(null);
  const [bookSaving, setBookSaving] = useState(false);
  const [bookForm, setBookForm] = useState({
    title: "",
    author: "",
    className: "",
    subject: "",
    message: "",
  });
  const [tocImage, setTocImage] = useState<File | null>(null);

  async function loadBookRequests() {
    try {
      const response = await apiFetch<{ success: boolean; data: BookRequest[] }>("/student/book-requests");
      setBookRequests(response.data);
    } catch {
      setBookRequests([]);
    }
  }

  useEffect(() => {
    void loadBookRequests();
  }, []);

  async function submitBookRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setBookSaving(true);
      setBookMessage(null);
      setBookError(null);
      const formData = new FormData();
      formData.append("title", bookForm.title);
      formData.append("author", bookForm.author);
      formData.append("className", bookForm.className);
      formData.append("subject", bookForm.subject);
      formData.append("message", bookForm.message);
      if (tocImage) {
        formData.append("tocImage", tocImage);
      }
      await apiFetch("/student/book-requests", {
        method: "POST",
        body: formData,
      });
      setBookMessage("Book request sent to your library.");
      setBookForm({ title: "", author: "", className: "", subject: "", message: "" });
      setTocImage(null);
      await loadBookRequests();
    } catch (error) {
      setBookError(error instanceof Error ? error.message : "Unable to send book request.");
    } finally {
      setBookSaving(false);
    }
  }

  return (
    <div className="grid gap-4">
      <StudentSectionTabs active="tools" />

      <section className="rounded-xl border border-[var(--lp-border)] bg-[linear-gradient(135deg,#16b871_0%,#9debd5_100%)] p-4 text-white shadow-sm">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/75">Study tools</p>
        <h3 className="mt-1 text-xl font-black tracking-tight">All study utilities in one place, away from library operations.</h3>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-white/85">
          Use this section for actual studying: focus timer, syllabus work, revision, rewards, feed, and optional offers.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool) => (
          <DashboardCard key={tool.href} title={tool.title} subtitle={tool.detail}>
            <Link href={tool.href} className="inline-flex rounded-lg border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--lp-accent)]">
              {tool.action}
            </Link>
          </DashboardCard>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <DashboardCard title="Request a new book" subtitle="Ask your library to add a book and attach table-of-content image.">
          <form className="grid gap-3" onSubmit={submitBookRequest}>
            <input
              value={bookForm.title}
              onChange={(event) => setBookForm((current) => ({ ...current, title: event.target.value }))}
              className="rounded-xl border border-[var(--lp-border)] bg-white px-4 py-3 outline-none"
              placeholder="Book title"
              required
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                value={bookForm.author}
                onChange={(event) => setBookForm((current) => ({ ...current, author: event.target.value }))}
                className="rounded-xl border border-[var(--lp-border)] bg-white px-4 py-3 outline-none"
                placeholder="Author"
              />
              <input
                value={bookForm.className}
                onChange={(event) => setBookForm((current) => ({ ...current, className: event.target.value }))}
                className="rounded-xl border border-[var(--lp-border)] bg-white px-4 py-3 outline-none"
                placeholder="Class / exam"
              />
              <input
                value={bookForm.subject}
                onChange={(event) => setBookForm((current) => ({ ...current, subject: event.target.value }))}
                className="rounded-xl border border-[var(--lp-border)] bg-white px-4 py-3 outline-none"
                placeholder="Subject"
              />
            </div>
            <textarea
              value={bookForm.message}
              onChange={(event) => setBookForm((current) => ({ ...current, message: event.target.value }))}
              className="min-h-24 rounded-xl border border-[var(--lp-border)] bg-white px-4 py-3 outline-none"
              placeholder="Why this book is needed"
            />
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => setTocImage(event.target.files?.[0] ?? null)}
              className="rounded-xl border border-[var(--lp-border)] bg-white p-3 text-sm font-semibold text-[var(--lp-muted)]"
            />
            {bookMessage ? <p className="text-sm font-semibold text-emerald-700">{bookMessage}</p> : null}
            {bookError ? <p className="text-sm font-semibold text-amber-700">{bookError}</p> : null}
            <button type="submit" disabled={bookSaving} className="rounded-lg border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--lp-accent)] disabled:opacity-50">
              {bookSaving ? "Sending..." : "Send book request"}
            </button>
          </form>
        </DashboardCard>

        <DashboardCard title="My book requests" subtitle="Track what you asked your library to add.">
          <div className="grid gap-3">
            {bookRequests.map((request) => (
              <article key={request.id} className="rounded-xl border border-[var(--lp-border)] bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-[var(--lp-text)]">{request.title}</p>
                    <p className="mt-1 text-sm text-[var(--lp-muted)]">
                      {[request.author, request.class_name, request.subject].filter(Boolean).join(" | ") || "Book request"}
                    </p>
                  </div>
                  <span className="rounded-full bg-[var(--lp-surface-muted)] px-3 py-1 text-xs font-black text-[var(--lp-muted)]">{request.status}</span>
                </div>
                {request.toc_image_url ? (
                  <a href={request.toc_image_url} target="_blank" className="mt-3 inline-flex text-sm font-bold text-[var(--lp-accent)]">
                    View TOC image
                  </a>
                ) : null}
              </article>
            ))}
            {bookRequests.length === 0 ? <p className="text-sm text-[var(--lp-muted)]">No book requests yet.</p> : null}
          </div>
        </DashboardCard>
      </section>
    </div>
  );
}
