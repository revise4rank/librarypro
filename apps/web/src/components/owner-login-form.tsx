"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, dashboardPathForRole, saveSession } from "../lib/api";

type LoginResponse = {
  success: boolean;
  data: {
    csrfToken?: string;
    accessToken: string;
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
        className="rounded-[1.35rem] border border-[var(--lp-border)] bg-[#f8fcf8] px-4 py-4 text-[var(--lp-text)] outline-none transition focus:border-[var(--lp-primary)] focus:bg-white"
        placeholder={loginPlaceholder}
        autoComplete={expectedRole === "STUDENT" ? "username" : "email"}
      />
      <input
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        className="rounded-[1.35rem] border border-[var(--lp-border)] bg-[#f8fcf8] px-4 py-4 text-[var(--lp-text)] outline-none transition focus:border-[var(--lp-primary)] focus:bg-white"
        placeholder={passwordPlaceholder}
        type="password"
        autoComplete="current-password"
      />
      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
      <div className="rounded-[1.2rem] bg-[#f5faf6] px-4 py-4 text-xs leading-6 text-[var(--lp-muted)]">
        Seed login works only if API and database are running with demo seed data.
      </div>
      <button
        disabled={submitting}
        className="rounded-[1.35rem] bg-[var(--lp-primary)] px-5 py-4 text-sm font-bold text-white shadow-[0_12px_28px_rgba(93,138,102,0.18)] disabled:opacity-60"
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
      submitLabel="Login as Owner"
    />
  );
}
