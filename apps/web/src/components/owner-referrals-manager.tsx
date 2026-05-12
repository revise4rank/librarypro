"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";
import { StatCard } from "./stat-card";

type ReferralDashboard = {
  referralCode: string;
  libraryName: string;
  summary: {
    total: number;
    qualified: number;
    paid: number;
  };
  referrals: Array<{
    id: string;
    referred_library_name: string;
    referred_library_city: string | null;
    plan_code: string | null;
    bonus_amount: string;
    status: string;
    created_at: string;
    qualified_at: string | null;
    paid_at: string | null;
  }>;
  referredBy: {
    referrer_library_name: string;
    status: string;
    bonus_amount: string;
  } | null;
};

export function OwnerReferralsManager() {
  const [data, setData] = useState<ReferralDashboard | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadReferrals() {
    try {
      const response = await apiFetch<{ success: boolean; data: ReferralDashboard }>("/owner/referrals");
      setData(response.data);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load referrals.");
    }
  }

  useEffect(() => {
    void loadReferrals();
  }, []);

  const referralLink = useMemo(() => {
    if (!data?.referralCode || typeof window === "undefined") return "";
    return `${window.location.origin}/owner/register?ref=${encodeURIComponent(data.referralCode)}`;
  }, [data?.referralCode]);

  function copyReferralCode() {
    if (!data?.referralCode) return;
    void navigator.clipboard?.writeText(data.referralCode);
    setMessage("Referral code copied.");
  }

  if (!data) return <p className="text-sm text-[var(--lp-muted)]">{error ?? "Loading referrals..."}</p>;

  return (
    <div className="grid gap-4">
      {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm font-semibold text-amber-700">{error}</p> : null}

      <section className="grid gap-3 md:grid-cols-3">
        <StatCard label="Total bonus" value={`Rs. ${data.summary.total}`} />
        <StatCard label="Qualified" value={`Rs. ${data.summary.qualified}`} />
        <StatCard label="Paid" value={`Rs. ${data.summary.paid}`} />
      </section>

      <DashboardCard title="Your referral code" subtitle="Share this with another library owner before they create their account.">
        <div className="grid gap-3">
          <div className="rounded-xl border border-[var(--lp-border)] bg-white p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--lp-muted)]">Code</p>
            <p className="mt-2 break-all text-2xl font-black text-[var(--lp-text)]">{data.referralCode}</p>
          </div>
          {referralLink ? <p className="break-all text-sm font-semibold text-[var(--lp-muted)]">{referralLink}</p> : null}
          <button type="button" onClick={copyReferralCode} className="w-fit rounded-lg border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] px-4 py-2 text-sm font-bold text-[var(--lp-accent)]">
            Copy code
          </button>
          {data.referredBy ? (
            <p className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
              This library was referred by {data.referredBy.referrer_library_name}. Status: {data.referredBy.status}.
            </p>
          ) : null}
        </div>
      </DashboardCard>

      <DashboardCard title="Referral ledger" subtitle="Bonus is qualified when referred library chooses a paid platform plan.">
        <div className="grid gap-3">
          {data.referrals.map((referral) => (
            <article key={referral.id} className="rounded-xl border border-[var(--lp-border)] bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-black text-[var(--lp-text)]">{referral.referred_library_name}</p>
                  <p className="mt-1 text-sm text-[var(--lp-muted)]">{referral.referred_library_city ?? "City not set"} | {referral.plan_code ?? "Trial"}</p>
                </div>
                <span className="rounded-full bg-[var(--lp-surface-muted)] px-3 py-1 text-xs font-black text-[var(--lp-muted)]">{referral.status}</span>
              </div>
              <p className="mt-2 text-sm font-bold text-[var(--lp-text)]">Bonus Rs. {Number(referral.bonus_amount).toLocaleString("en-IN")}</p>
            </article>
          ))}
          {data.referrals.length === 0 ? <p className="text-sm text-[var(--lp-muted)]">No referrals yet.</p> : null}
        </div>
      </DashboardCard>
    </div>
  );
}
