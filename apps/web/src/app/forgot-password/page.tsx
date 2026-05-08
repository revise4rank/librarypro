"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "../../lib/api";

function loginPathForRole(role: string | null) {
  if (role === "student") return "/student/login";
  if (role === "super_admin") return "/superadmin/login";
  return "/owner/login";
}

function roleLabel(role: string | null) {
  if (role === "student") return "student";
  if (role === "super_admin") return "super admin";
  return "owner";
}

function ForgotPasswordManager() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role");
  const [login, setLogin] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const backHref = useMemo(() => loginPathForRole(role), [role]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const result = await apiFetch<{ success: boolean; data?: { message?: string } }>(
        "/auth/forgot-password",
        {
          method: "POST",
          body: JSON.stringify({ login }),
        },
        false,
      );
      setMessage(result.data?.message ?? "If an account exists with an email address, a reset link has been sent.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to request password reset.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-md content-center">
        <form onSubmit={onSubmit} className="rounded-lg border border-white/10 bg-white p-6 text-slate-950 shadow-2xl">
          <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Password reset</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight">Reset {roleLabel(role)} password</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Enter your email, phone, or student ID. If the account has an email, we will send a reset link.
          </p>

          <label className="mt-5 grid gap-1.5 text-sm font-semibold text-slate-700">
            Login ID
            <input
              value={login}
              onChange={(event) => setLogin(event.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-950 outline-none transition focus:border-emerald-400 focus:bg-white"
              placeholder="Email, phone, or student ID"
              autoComplete="username"
            />
          </label>

          {message ? <p className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{message}</p> : null}
          {error ? <p className="mt-4 rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p> : null}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button disabled={submitting} className="rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-emerald-300 disabled:opacity-60">
              {submitting ? "Sending..." : "Send reset link"}
            </button>
            <Link href={backHref} className="text-sm font-bold text-slate-600 hover:text-slate-950">
              Back to login
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-950" />}>
      <ForgotPasswordManager />
    </Suspense>
  );
}
