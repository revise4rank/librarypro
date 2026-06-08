"use client";

import { ArrowRight, ChevronLeft, ChevronRight, LayoutDashboard, QrCode, ReceiptText, Users, WalletCards } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  defaultLandingBanners,
  emptyPublicSiteSettings,
  fetchPublicSiteSettings,
  type LandingBanner,
} from "../lib/public-site-settings";

const toneClasses: Record<LandingBanner["tone"], { shell: string; chip: string; button: string; glow: string }> = {
  navy: {
    shell: "from-[#07142f] via-[#0d2c50] to-[#5f7fa5]",
    chip: "border-white/20 bg-white/10 text-[#eef4fb]",
    button: "bg-white text-[#07142f] hover:bg-[#eef4fb]",
    glow: "bg-[#5f7fa5]/30",
  },
  steel: {
    shell: "from-[#153967] via-[#5f7fa5] to-[#c9d8ea]",
    chip: "border-white/30 bg-white/15 text-white",
    button: "bg-[#07142f] text-white hover:bg-[#153967]",
    glow: "bg-white/25",
  },
  copper: {
    shell: "from-[#07142f] via-[#6d3c2a] to-[#b45309]",
    chip: "border-white/25 bg-white/10 text-[#fff7ed]",
    button: "bg-[#fff7ed] text-[#7c2d12] hover:bg-white",
    glow: "bg-[#f59e0b]/30",
  },
};

function normalizeBanners(banners?: LandingBanner[]) {
  const clean = (banners ?? []).filter((banner) => banner.title?.trim()).slice(0, 6);
  return clean.length > 0 ? clean : defaultLandingBanners;
}

