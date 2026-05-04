"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, dashboardPathForRole, saveSession } from "../lib/api";

type LoginResponse = {
  success: boolean;
  data: {
    csrfToken?: string;
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

type RoleLoginFormProps = {
  expectedRole: "LIBRARY_OWNER" | "STUDENT" | "SUPER_ADMIN";
  loginPlaceholder: string;
  submitLabel: string;
  loginLabel?: string;
  passwordLabel?: string;
  passwordPlaceholder?: string;
  helperText?: string;
  showSeedHint?: boolean;
};

export function RoleLoginForm({
  expectedRole,
  loginPlaceholder,
  submitLabel,
  loginLabel,
  passwordLabel,
  passwordPlaceholder = "Password",
  helperText,
  showSeedHint = false,
}: RoleLoginFormProps) {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const result = await apiFetch<LoginResponse>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ login, password }),
        },
        false,
      );

      if (result.data.user.role !== expectedRole) {
        throw new Error(`This account does not have ${expectedRole.toLowerCase().replace("_", " ")} access.`);
      }

      saveSession(result.data);
      router.push(dashboardPathForRole(result.data.user.role));
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
        {loginLabel ?? "Login"}
        <input
          value={login}
          onChange={(event) => setLogin(event.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-950 outline-none transition focus:border-emerald-400 focus:bg-white"
          placeholder={loginPlaceholder}
          autoComplete={expectedRole === "STUDENT" ? "username" : "email"}
        />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
        {passwordLabel ?? "Password"}
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-950 outline-none transition focus:border-emerald-400 focus:bg-white"
          placeholder={passwordPlaceholder}
          type="password"
          autoComplete="current-password"
        />
      </label>
      {helperText ? <p className="text-sm leading-6 text-slate-500">{helperText}</p> : null}
      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
      {showSeedHint ? <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-6 text-slate-500">
        Seed login works only if API and database are running with demo seed data.
      </div> : null}
      <button
        disabled={submitting}
        className="rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-bold text-[#0F172A] shadow-sm transition hover:bg-emerald-300 disabled:opacity-60"
      >
        {submitting ? "Signing in..." : submitLabel}
      </button>
    </form>
  );
}

export function OwnerLoginForm() {
  return (
    <RoleLoginForm
      expectedRole="LIBRARY_OWNER"
      loginPlaceholder="Owner email or phone"
      submitLabel="Open library workspace"
    />
  );
}
