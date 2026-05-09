"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, saveSession } from "../../../../lib/api";

type TicketPreview = {
  email: string;
  fullName: string;
  role: "LIBRARY_OWNER" | "STUDENT";
  next: string;
  existingRole: string | null;
  requiresProfile: boolean;
  requiresLibrary: boolean;
};

type CompleteResponse = {
  success: boolean;
  data: {
    csrfToken?: string;
    next?: string;
    user: {
      id: string;
      fullName: string;
      email?: string | null;
      phone?: string | null;
      role: string;
      libraryIds: string[];
    };
  };
};

function safeNextForRole(next: string | undefined, role: string) {
  if (role === "LIBRARY_OWNER") {
    return next?.startsWith("/owner") ? next : "/owner/dashboard";
  }
  if (role === "STUDENT") {
    return next?.startsWith("/student") ? next : "/student/dashboard";
  }
  if (role === "SUPER_ADMIN") {
    return "/superadmin/dashboard";
  }
  return "/student/dashboard";
}

function GoogleOAuthCompleteManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ticket = searchParams.get("ticket") ?? "";
  const callbackError = searchParams.get("error");
  const [preview, setPreview] = useState<TicketPreview | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [libraryName, setLibraryName] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState<string | null>(callbackError);
  const [busy, setBusy] = useState(Boolean(ticket && !callbackError));

  async function complete(input?: { fullName?: string; phone?: string; libraryName?: string; city?: string }) {
    if (!ticket) {
      setError("Google sign-in ticket is missing.");
      setBusy(false);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const result = await apiFetch<CompleteResponse>(
        "/auth/google/complete",
        {
          method: "POST",
          body: JSON.stringify({ ticket, ...input }),
        },
        false,
      );

      saveSession(result.data);
      router.push(safeNextForRole(result.data.next, result.data.user.role));
      router.refresh();
    } catch (completeError) {
      setError(completeError instanceof Error ? completeError.message : "Google sign-in could not be completed.");
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!ticket || callbackError) {
      setBusy(false);
      return;
    }

    let cancelled = false;
    async function loadTicket() {
      try {
        const result = await apiFetch<{ success: boolean; data: TicketPreview }>(
          `/auth/google/ticket?ticket=${encodeURIComponent(ticket)}`,
          undefined,
          false,
        );
        if (cancelled) return;
        setPreview(result.data);
        setFullName(result.data.fullName);
        if (!result.data.requiresLibrary) {
          await complete({ fullName: result.data.fullName });
          return;
        }
        setBusy(false);
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "Google sign-in ticket could not be loaded.");
        setBusy(false);
      }
    }

    void loadTicket();
    return () => {
      cancelled = true;
    };
  }, [ticket, callbackError]);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void complete({ fullName, phone, libraryName, city });
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-xl content-center">
        <div className="rounded-lg border border-white/10 bg-white p-6 text-slate-950 shadow-2xl">
          <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Google sign-in</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight">Finishing your LibraryPro access</h1>

          {busy ? <p className="mt-4 text-sm leading-6 text-slate-500">Checking your Google account and preparing your workspace...</p> : null}

          {error ? (
            <div className="mt-4 rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {error}
            </div>
          ) : null}

          {!busy && preview?.requiresLibrary ? (
            <form onSubmit={onSubmit} className="mt-5 grid gap-4">
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                Full name
                <input value={fullName} onChange={(event) => setFullName(event.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-950 outline-none focus:border-emerald-400 focus:bg-white" />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                Library name
                <input value={libraryName} onChange={(event) => setLibraryName(event.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-950 outline-none focus:border-emerald-400 focus:bg-white" />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                  Phone
                  <input value={phone} onChange={(event) => setPhone(event.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-950 outline-none focus:border-emerald-400 focus:bg-white" />
                </label>
                <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                  City
                  <input value={city} onChange={(event) => setCity(event.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-950 outline-none focus:border-emerald-400 focus:bg-white" />
                </label>
              </div>
              <button disabled={busy} className="rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-emerald-300 disabled:opacity-60">
                Create library workspace
              </button>
            </form>
          ) : null}

          {!busy && !preview?.requiresLibrary ? (
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/owner/login" className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700">
                Owner login
              </Link>
              <Link href="/student/login" className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700">
                Student login
              </Link>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

export default function GoogleOAuthCompletePage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-950" />}>
      <GoogleOAuthCompleteManager />
    </Suspense>
  );
}
