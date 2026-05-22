"use client";

import { MessageCircle } from "lucide-react";
import { API_URL } from "../lib/api";

function whatsappHref(phone: string, message: string) {
  const normalized = phone.replace(/[^\d]/g, "");
  if (!normalized) return "";
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function PublicLibraryFloatingWhatsapp({
  slugOrSubdomain,
  libraryName,
  whatsappPhone,
  enabled,
}: {
  slugOrSubdomain: string;
  libraryName: string;
  whatsappPhone?: string | null;
  enabled?: boolean;
}) {
  if (!enabled || !whatsappPhone) return null;

  const message = `Hi, I want to know about ${libraryName} seats/plans.`;
  const href = whatsappHref(whatsappPhone, message);
  if (!href) return null;

  async function trackLead() {
    try {
      await fetch(`${API_URL}/public/libraries/${encodeURIComponent(slugOrSubdomain)}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "WHATSAPP",
          sourcePage: "LIBRARY_SITE",
          message,
          metadata: {
            source: "floating_whatsapp",
            userAgent: typeof window !== "undefined" ? window.navigator.userAgent : null,
            path: typeof window !== "undefined" ? window.location.pathname : null,
          },
        }),
      });
    } catch {
      // The click should still open WhatsApp if lead tracking is unavailable.
    }
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={() => void trackLead()}
      className="fixed bottom-20 right-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400 text-slate-950 shadow-[0_18px_40px_rgba(16,185,129,0.35)] transition hover:-translate-y-0.5 hover:bg-emerald-300 md:bottom-5"
      aria-label={`WhatsApp ${libraryName}`}
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}
