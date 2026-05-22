"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookOpenCheck, CheckCircle2, QrCode, WalletCards } from "lucide-react";

type BrandState = {
  library_name: string;
  subdomain: string;
  brand_logo_url: string | null;
  hero_title: string;
  hero_tagline: string | null;
  offer_text: string | null;
};

type StudentLoginBrandPanelProps = {
  libraryKey: string;
  initialBrand: BrandState;
  showLibraryLink?: boolean;
};

function titleCaseLibraryKey(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function StudentLoginBrandPanel({
  libraryKey,
  initialBrand,
  showLibraryLink = true,
}: StudentLoginBrandPanelProps) {
  const [brand, setBrand] = useState<BrandState>(initialBrand);

  useEffect(() => {
    if (!showLibraryLink || !libraryKey || libraryKey === "student-portal") {
      setBrand(initialBrand);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 2500);

    fetch(`/api-proxy/v1/public/libraries/${encodeURIComponent(libraryKey)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const json = (await response.json()) as { success: boolean; data: BrandState };
        return json.data;
      })
      .then((data) => {
        if (data) setBrand(data);
      })
      .catch(() => {})
      .finally(() => window.clearTimeout(timeoutId));

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [initialBrand, libraryKey, showLibraryLink]);

  const fallbackInitials = useMemo(
    () => (brand.library_name || titleCaseLibraryKey(libraryKey)).slice(0, 2).toUpperCase(),
    [brand.library_name, libraryKey],
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 text-slate-950 shadow-sm md:p-7">
      <div className="flex items-center gap-3">
        {brand.brand_logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={brand.brand_logo_url} alt={brand.library_name} className="h-12 w-12 rounded-lg object-cover" />
        ) : (
          <div className="grid h-12 w-12 place-items-center rounded-lg border border-emerald-100 bg-emerald-50 text-base font-black text-emerald-700">
            {fallbackInitials}
          </div>
        )}
        <div>
          <p className="text-xs font-bold text-emerald-700">Student portal</p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-950">{brand.library_name}</h1>
        </div>
      </div>

      <h2 className="mt-5 max-w-3xl text-[clamp(2rem,4.2vw,3.65rem)] font-bold leading-[1.06] text-slate-900">
        {brand.hero_title}
      </h2>
      <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
        {brand.hero_tagline}
      </p>

      <div className="mt-6 grid gap-3 rounded-lg border border-emerald-100 bg-emerald-50/70 p-4">
        <p className="text-sm font-bold text-emerald-800">Student portal includes</p>
        {[
          { label: "QR scanner for join, check-in, and checkout", icon: QrCode },
          { label: "Dues, payments, notices, and library alerts", icon: WalletCards },
          { label: "Study Zone, syllabus tracker, and study tools", icon: BookOpenCheck },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center gap-3 rounded-lg border border-emerald-100 bg-white p-3">
              <Icon className="h-5 w-5 shrink-0 text-emerald-600" />
              <p className="text-sm font-semibold leading-5 text-slate-700">{item.label}</p>
            </div>
          );
        })}
        {showLibraryLink && brand.offer_text ? (
          <div className="flex items-start gap-3 rounded-lg border border-emerald-100 bg-white p-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <p className="text-sm leading-6 text-slate-700">{brand.offer_text}</p>
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {showLibraryLink ? (
          <Link
            href={`/library-site?slug=${brand.subdomain || libraryKey}`}
            className="inline-flex rounded-lg border border-emerald-200 bg-white px-4 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-50"
          >
            View library site
          </Link>
        ) : null}
        {!showLibraryLink ? (
          <Link
            href="/student/access"
            className="inline-flex rounded-lg border border-emerald-200 bg-white px-4 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-50"
          >
            Find library
          </Link>
        ) : null}
      </div>
    </div>
  );
}
