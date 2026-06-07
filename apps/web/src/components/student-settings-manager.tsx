"use client";

import { useEffect, useState } from "react";
import { apiFetch, clearClientSession, logoutSession, saveSession, type SessionState, type SessionUser } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";

type StudentSettingsTab = "account" | "libraries";

type AuthMeResponse = {
  success: boolean;
  data: SessionUser & {
    sessionVersion?: number;
    csrfToken?: string;
  };
};

type LibrariesResponse = {
  success: boolean;
  data: Array<{
    library_id: string;
    library_name: string;
    city: string;
    seat_number: string | null;
    login_id: string;
    is_active: boolean;
    joined_at: string;
    left_at: string | null;
    status: "ACTIVE" | "LEFT";
  }>;
};

const tabs: Array<{ id: StudentSettingsTab; label: string; summary: string }> = [
  { id: "account", label: "Account & security", summary: "Name, contact details, student ID, password, and session controls." },
  { id: "libraries", label: "Library access", summary: "Connected libraries, active workspace, seat, and exit controls." },
];

function buildSession(data: AuthMeResponse["data"]) {
  return {
    user: {
      id: data.id,
      fullName: data.fullName,
      studentCode: data.studentCode,
      email: data.email,
      phone: data.phone,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      role: data.role,
      libraryIds: data.libraryIds,
    },
    csrfToken: data.csrfToken,
  } satisfies SessionState;
}

