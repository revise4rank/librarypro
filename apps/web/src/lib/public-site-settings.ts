"use client";

import { apiFetch } from "./api";

export type PublicSiteSettings = {
  supportWhatsappNumber: string;
  demoWhatsappNumber: string;
  supportWhatsappMessage: string;
  demoWhatsappMessage: string;
  enableFloatingWhatsapp: boolean;
  enableBookDemoCta: boolean;
};

export const emptyPublicSiteSettings: PublicSiteSettings = {
  supportWhatsappNumber: "",
  demoWhatsappNumber: "",
  supportWhatsappMessage: "Hi BookLib, I need support.",
  demoWhatsappMessage: "Hi BookLib, I want a demo for my library.",
  enableFloatingWhatsapp: true,
  enableBookDemoCta: true,
};

export function whatsappHref(phone: string, message: string) {
  const normalized = phone.replace(/[^\d]/g, "");
  if (!normalized) return "";
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export async function fetchPublicSiteSettings() {
  const response = await apiFetch<{ success: boolean; data: PublicSiteSettings }>("/public/site-settings", undefined, false);
  return response.data;
}
