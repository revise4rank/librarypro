"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { Surface } from "./shell";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
    };
  }
}

type BillingResponse = {
  success: boolean;
  data: {
    subscription: {
      id: string | null;
      plan_code: string | null;
      plan_name: string | null;
      amount: string | null;
      currency: string | null;
      status: string | null;
      current_period_start: string | null;
      current_period_end: string | null;
      renews_at: string | null;
      grace_until: string | null;
      last_payment_at: string | null;
    } | null;
    recentPlatformPayments: Array<{
      id: string;
      amount: string;
      currency: string;
      status: string;
      razorpay_order_id: string | null;
      razorpay_payment_id: string | null;
      created_at: string;
    }>;
  };
};

type RenewResponse = {
  success: boolean;
  data: {
    subscriptionId: string;
    paymentId: string;
    razorpayOrderId: string;
    plan: {
      code: string;
      name: string;
      amount: number;
      currency: string;
    };
    checkout: {
      keyId: string;
      amount: number;
      currency: string;
      description: string;
      name: string;
      theme: {
        color: string;
      };
      redirectUrl: string;
      notes: Record<string, string>;
    };
  };
};

export function OwnerBillingManager() {
  const [data, setData] = useState<BillingResponse["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [renewing, setRenewing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"STARTER_499" | "GROWTH_999">("GROWTH_999");

  useEffect(() => {
    if (typeof window === "undefined" || window.Razorpay) {
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  async function loadBilling() {
    setLoading(true);
    try {
      const response = await apiFetch<BillingResponse>("/billing/subscription");
      setData(response.data);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load billing state.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBilling();
  }, []);

  async function startRenewal() {
    setRenewing(true);
    setMessage(null);
    setError(null);
    try {
      const response = await apiFetch<RenewResponse>("/billing/subscription/renew", {
        method: "POST",
        body: JSON.stringify({ planCode: selectedPlan }),
      });

      if (typeof window !== "undefined" && window.Razorpay && response.data.checkout.keyId) {
        const razorpay = new window.Razorpay({
          key: response.data.checkout.keyId,
          order_id: response.data.razorpayOrderId,
          amount: response.data.checkout.amount,
          currency: response.data.checkout.currency,
          name: response.data.checkout.name,
          description: response.data.checkout.description,
          notes: response.data.checkout.notes,
          theme: response.data.checkout.theme,
          redirect: true,
          callback_url: response.data.checkout.redirectUrl,
        });
        razorpay.open();
        setMessage(`Checkout opened for ${response.data.plan.name}.`);
      } else {
        setMessage(
          `Renewal order created. Order ${response.data.razorpayOrderId} is pending for ${response.data.plan.name}. Complete payment capture through Razorpay/webhook to activate.`,
        );
      }

      await loadBilling();
    } catch (renewError) {
      setError(renewError instanceof Error ? renewError.message : "Unable to start renewal.");
    } finally {
      setRenewing(false);
    }
  }

  if (loading && !data) {
    return <p className="text-sm text-slate-500">{error ?? "Loading billing workspace..."}</p>;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      {error ? <p className="xl:col-span-2 text-sm font-semibold text-rose-600">{error}</p> : null}
      {message ? <p className="xl:col-span-2 text-sm font-semibold text-emerald-700">{message}</p> : null}

      <Surface title="Current subscription" subtitle="Owner access is enforced from this subscription state">
        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.5rem] bg-[#fff7ef] p-5">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--lp-accent)]">Plan</p>
              <p className="mt-3 text-2xl font-black text-slate-950">{data?.subscription?.plan_name ?? "No active plan"}</p>
            </div>
            <div className="rounded-[1.5rem] bg-[#edf7ef] p-5">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--lp-accent)]">Status</p>
              <p className="mt-3 text-2xl font-black text-slate-950">{data?.subscription?.status ?? "INACTIVE"}</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.5rem] bg-white p-5">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Amount</p>
              <p className="mt-3 text-xl font-black text-slate-950">
                {data?.subscription?.amount ? `Rs. ${data.subscription.amount}` : "-"}
              </p>
            </div>
            <div className="rounded-[1.5rem] bg-white p-5">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Renews / Ends</p>
              <p className="mt-3 text-sm font-black text-slate-950">
                {data?.subscription?.renews_at ?? data?.subscription?.current_period_end ?? "-"}
              </p>
            </div>
            <div className="rounded-[1.5rem] bg-white p-5">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Grace till</p>
              <p className="mt-3 text-sm font-black text-slate-950">{data?.subscription?.grace_until ?? "-"}</p>
            </div>
          </div>
        </div>
      </Surface>

      <Surface title="Renew plan" subtitle="Create a pending platform renewal order for this library">
        <div className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setSelectedPlan("STARTER_499")}
              className={`rounded-[1.5rem] border px-4 py-4 text-left ${selectedPlan === "STARTER_499" ? "border-[var(--lp-primary)] bg-[#fff1e5]" : "border-[var(--lp-border)] bg-white"}`}
            >
              <p className="text-lg font-black text-slate-950">Starter 499</p>
              <p className="mt-2 text-sm text-slate-600">Basic plan for smaller libraries.</p>
            </button>
            <button
              type="button"
              onClick={() => setSelectedPlan("GROWTH_999")}
              className={`rounded-[1.5rem] border px-4 py-4 text-left ${selectedPlan === "GROWTH_999" ? "border-[var(--lp-primary)] bg-[#fff1e5]" : "border-[var(--lp-border)] bg-white"}`}
            >
              <p className="text-lg font-black text-slate-950">Growth 999</p>
              <p className="mt-2 text-sm text-slate-600">Marketplace + website + QR + operations.</p>
            </button>
          </div>
          <button
            type="button"
            onClick={() => void startRenewal()}
            disabled={renewing}
            className="rounded-[1.5rem] bg-[var(--lp-primary)] px-5 py-4 text-sm font-bold text-white disabled:opacity-60"
          >
            {renewing ? "Creating renewal order..." : "Create renewal order"}
          </button>
          <p className="text-sm leading-7 text-slate-600">
            This creates a pending platform payment row and renewal intent. If Razorpay key is configured, checkout opens immediately. Final activation happens when Razorpay sends a successful capture/subscription webhook.
          </p>
        </div>
      </Surface>

      <Surface title="Recent platform payments" subtitle="Latest renewal orders and capture references">
        <div className="grid gap-3">
          {(data?.recentPlatformPayments ?? []).map((payment) => (
            <article key={payment.id} className="rounded-[1.25rem] border border-[var(--lp-border)] bg-white px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-black text-slate-950">Rs. {payment.amount} {payment.currency}</p>
                <span className="rounded-full bg-[#edf7ef] px-3 py-2 text-xs font-black text-[var(--lp-primary)]">{payment.status}</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">Order: {payment.razorpay_order_id ?? "-"}</p>
              <p className="text-sm text-slate-600">Payment: {payment.razorpay_payment_id ?? "-"}</p>
              <p className="text-xs text-slate-400">{payment.created_at}</p>
            </article>
          ))}
          {data?.recentPlatformPayments?.length === 0 ? (
            <p className="text-sm text-slate-500">No platform renewal payments created yet.</p>
          ) : null}
        </div>
      </Surface>
    </div>
  );
}
