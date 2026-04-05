"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";

type JoinHistoryItem = {
  id: string;
  library_name: string;
  status: string;
  created_at: string;
  reviewed_at?: string | null;
  review_reason?: string | null;
  linked_assignment_id?: string | null;
};

type StudentLibrary = {
  library_id: string;
  library_name: string;
  city: string;
  seat_number: string | null;
  login_id: string;
  is_active: boolean;
  joined_at: string;
  left_at: string | null;
  status: "ACTIVE" | "LEFT";
};

type RejoinOptions = {
  libraryName: string | null;
  suggestedPlanPrice: string | null;
  availableSeats: Array<{ seat_number: string; label: string | null }>;
};

type SearchLibrary = {
  id: string;
  name: string;
  slug: string;
  subdomain: string;
  city: string | null;
  area: string | null;
  status: string;
};

type JoinMode = "search" | "scan";

export function StudentJoinLibraryManager() {
  const [joinMode, setJoinMode] = useState<JoinMode>("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchLibrary[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedLibraryId, setSelectedLibraryId] = useState("");
  const [qrPayload, setQrPayload] = useState("");
  const [seatPreference, setSeatPreference] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState("5");
  const [selectedReviewLibraryId, setSelectedReviewLibraryId] = useState("");
  const [history, setHistory] = useState<JoinHistoryItem[]>([]);
  const [libraries, setLibraries] = useState<StudentLibrary[]>([]);
  const [rejoinLibraryId, setRejoinLibraryId] = useState("");
  const [rejoinOptions, setRejoinOptions] = useState<RejoinOptions | null>(null);
  const [reserveMessage, setReserveMessage] = useState<string | null>(null);
  const [submittingLibraryId, setSubmittingLibraryId] = useState<string | null>(null);

  async function loadHistory() {
    const response = await apiFetch<{ success: boolean; data: JoinHistoryItem[] }>("/student/join-requests");
    setHistory(response.data);
  }

  async function loadLibraries() {
    const response = await apiFetch<{ success: boolean; data: StudentLibrary[] }>("/student/libraries");
    setLibraries(response.data);
    setSelectedReviewLibraryId((current) => current || response.data[0]?.library_id || "");
  }

  useEffect(() => {
    void loadHistory();
    void loadLibraries();
  }, []);

  const searchableResults = useMemo(() => {
    const joinedIds = new Set(libraries.map((library) => library.library_id));
    return searchResults.filter((item) => !joinedIds.has(item.id));
  }, [libraries, searchResults]);

  async function searchLibraries() {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await apiFetch<{ success: boolean; data: SearchLibrary[] }>(
        `/student/libraries/search?q=${encodeURIComponent(query)}`,
      );
      setSearchResults(response.data);
    } finally {
      setSearching(false);
    }
  }

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = window.setTimeout(() => {
      void searchLibraries();
    }, 280);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  async function submitQrJoinRequest() {
    const response = await apiFetch<{ success: boolean; data: { libraryName: string } }>("/student/join-requests/scan", {
      method: "POST",
      body: JSON.stringify({ qrPayload, seatPreference, message }),
    });
    setStatus(`Join request sent to ${response.data.libraryName}. Owner can now collect payment and allot your seat.`);
    setQrPayload("");
    setSeatPreference("");
    setMessage("");
    await loadHistory();
  }

  async function submitLibraryJoinRequest(libraryId: string) {
    setSubmittingLibraryId(libraryId);
    try {
      const response = await apiFetch<{ success: boolean; data: { libraryName: string } }>("/student/join-requests/library", {
        method: "POST",
        body: JSON.stringify({ libraryId, seatPreference, message }),
      });
      setStatus(`Join request sent to ${response.data.libraryName}. Library desk will review your request.`);
      setSelectedLibraryId(libraryId);
      await loadHistory();
      await loadLibraries();
      await searchLibraries();
    } finally {
      setSubmittingLibraryId(null);
    }
  }

  async function rejoinLibrary(libraryId: string) {
    await apiFetch(`/student/libraries/${libraryId}/rejoin`, {
      method: "POST",
      body: JSON.stringify({
        seatPreference,
        message: message || "Rejoin request from existing student account",
      }),
    });
    setStatus("Rejoin request sent to library desk.");
    await loadHistory();
  }

  async function loadRejoinOptions(libraryId: string) {
    const response = await apiFetch<{ success: boolean; data: RejoinOptions }>(
      `/student/libraries/${libraryId}/rejoin-options`,
    );
    setRejoinLibraryId(libraryId);
    setRejoinOptions(response.data);
  }

  async function submitReview() {
    await apiFetch(`/student/libraries/${selectedReviewLibraryId}/reviews`, {
      method: "POST",
      body: JSON.stringify({
        rating: Number(reviewRating),
        reviewText,
      }),
    });
    setStatus("Your library review has been published to the marketplace.");
    setReviewText("");
    setReviewRating("5");
  }

  async function reserveSuggestedSeat(libraryId: string, seatNumber: string) {
    const response = await apiFetch<{ success: boolean; data: { reserved_until: string } }>(
      `/student/libraries/${libraryId}/rejoin-seats/${encodeURIComponent(seatNumber)}/reserve`,
      { method: "POST" },
    );
    setSeatPreference(seatNumber);
    setReserveMessage(`Seat ${seatNumber} reserved till ${new Date(response.data.reserved_until).toLocaleTimeString()}.`);
    await loadRejoinOptions(libraryId);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <DashboardCard title="Join a new library" subtitle="Search active libraries, send a request, or scan a library QR at the desk.">
        <div className="grid gap-4">
          {status ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{status}</div> : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setJoinMode("search")}
              className={`rounded-full px-4 py-2 text-sm font-bold ${joinMode === "search" ? "bg-[var(--lp-primary)] text-white" : "border border-[var(--lp-border)] bg-white text-[var(--lp-text)]"}`}
            >
              Search library
            </button>
            <button
              type="button"
              onClick={() => setJoinMode("scan")}
              className={`rounded-full px-4 py-2 text-sm font-bold ${joinMode === "scan" ? "bg-[var(--lp-primary)] text-white" : "border border-[var(--lp-border)] bg-white text-[var(--lp-text)]"}`}
            >
              Scan library QR
            </button>
          </div>

          <div className="rounded-2xl border border-[var(--lp-border)] bg-[#fffdfa] p-4 text-sm text-[var(--lp-muted)]">
            {joinMode === "search"
              ? "Kisi bhi active library ko name, city, area ya subdomain se search karo. Result se direct join request bhejo."
              : "Agar library reception ya gate par QR laga hai, uska payload scan ya paste karke direct request bhejo."}
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <input
              value={seatPreference}
              onChange={(event) => setSeatPreference(event.target.value)}
              placeholder="Preferred seat or section"
              className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3"
            />
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Short note"
              className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3"
            />
          </div>

          {joinMode === "search" ? (
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by library name, city, area, or subdomain"
                  className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3"
                />
                <button
                  type="button"
                  onClick={() => void searchLibraries()}
                  disabled={searchQuery.trim().length < 2 || searching}
                  className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3 text-sm font-bold text-[var(--lp-primary)] disabled:opacity-60"
                >
                  {searching ? "Searching..." : "Search"}
                </button>
              </div>
              <div className="grid gap-3">
                {searchableResults.map((library) => (
                  <div key={library.id} className={`rounded-2xl border px-4 py-4 text-sm ${selectedLibraryId === library.id ? "border-[var(--lp-primary)] bg-[#fff7f1]" : "border-[var(--lp-border)] bg-white"}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-bold text-[var(--lp-text)]">{library.name}</p>
                        <p className="text-[var(--lp-muted)]">
                          {[library.city, library.area].filter(Boolean).join(" · ") || "Location updating"}
                        </p>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--lp-accent)]">
                          {library.subdomain}.nextlib.in
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void submitLibraryJoinRequest(library.id)}
                        disabled={submittingLibraryId === library.id}
                        className="rounded-full bg-[var(--lp-primary)] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
                      >
                        {submittingLibraryId === library.id ? "Sending..." : "Send join request"}
                      </button>
                    </div>
                  </div>
                ))}
                {searchQuery.trim().length >= 2 && !searching && searchableResults.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--lp-border)] bg-[#fffdfa] px-4 py-4 text-sm text-[var(--lp-muted)]">
                    No active library found for this search, or you already have it in your library history.
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              <textarea
                value={qrPayload}
                onChange={(event) => setQrPayload(event.target.value)}
                placeholder="Paste scanned library QR payload"
                className="min-h-32 rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3"
              />
              <button
                type="button"
                onClick={() => void submitQrJoinRequest()}
                disabled={!qrPayload.trim()}
                className="rounded-2xl bg-[var(--lp-primary)] px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                Send join request via QR
              </button>
            </div>
          )}
        </div>
      </DashboardCard>

      <DashboardCard title="Library timeline and reviews" subtitle="Track active or past libraries, rejoin quickly, and review only the libraries you actually joined.">
        <div className="grid gap-4">
          <div className="grid gap-4 text-sm leading-7 text-[var(--lp-muted)]">
            <p>Student apna same app account use karke multiple active libraries discover kar sakta hai aur new join request bhej sakta hai.</p>
            <p>Search se request bhejo ya direct library QR scan karo. Request owner/admin desk ko chali jayegi.</p>
            <p>Payment aur seat allotment approve hone ke baad wahi library QR se check-in/check-out chalega.</p>
            <p>Bina active library ke bhi pomodoro, focus, syllabus, revision, rewards, and offers use karte raho.</p>
            <Link href="/student/offers" className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3 text-center font-bold text-[var(--lp-primary)]">
              Explore coaching and library offers
            </Link>
          </div>

          <div className="grid gap-3">
            {libraries.map((library) => (
              <div key={library.library_id} className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-[var(--lp-text)]">{library.library_name}</p>
                    <p className="text-[var(--lp-muted)]">{library.city} · Joined {new Date(library.joined_at).toLocaleDateString()}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--lp-accent)]">
                      {library.status} {library.seat_number ? `· Seat ${library.seat_number}` : ""}
                    </p>
                  </div>
                  {library.status === "LEFT" ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void loadRejoinOptions(library.library_id)}
                        className="rounded-full border border-[var(--lp-border)] bg-[#f4faf5] px-3 py-2 text-xs font-bold text-[var(--lp-primary)]"
                      >
                        Seat suggestions
                      </button>
                      <button
                        type="button"
                        onClick={() => void rejoinLibrary(library.library_id)}
                        className="rounded-full border border-[var(--lp-border)] bg-[#f4faf5] px-3 py-2 text-xs font-bold text-[var(--lp-primary)]"
                      >
                        Rejoin
                      </button>
                    </div>
                  ) : null}
                </div>
                {library.left_at ? <p className="mt-2 text-[var(--lp-muted)]">Exited on {new Date(library.left_at).toLocaleDateString()}</p> : null}
                {rejoinLibraryId === library.library_id && rejoinOptions ? (
                  <div className="mt-3 rounded-2xl bg-[#f9f5ee] p-4 text-sm">
                    <p className="font-bold text-[var(--lp-text)]">Rejoin suggestions</p>
                    <p className="mt-1 text-[var(--lp-muted)]">Suggested monthly plan: Rs. {rejoinOptions.suggestedPlanPrice ?? "N/A"}</p>
                    {reserveMessage ? <p className="mt-2 font-semibold text-emerald-700">{reserveMessage}</p> : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {rejoinOptions.availableSeats.map((seat) => (
                        <div key={seat.seat_number} className="flex items-center gap-2 rounded-full border border-[var(--lp-border)] bg-white px-3 py-2 text-xs font-bold text-[var(--lp-primary)]">
                          <button type="button" onClick={() => setSeatPreference(seat.seat_number)}>
                            {seat.seat_number}{seat.label ? ` · ${seat.label}` : ""}
                          </button>
                          <button
                            type="button"
                            onClick={() => void reserveSuggestedSeat(library.library_id, seat.seat_number)}
                            className="rounded-full bg-[var(--lp-primary)] px-2 py-1 text-[10px] text-white"
                          >
                            Reserve 30m
                          </button>
                        </div>
                      ))}
                      {rejoinOptions.availableSeats.length === 0 ? <span className="text-[var(--lp-muted)]">No seats visible right now.</span> : null}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
            {libraries.length === 0 ? <p className="text-sm text-[var(--lp-muted)]">No library history yet.</p> : null}
          </div>

          <div className="grid gap-3 rounded-2xl border border-[var(--lp-border)] bg-white p-4">
            <div>
              <p className="text-sm font-bold text-[var(--lp-text)]">Review a joined library</p>
              <p className="mt-1 text-sm text-[var(--lp-muted)]">
                Review marketplace par tabhi show hoga jab student ne library actually join ki ho.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
              <select
                value={selectedReviewLibraryId}
                onChange={(event) => setSelectedReviewLibraryId(event.target.value)}
                className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3"
              >
                {libraries.map((library) => (
                  <option key={library.library_id} value={library.library_id}>
                    {library.library_name}
                  </option>
                ))}
              </select>
              <select
                value={reviewRating}
                onChange={(event) => setReviewRating(event.target.value)}
                className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3"
              >
                {[5, 4, 3, 2, 1].map((item) => (
                  <option key={item} value={String(item)}>
                    {item}/5
                  </option>
                ))}
              </select>
            </div>
            <textarea
              value={reviewText}
              onChange={(event) => setReviewText(event.target.value)}
              placeholder="Write an honest review about seats, discipline, environment, and management"
              className="min-h-24 rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3"
            />
            <button
              type="button"
              onClick={() => void submitReview()}
              disabled={!selectedReviewLibraryId || reviewText.trim().length < 8}
              className="rounded-2xl bg-[var(--lp-primary)] px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              Publish review
            </button>
          </div>

          <div className="grid gap-3">
            {history.map((item) => (
              <div key={item.id} className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-[var(--lp-text)]">{item.library_name}</p>
                    <p className="text-[var(--lp-muted)]">{new Date(item.created_at).toLocaleString()}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{item.status}</span>
                </div>
                {item.review_reason ? <p className="mt-2 text-[var(--lp-muted)]">Reason: {item.review_reason}</p> : null}
                {item.linked_assignment_id ? <p className="mt-2 font-semibold text-emerald-700">Seat admission activated</p> : null}
              </div>
            ))}
            {history.length === 0 ? <p className="text-sm text-[var(--lp-muted)]">No join requests yet.</p> : null}
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
