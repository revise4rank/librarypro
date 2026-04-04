"use client";

import { useState } from "react";
import { API_URL } from "../lib/api";

function toWhatsappHref(phone: string) {
  const normalized = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${normalized}`;
}

export function ContactActions({
  slugOrSubdomain,
  phone,
  whatsappPhone,
  sourcePage,
  className = "",
}: {
  slugOrSubdomain: string;
  phone?: string | null;
  whatsappPhone?: string | null;
  sourcePage: "MARKETPLACE" | "LIBRARY_SITE";
  className?: string;
}) {
  const [status, setStatus] = useState<string | null>(null);

  async function trackLead(channel: "CALL" | "WHATSAPP") {
    try {
      await fetch(`${API_URL}/public/libraries/${encodeURIComponent(slugOrSubdomain)}/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel,
          sourcePage,
          metadata: {
            userAgent: typeof window !== "undefined" ? window.navigator.userAgent : null,
            path: typeof window !== "undefined" ? window.location.pathname : null,
          },
        }),
      });
      setStatus(`${channel === "CALL" ? "Call" : "WhatsApp"} intent captured.`);
    } catch {
      setStatus("Contact tracking skipped because API is unavailable.");
    }
  }

  return (
    <div className={`grid gap-3 ${className}`}>
      <div className="flex flex-wrap gap-3">
        {phone ? (
          <a
            href={`tel:${phone}`}
            onClick={() => void trackLead("CALL")}
            className="rounded-full border border-emerald-300 bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-700"
          >
            Call
          </a>
        ) : null}
        {whatsappPhone ? (
          <a
            href={toWhatsappHref(whatsappPhone)}
            target="_blank"
            rel="noreferrer"
            onClick={() => void trackLead("WHATSAPP")}
            className="rounded-full border border-green-300 bg-green-50 px-5 py-3 text-sm font-bold text-green-700"
          >
            WhatsApp
          </a>
        ) : null}
      </div>
      {status ? <p className="text-xs font-semibold text-slate-500">{status}</p> : null}
    </div>
  );
}
