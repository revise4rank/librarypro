"use client";

import { MessageCircle } from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  emptyPublicSiteSettings,
  fetchPublicSiteSettings,
  type PublicSiteSettings,
  whatsappHref,
} from "../lib/public-site-settings";

type BookDemoCtaProps = {
  className?: string;
  children?: React.ReactNode;
};

export function BookDemoCta({ className, children }: BookDemoCtaProps) {
  const [settings, setSettings] = useState<PublicSiteSettings>(emptyPublicSiteSettings);

  useEffect(() => {
    fetchPublicSiteSettings().then(setSettings).catch(() => setSettings(emptyPublicSiteSettings));
  }, []);

  const href = useMemo(
    () => whatsappHref(settings.demoWhatsappNumber || settings.supportWhatsappNumber, settings.demoWhatsappMessage),
    [settings.demoWhatsappMessage, settings.demoWhatsappNumber, settings.supportWhatsappNumber],
  );

  if (!settings.enableBookDemoCta) return null;

  const content = children ?? (
    <>
      <MessageCircle className="h-5 w-5" />
      Book Demo
    </>
  );

  if (!href) {
    return (
      <span
        className={className}
        aria-disabled="true"
        title="Set Book Demo WhatsApp number in Superadmin integrations."
      >
        {content}
      </span>
    );
  }

  return (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      {content}
    </a>
  );
}
