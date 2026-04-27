"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
  }, [libraryKey]);

  const fallbackInitials = useMemo(
    () => (brand.library_name || titleCaseLibraryKey(libraryKey)).slice(0, 2).toUpperCase(),
    [brand.library_name, libraryKey],
  );

  return (
    <div className="rounded-[32px] border border-slate-200 bg-[#0F172A] p-6 text-white shadow-[0_30px_70px_rgba(15,23,42,0.12)] md:p-8">
      <div className="flex items-center gap-4">
        {brand.brand_logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={brand.brand_logo_url} alt={brand.library_name} className="h-14 w-14 rounded-[18px] object-cover" />
        ) : (
          <div className="grid h-14 w-14 place-items-center rounded-[18px] bg-white text-lg font-black text-[#0F172A]">
            {fallbackInitials}
          </div>
        )}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-300">Student Portal</p>
          <h1 className="mt-1 text-xl font-bold tracking-tight">{brand.library_name}</h1>
        </div>
      </div>

      <h2 className="mt-6 max-w-3xl text-[clamp(2.1rem,4vw,4.1rem)] font-bold leading-[0.95] tracking-[-0.05em]">
        {brand.hero_title}
      </h2>
      <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 md:text-[15px]">
        {brand.hero_tagline}
      </p>

      {showLibraryLink ? (
        <div className="mt-8 rounded-[28px] border border-white/10 bg-white/5 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300">What students get</p>
          <h3 className="mt-3 text-2xl font-bold tracking-tight">{brand.offer_text}</h3>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[
              "Secure login for portal access",
              "QR, dues, notices, and seat status",
              "Daily study continuity",
            ].map((point, index) => (
              <div key={point} className="rounded-[22px] border border-white/10 bg-[#111C33] p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-300">0{index + 1}</p>
                <p className="mt-2 text-sm leading-6 text-slate-200">{point}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        {showLibraryLink ? (
          <Link
            href={`/library-site?slug=${brand.subdomain || libraryKey}`}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            View library site
          </Link>
        ) : null}
        <Link
          href={showLibraryLink ? "/marketplace" : "/student/access"}
          className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/15"
        >
          {showLibraryLink ? "Browse marketplace" : "Find library"}
        </Link>
      </div>
    </div>
  );
}