function Illustration({ tone }: { tone: LandingBanner["tone"] }) {
  const isCopper = tone === "copper";
  return (
    <div className="relative min-h-[230px] overflow-hidden rounded-lg border border-white/20 bg-white/12 p-4 shadow-2xl shadow-black/20 md:min-h-[300px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_20%,rgba(255,255,255,.24),transparent_32%),radial-gradient(circle_at_80%_70%,rgba(255,255,255,.16),transparent_30%)]" />
      <div className="relative rounded-lg bg-white/95 p-4 text-[#07142f] shadow-lg">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <p className="text-[10px] font-black uppercase text-[#5f7fa5]">BookLib live</p>
            <p className="text-sm font-black">Today operations</p>
          </div>
          <div className="flex gap-2">
            <span className="rounded-full bg-[#eef4fb] px-3 py-1 text-xs font-black text-[#153967]">QR</span>
            <span className="rounded-full bg-[#f6efe9] px-3 py-1 text-xs font-black text-[#9a4f2d]">Seats</span>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[0.8fr_1.2fr]">
          <div className="grid gap-2">
            {[
              ["Admissions", Users],
              ["Payments", WalletCards],
              ["Reports", ReceiptText],
            ].map(([label, Icon]) => (
              <div key={String(label)} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-[#f8fafc] px-3 py-2">
                <Icon className="h-4 w-4 text-[#5f7fa5]" />
                <span className="text-xs font-black">{String(label)}</span>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-[#c9d8ea] bg-[#eef4fb] p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-black text-[#153967]">Seat map</span>
              <LayoutDashboard className="h-4 w-4 text-[#5f7fa5]" />
            </div>
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 20 }).map((_, index) => (
                <span
                  key={index}
                  className={[
                    "h-8 rounded-md border shadow-sm",
                    index % 7 === 0
                      ? "border-[#f0b7b7] bg-[#fff1f2]"
                      : index % 4 === 0
                        ? "border-[#d8e2ee] bg-white"
                        : "border-[#b9eadb] bg-[#dcfce7]",
                  ].join(" ")}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="relative mt-4 grid grid-cols-3 gap-3 text-white">
        {[
          ["Live students", isCopper ? "86" : "128"],
          ["Free seats", "32"],
          ["Dues tracked", "Rs. 12k"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-white/20 bg-white/10 px-3 py-2">
            <p className="text-[10px] font-black uppercase text-white/65">{label}</p>
            <p className="mt-1 text-base font-black">{value}</p>
          </div>
        ))}
      </div>
      <div className="absolute bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-lg bg-white/95 text-[#07142f] shadow-lg">
        <QrCode className="h-6 w-6" />
      </div>
    </div>
  );
}

export function LandingBannerCarousel() {
  const [remoteBanners, setRemoteBanners] = useState<LandingBanner[]>(defaultLandingBanners);
  const [active, setActive] = useState(0);

  useEffect(() => {
    fetchPublicSiteSettings()
      .then((settings) => setRemoteBanners(normalizeBanners(settings.landingBanners)))
      .catch(() => setRemoteBanners(emptyPublicSiteSettings.landingBanners));
  }, []);

  const banners = useMemo(() => normalizeBanners(remoteBanners), [remoteBanners]);
  const current = banners[active] ?? banners[0];
  const tone = toneClasses[current.tone] ?? toneClasses.navy;

  useEffect(() => {
    if (banners.length < 2) return;
    const timer = window.setInterval(() => {
      setActive((index) => (index + 1) % banners.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [banners.length]);

  function move(delta: number) {
    setActive((index) => (index + delta + banners.length) % banners.length);
  }

  return (
    <section className="mx-auto w-full max-w-[1080px]">
      <div className="relative overflow-hidden rounded-lg border border-[#c9d8ea] bg-white shadow-2xl shadow-[#07142f]/12">
        <div
          className={`relative min-h-[420px] bg-gradient-to-br ${tone.shell} px-5 py-6 text-left text-white md:min-h-[440px] md:px-9 md:py-8`}
          style={
            current.imageUrl
              ? {
                  backgroundImage: `linear-gradient(90deg, rgba(7,20,47,.92), rgba(7,20,47,.58)), url("${current.imageUrl}")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        >
          <div className={`absolute -right-20 -top-20 h-60 w-60 rounded-full blur-3xl ${tone.glow}`} />
          <div className={`absolute -bottom-20 left-1/4 h-52 w-52 rounded-full blur-3xl ${tone.glow}`} />
          <div className="relative grid h-full gap-7 md:grid-cols-[0.92fr_1.08fr] md:items-center">
            <div className="max-w-xl">
              <span className={`inline-flex rounded-full border px-4 py-2 text-xs font-black uppercase ${tone.chip}`}>
                {current.eyebrow}
              </span>
              <h2 className="mt-6 text-[clamp(2rem,4.6vw,4rem)] font-black leading-[1.04] tracking-normal">
                {current.title}
              </h2>
              {current.subtitle ? <p className="mt-5 text-base leading-7 text-white/82 md:text-lg">{current.subtitle}</p> : null}
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href={current.ctaHref || "/owner/register"}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-5 text-sm font-black transition ${tone.button}`}
                >
                  {current.ctaLabel || "Learn more"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <span className="rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-xs font-bold text-white/80">
                  Auto sliding banner
                </span>
              </div>
            </div>
            <Illustration tone={current.tone} />
          </div>
        </div>

        {banners.length > 1 ? (
          <div className="absolute bottom-4 left-0 right-0 z-10 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => move(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/15 text-white backdrop-blur transition hover:bg-white/25"
              aria-label="Previous banner"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-2 backdrop-blur">
              {banners.map((banner, index) => (
                <button
                  key={`${banner.title}-${index}`}
                  type="button"
                  onClick={() => setActive(index)}
                  className={`h-2.5 rounded-full transition ${active === index ? "w-8 bg-white" : "w-2.5 bg-white/45"}`}
                  aria-label={`Show banner ${index + 1}`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => move(1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/15 text-white backdrop-blur transition hover:bg-white/25"
              aria-label="Next banner"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
