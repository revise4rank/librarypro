"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch, saveSession } from "../lib/api";
import { GoogleOAuthButton } from "./owner-login-form";

export function StudentRegisterManager() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("ref");
    if (code) setReferralCode(code);
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      const result = await apiFetch<{
        success: boolean;
        data: {
          csrfToken?: string;
          user: {
            id: string;
            fullName: string;
            studentCode?: string | null;
            email?: string | null;
            phone?: string | null;
            role: string;
            libraryIds: string[];
          };
        };
      }>(
        "/auth/student/register",
        {
          method: "POST",
          body: JSON.stringify({ fullName, dateOfBirth, gender, email, phone, password, referralCode }),
        },
        false,
      );
      saveSession(result.data);
      router.push("/student/scanner");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Signup failed");
    }
  }

  return (
    <div className="mt-8 grid gap-4">
      <GoogleOAuthButton role="STUDENT" next="/student/scanner" />
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <span className="h-px bg-slate-200" />
        <span>Create with email</span>
        <span className="h-px bg-slate-200" />
      </div>
      <form onSubmit={onSubmit} className="grid gap-4">
      <input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Full name" className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3" />
      <div className="grid gap-3 sm:grid-cols-2">
        <input type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} aria-label="Date of birth" className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3" />
        <select value={gender} onChange={(event) => setGender(event.target.value)} className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3">
          <option value="">Gender optional</option>
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
          <option value="OTHER">Other</option>
          <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
        </select>
      </div>
      <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3" />
      <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Phone" className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3" />
      <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Password" className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3" />
      <input value={referralCode} onChange={(event) => setReferralCode(event.target.value)} placeholder="Referral code (optional)" className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3" />
      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
      <p className="text-sm text-[var(--lp-muted)]">
        Create your student app account first, then search a library, scan QR, or send a join request. Owner review and payment confirmation still happen before roster access and seat allotment.
      </p>
      <div className="flex flex-wrap gap-3">
        <button type="submit" className="rounded-2xl border border-[var(--lp-accent-soft)] bg-[var(--lp-accent-soft)] px-4 py-3 text-sm font-bold text-[var(--lp-accent-strong)]">
          Create account and find library
        </button>
        <Link href="/student/access" className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3 text-sm font-bold text-[var(--lp-primary)]">
          Find student portal
        </Link>
      </div>
      </form>
    </div>
  );
}
