"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch, saveSession } from "../lib/api";

export function StudentRegisterManager() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

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
          body: JSON.stringify({ fullName, email, phone, password }),
        },
        false,
      );
      saveSession(result.data);
      router.push("/student/dashboard");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Signup failed");
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 grid gap-4">
      <input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Full name" className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3" />
      <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3" />
      <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Phone" className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3" />
      <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Password" className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3" />
      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
      <p className="text-sm text-[var(--lp-muted)]">
        Create your student app account first, then send a join request to a library. Owner review and payment confirmation still happen before roster access and seat allotment.
      </p>
      <div className="flex flex-wrap gap-3">
        <button type="submit" className="rounded-2xl border border-[var(--lp-accent-soft)] bg-[var(--lp-accent-soft)] px-4 py-3 text-sm font-bold text-[var(--lp-accent-strong)]">
          Create student account
        </button>
        <Link href="/student/access" className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3 text-sm font-bold text-[var(--lp-primary)]">
          Find student portal
        </Link>
      </div>
    </form>
  );
}
