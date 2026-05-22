"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, LogIn } from "lucide-react";
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

export function GoogleOAuthButton({ role, next }: { role: "LIBRARY_OWNER" | "STUDENT"; next: string }) {
  const params = new URLSearchParams({ role, next });
  return (
    <a
      href={`/api-proxy/v1/auth/google/start?${params.toString()}`}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50"
    >
      <LogIn className="h-4 w-4" aria-hidden="true" />
      Continue with Google
    </a>
  );
}

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
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const googleRole = expectedRole === "LIBRARY_OWNER" || expectedRole === "STUDENT" ? expectedRole : null;
  const forgotPasswordHref = `/forgot-password?role=${expectedRole.toLowerCase()}`;

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
    <div className="grid gap-4">
      {googleRole ? (
        <>
          <GoogleOAuthButton role={googleRole} next={dashboardPathForRole(googleRole)} />
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <span className="h-px bg-slate-200" />
            <span>Email login</span>
            <span className="h-px bg-slate-200" />
          </div>
        </>
      ) : null}
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
      <div className="grid gap-1.5 text-sm font-semibold text-slate-700">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor={`${expectedRole}-password`}>{passwordLabel ?? "Password"}</label>
          <Link href={forgotPasswordHref} className="text-xs font-bold text-emerald-700 hover:text-emerald-800">
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <input
            id={`${expectedRole}-password`}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 pr-11 text-slate-950 outline-none transition focus:border-emerald-400 focus:bg-white"
            placeholder={passwordPlaceholder}
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
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
      {helperText ? <p className="text-sm leading-6 text-slate-500">{helperText}</p> : null}
      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
      {showSeedHint ? <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-6 text-slate-500">
        Seed login works only if API and database are running with demo seed data.
      </div> : null}
      <button
        disabled={submitting}
        className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
      >
        {submitting ? "Signing in..." : submitLabel}
      </button>
      </form>
    </div>
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
