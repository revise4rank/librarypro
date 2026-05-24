"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";
import { StatCard } from "./stat-card";

type BookRequest = {
  id: string;
  student_name: string | null;
  library_name: string | null;
  title: string;
  author: string | null;
  class_name: string | null;
  subject: string | null;
  message: string | null;
  toc_image_url: string | null;
  status: "PENDING" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "FULFILLED";
  created_at: string;
  reviewed_at?: string | null;
  linked_global_book_id?: string | null;
};

const statusOptions = ["ALL", "PENDING", "IN_REVIEW", "APPROVED", "FULFILLED", "REJECTED"] as const;
type StatusFilter = (typeof statusOptions)[number];

const actions: Array<{ status: BookRequest["status"]; label: string; className: string }> = [
  { status: "IN_REVIEW", label: "Review", className: "border-blue-200 bg-blue-50 text-blue-700" },
  { status: "APPROVED", label: "Approve", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { status: "FULFILLED", label: "Mark added", className: "border-[var(--lp-primary)] bg-[var(--lp-primary-soft)] text-[var(--lp-primary)]" },
  { status: "REJECTED", label: "Reject", className: "border-rose-200 bg-rose-50 text-rose-700" },
  { status: "PENDING", label: "Reopen", className: "border-[var(--lp-border)] bg-white text-[var(--lp-muted)]" },
];

function countByStatus(rows: BookRequest[], status: BookRequest["status"]) {
  return rows.filter((row) => row.status === status).length;
}

function requestMeta(request: BookRequest) {
  return [request.student_name ?? "Student", request.library_name, request.author, request.class_name, request.subject].filter(Boolean).join(" | ");
}

export function SuperadminBookRequestsManager() {
  const [rows, setRows] = useState<BookRequest[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [linkBookIds, setLinkBookIds] = useState<Record<string, string>>({});

  async function loadRequests() {
    setLoading(true);
    try {
      const response = await apiFetch<{ success: boolean; data: BookRequest[] }>("/admin/book-requests");
      setRows(response.data);
      setError(null);
    } catch (loadError) {
      setRows([]);
      setError(loadError instanceof Error ? loadError.message : "Unable to load book requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRequests();
  }, []);

  const visibleRows = useMemo(() => (filter === "ALL" ? rows : rows.filter((row) => row.status === filter)), [filter, rows]);
  const pendingRows = rows.filter((row) => row.status === "PENDING");

  async function updateBookRequest(requestId: string, status: BookRequest["status"]) {
    try {
      setUpdatingId(requestId);
      setMessage(null);
      await apiFetch(`/admin/book-requests/${requestId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setMessage("Book request status updated.");
      await loadRequests();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update book request.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function linkBookRequest(requestId: string) {
    const bookId = linkBookIds[requestId]?.trim();
    if (!bookId) {
      setError("Paste the global book id before linking.");
      return;
    }
    try {
      setUpdatingId(requestId);
      await apiFetch(`/admin/book-requests/${requestId}/link-book`, {
        method: "PATCH",
        body: JSON.stringify({ bookId }),
      });
      setMessage("Book request linked and fulfilled.");
      await loadRequests();
    } catch (linkError) {
      setError(linkError instanceof Error ? linkError.message : "Unable to link book.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="grid gap-4">
      {error ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">{error}</p> : null}
      {message ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pending" value={countByStatus(rows, "PENDING")} note="Needs superadmin review." />
        <StatCard label="In review" value={countByStatus(rows, "IN_REVIEW")} note="Being converted into a tracker." />
        <StatCard label="Approved" value={countByStatus(rows, "APPROVED")} note="Accepted for sourcing." />
        <StatCard label="Added" value={countByStatus(rows, "FULFILLED")} note="Closed after completion." />
        <StatCard label="Rejected" value={countByStatus(rows, "REJECTED")} note="Not planned right now." />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
        <DashboardCard title="Superadmin decision queue" subtitle="Students send book requests here directly; owners do not manage this flow.">
          <div className="grid gap-3">
            {pendingRows.slice(0, 6).map((request) => (
              <article key={request.id} className="rounded-lg border border-[var(--lp-border)] bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[var(--lp-text)]">{request.title}</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--lp-muted)]">{requestMeta(request)}</p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-black text-amber-700">Pending</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {request.toc_image_url ? (
                    <a href={request.toc_image_url} target="_blank" className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-xs font-bold text-[var(--lp-text)]">
                      Open TOC
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void updateBookRequest(request.id, "IN_REVIEW")}
                    disabled={updatingId === request.id}
                    className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 disabled:opacity-50"
                  >
                    Review
                  </button>
                  <button
                    type="button"
                    onClick={() => void updateBookRequest(request.id, "REJECTED")}
                    disabled={updatingId === request.id}
                    className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </article>
            ))}
            {!loading && pendingRows.length === 0 ? <p className="text-sm text-[var(--lp-muted)]">No pending book requests.</p> : null}
            {loading ? <p className="text-sm text-[var(--lp-muted)]">Loading book requests...</p> : null}
          </div>
        </DashboardCard>

        <DashboardCard title="All student requests" subtitle="Filter requests and keep sourcing status clean across the platform.">
          <div className="grid gap-4">
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFilter(status)}
                  className={`rounded-full border px-3 py-2 text-xs font-bold ${
                    filter === status
                      ? "border-[var(--lp-primary)] bg-[var(--lp-primary)] text-white"
                      : "border-[var(--lp-border)] bg-white text-[var(--lp-muted)]"
                  }`}
                >
                  {status === "ALL" ? "All" : status.toLowerCase()}
                </button>
              ))}
            </div>

            <div className="grid gap-3">
              {visibleRows.map((request) => (
                <article key={request.id} className="rounded-xl border border-[var(--lp-border)] bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words font-black text-[var(--lp-text)]">{request.title}</p>
                      <p className="mt-1 text-sm leading-6 text-[var(--lp-muted)]">{requestMeta(request)}</p>
                    </div>
                    <span className="rounded-full bg-[var(--lp-surface-muted)] px-3 py-1 text-xs font-black text-[var(--lp-muted)]">{request.status}</span>
                  </div>
                  {request.message ? <p className="mt-3 rounded-lg bg-[var(--lp-surface-muted)] p-3 text-sm leading-6 text-[var(--lp-text)]">{request.message}</p> : null}
                  {request.linked_global_book_id ? (
                    <p className="mt-3 rounded-lg bg-emerald-50 p-2 text-xs font-bold text-emerald-700">Linked book: {request.linked_global_book_id}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {request.toc_image_url ? (
                      <a href={request.toc_image_url} target="_blank" className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-xs font-bold text-[var(--lp-text)]">
                        Open TOC image
                      </a>
                    ) : null}
                    {actions.map((action) => (
                      <button
                        key={action.status}
                        type="button"
                        onClick={() => void updateBookRequest(request.id, action.status)}
                        disabled={updatingId === request.id || request.status === action.status}
                        className={`rounded-lg border px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50 ${action.className}`}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                    <input
                      value={linkBookIds[request.id] ?? ""}
                      onChange={(event) => setLinkBookIds((current) => ({ ...current, [request.id]: event.target.value }))}
                      placeholder="Paste global book id after creating it in Syllabus"
                      className="min-w-0 rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-xs font-semibold outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => void linkBookRequest(request.id)}
                      disabled={updatingId === request.id}
                      className="rounded-lg bg-[var(--lp-primary)] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                    >
                      Link fulfilled book
                    </button>
                  </div>
                </article>
              ))}
              {!loading && visibleRows.length === 0 ? <p className="text-sm text-[var(--lp-muted)]">No requests found for this filter.</p> : null}
            </div>
          </div>
        </DashboardCard>
      </section>
    </div>
  );
}