export function StudentSettingsManager({ initialTab = "account" }: { initialTab?: StudentSettingsTab }) {
  const [activeTab, setActiveTab] = useState<StudentSettingsTab>(initialTab);
  const [account, setAccount] = useState<SessionUser | null>(null);
  const [libraries, setLibraries] = useState<LibrariesResponse["data"]>([]);
  const [accountForm, setAccountForm] = useState({ fullName: "", email: "", phone: "", dateOfBirth: "", gender: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", nextPassword: "" });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [accountSaving, setAccountSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [librarySavingId, setLibrarySavingId] = useState<string | null>(null);

  async function loadSettings() {
    try {
      const [accountResponse, librariesResponse] = await Promise.all([
        apiFetch<AuthMeResponse>("/auth/me"),
        apiFetch<LibrariesResponse>("/student/libraries"),
      ]);
      const nextSession = buildSession(accountResponse.data);
      saveSession(nextSession);
      setAccount(nextSession.user);
      setAccountForm({
        fullName: nextSession.user.fullName ?? "",
        email: nextSession.user.email ?? "",
        phone: nextSession.user.phone ?? "",
        dateOfBirth: nextSession.user.dateOfBirth ?? "",
        gender: nextSession.user.gender ?? "",
      });
      setLibraries(librariesResponse.data);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load student settings.");
    }
  }

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    void loadSettings();
  }, []);

  async function saveAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccountSaving(true);
    setMessage(null);
    try {
      const response = await apiFetch<AuthMeResponse>("/auth/me", {
        method: "PATCH",
        body: JSON.stringify(accountForm),
      });
      const nextSession = buildSession(response.data);
      saveSession(nextSession);
      setAccount(nextSession.user);
      setMessage("Student profile updated.");
      setError(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update profile.");
    } finally {
      setAccountSaving(false);
    }
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordSaving(true);
    setMessage(null);
    try {
      await apiFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify(passwordForm),
      });
      await logoutSession();
      clearClientSession();
      window.location.href = "/student/login";
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to change password.");
    } finally {
      setPasswordSaving(false);
    }
  }

  async function setActiveLibrary(libraryId: string) {
    setLibrarySavingId(libraryId);
    setMessage(null);
    try {
      await apiFetch(`/student/libraries/${libraryId}/active`, { method: "PATCH" });
      setMessage("Active library updated.");
      await loadSettings();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to switch active library.");
    } finally {
      setLibrarySavingId(null);
    }
  }

  async function exitLibrary(libraryId: string) {
    if (!window.confirm("Exit this library from your student workspace?")) {
      return;
    }

    setLibrarySavingId(libraryId);
    setMessage(null);
    try {
      await apiFetch(`/student/libraries/${libraryId}/exit`, { method: "POST" });
      setMessage("Library access exited.");
      await loadSettings();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to exit library.");
    } finally {
      setLibrarySavingId(null);
    }
  }

  if (!account) {
    return <p className="text-sm text-slate-500">{error ?? "Loading student settings..."}</p>;
  }

  const activeLibraries = libraries.filter((library) => library.status === "ACTIVE");

  return (
    <div className="grid gap-4">
      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
      {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}

      <DashboardCard title="Student settings" subtitle="Keep student-only account, security, and library access controls together.">
        <div className="grid gap-3 md:grid-cols-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg border px-4 py-3 text-left transition ${
                activeTab === tab.id
                  ? "border-[var(--lp-accent-soft)] bg-[var(--lp-accent-soft)]/45"
                  : "border-[var(--lp-border)] bg-white"
              }`}
            >
              <p className="text-sm font-black text-[var(--lp-text)]">{tab.label}</p>
              <p className="mt-1 text-xs leading-5 text-[var(--lp-text-soft)]">{tab.summary}</p>
            </button>
          ))}
        </div>
      </DashboardCard>

      {activeTab === "account" ? (
        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <DashboardCard title="Profile" subtitle="Students can update only their own contact identity here.">
            <form className="grid gap-3" onSubmit={saveAccount}>
              <input
                value={accountForm.fullName}
                onChange={(event) => setAccountForm((current) => ({ ...current, fullName: event.target.value }))}
                className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none"
                placeholder="Full name"
              />
              <input
                value={accountForm.email}
                onChange={(event) => setAccountForm((current) => ({ ...current, email: event.target.value }))}
                className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none"
                placeholder="Email"
              />
              <input
                value={accountForm.phone}
                onChange={(event) => setAccountForm((current) => ({ ...current, phone: event.target.value }))}
                className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none"
                placeholder="Phone"
              />
              <input
                type="date"
                value={accountForm.dateOfBirth}
                onChange={(event) => setAccountForm((current) => ({ ...current, dateOfBirth: event.target.value }))}
                className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none"
                aria-label="Date of birth"
              />
              <select
                value={accountForm.gender}
                onChange={(event) => setAccountForm((current) => ({ ...current, gender: event.target.value }))}
                className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none"
              >
                <option value="">Gender optional</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
                <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
              </select>
              <button disabled={accountSaving} className="rounded-lg border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--lp-accent)] disabled:opacity-60">
                {accountSaving ? "Saving..." : "Save profile"}
              </button>
            </form>
          </DashboardCard>

          <div className="grid gap-4">
            <DashboardCard title="Password & security" subtitle="Password changes sign the student out so the new login can be tested immediately.">
              <form className="grid gap-3" onSubmit={changePassword}>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
                  className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none"
                  placeholder="Current password"
                />
                <input
                  type="password"
                  value={passwordForm.nextPassword}
                  onChange={(event) => setPasswordForm((current) => ({ ...current, nextPassword: event.target.value }))}
                  className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none"
                  placeholder="New password"
                />
                <button disabled={passwordSaving} className="rounded-lg border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--lp-accent)] disabled:opacity-60">
                  {passwordSaving ? "Updating..." : "Change password"}
                </button>
              </form>
            </DashboardCard>

            <DashboardCard title="Current session" subtitle="Student identity details that matter for support.">
              <div className="grid gap-3 text-sm text-[var(--lp-text-soft)]">
                <p>Name: <span className="font-semibold text-[var(--lp-text)]">{account.fullName}</span></p>
                <p>Student ID: <span className="font-semibold text-[var(--lp-text)]">{account.studentCode ?? "-"}</span></p>
                <p>Email: <span className="font-semibold text-[var(--lp-text)]">{account.email ?? "-"}</span></p>
                <p>Phone: <span className="font-semibold text-[var(--lp-text)]">{account.phone ?? "-"}</span></p>
                <p>Date of birth: <span className="font-semibold text-[var(--lp-text)]">{account.dateOfBirth ?? "-"}</span></p>
                <p>Gender: <span className="font-semibold text-[var(--lp-text)]">{account.gender ? account.gender.replaceAll("_", " ") : "-"}</span></p>
                <button
                  type="button"
                  onClick={async () => {
                    await logoutSession();
                    clearClientSession();
                    window.location.href = "/student/login";
                  }}
                  className="inline-flex w-fit rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700"
                >
                  Logout
                </button>
              </div>
            </DashboardCard>
          </div>
        </div>
      ) : null}

      {activeTab === "libraries" ? (
        <DashboardCard title="Library access" subtitle="Switch active library, check assigned login details, or leave an old library.">
          <div className="grid gap-3">
            {activeLibraries.map((library) => (
              <article key={library.library_id} className={`rounded-lg border p-4 ${library.is_active ? "border-emerald-200 bg-emerald-50" : "border-[var(--lp-border)] bg-white"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--lp-text)]">{library.library_name}</p>
                    <p className="mt-1 text-sm text-[var(--lp-text-soft)]">
                      {library.city} | Login ID {library.login_id} | Seat {library.seat_number ?? "-"}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${library.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                    {library.is_active ? "Active" : "Connected"}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {!library.is_active ? (
                    <button
                      type="button"
                      onClick={() => void setActiveLibrary(library.library_id)}
                      disabled={librarySavingId === library.library_id}
                      className="rounded-lg border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--lp-accent)] disabled:opacity-60"
                    >
                      Make active
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void exitLibrary(library.library_id)}
                    disabled={librarySavingId === library.library_id}
                    className="rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 disabled:opacity-60"
                  >
                    Exit library
                  </button>
                </div>
              </article>
            ))}
            {activeLibraries.length === 0 ? (
              <div className="rounded-lg border border-[var(--lp-border)] bg-white p-4 text-sm text-[var(--lp-text-soft)]">
                No active library access yet. Use the scanner button in the header to scan a library QR and request access.
              </div>
            ) : null}
          </div>
        </DashboardCard>
      ) : null}
    </div>
  );
}
