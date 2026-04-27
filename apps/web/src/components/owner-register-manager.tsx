"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch, saveSession } from "../lib/api";

export function OwnerRegisterManager() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [libraryName, setLibraryName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const result = await apiFetch<{
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
      }>(
        "/auth/owner/register",
        {
          method: "POST",
          body: JSON.stringify({ fullName, libraryName, email, phone, city, password }),
        },
        false,
      );

      saveSession(result.data);
      router.push("/owner/settings");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create library account");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Owner full name"
          className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3"
        />
        <input
          value={libraryName}
          onChange={(event) => setLibraryName(event.target.value)}
          placeholder="Library name"
          className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3"
        />
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="Phone"
          className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={city}
          onChange={(event) => setCity(event.target.value)}
          placeholder="City (optional)"
          className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3"
        />
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          placeholder="Create password"
          className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3"
        />
      </div>

      <p className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
        After signup, you will land in Settings to finish library profile, plans, coupons, QR, and marketplace setup.
      </p>

      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-2xl border border-[var(--lp-accent-soft)] bg-[var(--lp-accent-soft)] px-4 py-3 text-sm font-bold text-[var(--lp-accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Creating..." : "Create library account"}
        </button>
        <Link href="/owner/login" className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3 text-sm font-bold text-[var(--lp-primary)]">
          I already have access
        </Link>
      </div>
    </form>
  );
}
