"use client";

import { apiFetch } from "./api";

export type LandingBanner = {
  eyebrow: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  ctaLabel: string;
  ctaHref: string;
  tone: "navy" | "steel" | "copper";
};

export type PublicSiteSettings = {
  supportWhatsappNumber: string;
  demoWhatsappNumber: string;
  supportWhatsappMessage: string;
  demoWhatsappMessage: string;
  enableFloatingWhatsapp: boolean;
  enableBookDemoCta: boolean;
  landingBanners: LandingBanner[];
};

export const defaultLandingBanners: LandingBanner[] = [
  {
    eyebrow: "Owner workspace",
    title: "Admissions, seats, dues, and QR attendance in one dashboard",
    subtitle: "Run your reading room without scattered registers. BookLib keeps daily operations clean, fast, and visible.",
    imageUrl: "",
    ctaLabel: "Start free trial",
    ctaHref: "/owner/register",
    tone: "navy",
  },
  {
    eyebrow: "Student portal",
    title: "Students scan, check in, pay dues, and keep their study flow clear",
    subtitle: "Give every student a simple portal for library access, alerts, study planner, syllabus tracker, and payments.",
    imageUrl: "",
    ctaLabel: "Explore libraries",
    ctaHref: "/marketplace",
    tone: "steel",
  },
  {
    eyebrow: "Library growth",
    title: "Publish offers, plans, gallery, and website pages that convert leads",
    subtitle: "BookLib connects your marketplace listing and subdomain website so students can discover and contact you faster.",
    imageUrl: "",
    ctaLabel: "Book demo",
    ctaHref: "/owner/register?demo=1",
    tone: "copper",
  },
];

export const emptyPublicSiteSettings: PublicSiteSettings = {
  supportWhatsappNumber: "",
  demoWhatsappNumber: "",
  supportWhatsappMessage: "Hi BookLib, I need support.",
  demoWhatsappMessage: "Hi BookLib, I want a demo for my library.",
  enableFloatingWhatsapp: true,
  enableBookDemoCta: true,
  landingBanners: defaultLandingBanners,
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
