"use client";

import { MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import {
  emptyPublicSiteSettings,
  fetchPublicSiteSettings,
  type PublicSiteSettings,
  whatsappHref,
} from "../lib/public-site-settings";

type FloatingWhatsappProps = {
  settings?: PublicSiteSettings | null;
};

export function FloatingWhatsapp({ settings: providedSettings }: FloatingWhatsappProps) {
  const [settings, setSettings] = useState<PublicSiteSettings | null>(providedSettings ?? null);

  useEffect(() => {
    if (providedSettings) {
      setSettings(providedSettings);
      return;
    }
    fetchPublicSiteSettings()
      .then(setSettings)
      .catch(() => setSettings(emptyPublicSiteSettings));
  }, [providedSettings]);

  const active = settings ?? emptyPublicSiteSettings;
  if (!active.enableFloatingWhatsapp || !active.supportWhatsappNumber) return null;

  const href = whatsappHref(active.supportWhatsappNumber, active.supportWhatsappMessage);
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-5 right-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_18px_40px_rgba(16,185,129,0.35)] transition hover:-translate-y-0.5 hover:bg-emerald-400"
      aria-label="WhatsApp support"
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}
