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
    <div className="rounded-[1rem] border border-slate-200 bg-[#0F172A] p-4 text-white shadow-[0_18px_42px_rgba(15,23,42,0.10)] md:p-5">
      <div className="flex items-center gap-3">
        {brand.brand_logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={brand.brand_logo_url} alt={brand.library_name} className="h-12 w-12 rounded-[0.75rem] object-cover" />
        ) : (
          <div className="grid h-12 w-12 place-items-center rounded-[0.75rem] bg-white text-base font-black text-[#0F172A]">
            {fallbackInitials}
          </div>
        )}
        <div>
          <p className="text-xs font-semibold text-emerald-300">Student portal</p>
          <h1 className="mt-1 text-xl font-bold tracking-tight">{brand.library_name}</h1>
        </div>
      </div>

      <h2 className="mt-4 max-w-3xl text-[clamp(1.8rem,4vw,3.2rem)] font-bold leading-[0.98] tracking-[-0.04em]">
        {brand.hero_title}
      </h2>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
        {brand.hero_tagline}
      </p>

      {showLibraryLink ? (
        <div className="mt-4 rounded-[1rem] border border-white/10 bg-white/5 p-3">
          <p className="text-xs font-semibold text-emerald-300">Portal includes</p>
          <p className="mt-2 text-sm leading-6 text-slate-200">{brand.offer_text}</p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {showLibraryLink ? (
          <Link
            href={`/library-site?slug=${brand.subdomain || libraryKey}`}
            className="lp-button border-white/10 bg-white/5 text-white hover:bg-white/10"
          >
            View library site
          </Link>
        ) : null}
        <Link
          href={showLibraryLink ? "/marketplace" : "/student/access"}
          className="lp-button border-emerald-400/20 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15"
        >
          {showLibraryLink ? "Browse marketplace" : "Find library"}
        </Link>
      </div>
    </div>
  );
}
