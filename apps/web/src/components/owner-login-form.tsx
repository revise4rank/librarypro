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
  passwordPlaceholder?: string;
};

export function RoleLoginForm({
  expectedRole,
  loginPlaceholder,
  submitLabel,
  passwordPlaceholder = "Password",
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
      <input
        value={login}
        onChange={(event) => setLogin(event.target.value)}
        className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-emerald-400 focus:bg-white"
        placeholder={loginPlaceholder}
        autoComplete={expectedRole === "STUDENT" ? "username" : "email"}
      />
      <input
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-emerald-400 focus:bg-white"
        placeholder={passwordPlaceholder}
        type="password"
        autoComplete="current-password"
      />
      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
      <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-500">
        Seed login works only if API and database are running with demo seed data.
      </div>
      <button
        disabled={submitting}
        className="rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-bold text-[#0F172A] shadow-[0_12px_28px_rgba(16,185,129,0.18)] transition hover:bg-emerald-300 disabled:opacity-60"
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
