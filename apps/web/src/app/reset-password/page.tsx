"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { apiFetch } from "../../lib/api";

function ResetPasswordManager() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(token ? null : "Password reset token is missing.");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      await apiFetch(
        "/auth/reset-password",
        {
          method: "POST",
          body: JSON.stringify({ token, password }),
        },
        false,
      );
      setMessage("Password updated. You can now log in with your new password.");
      setPassword("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to reset password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-md content-center">
        <form onSubmit={onSubmit} className="rounded-lg border border-white/10 bg-white p-6 text-slate-950 shadow-2xl">
          <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Password reset</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight">Create a new password</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">Use at least 6 characters. After reset, old sessions are signed out.</p>

          <div className="mt-5 grid gap-1.5 text-sm font-semibold text-slate-700">
            <label htmlFor="new-password">New password</label>
            <div className="relative">
              <input
                id="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 pr-11 text-slate-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                placeholder="New password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
          </div>

          {message ? <p className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{message}</p> : null}
          {error ? <p className="mt-4 rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p> : null}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button disabled={submitting || !token} className="rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-emerald-300 disabled:opacity-60">
              {submitting ? "Updating..." : "Update password"}
            </button>
            <Link href="/owner/login" className="text-sm font-bold text-slate-600 hover:text-slate-950">
              Back to login
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-950" />}>
      <ResetPasswordManager />
    </Suspense>
  );
}
