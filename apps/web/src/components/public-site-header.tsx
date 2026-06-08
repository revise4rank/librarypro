"use client";

import Image from "next/image";
import Link from "next/link";
import { BookDemoCta } from "./book-demo-cta";

type PublicSiteHeaderProps = {
  ctaHref?: string;
  ctaLabel?: string;
  activeLabel?: string;
  demoHref?: string;
  showDemo?: boolean;
};

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Blog", href: "/blog" },
  { label: "Library Access", href: "/owner/login" },
  { label: "Student Login", href: "/student/login" },
];

export function PublicSiteHeader({
  ctaHref = "/owner/register",
  ctaLabel = "Start Free Trial",
  activeLabel,
  demoHref,
  showDemo = true,
}: PublicSiteHeaderProps) {
  const baseLinkClass = "rounded-lg px-2.5 py-1.5 text-xs font-semibold transition md:text-sm";
  const activeLinkClass = "bg-[#eef4fb] !text-[#07142f] ring-1 ring-[#c9d8ea]";
  const inactiveLinkClass = "!text-[#263955] hover:bg-[#f3f7fb] hover:!text-[#07142f]";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex min-h-[72px] w-full max-w-[1200px] items-center justify-between gap-4 px-4">
        <Link href="/" className="flex min-w-0 items-center gap-3 text-[#07142f]">
          <Image
            src="/icons/booklib-mark.png"
            alt="BookLib"
            width={88}
            height={44}
            priority
            className="h-11 w-14 shrink-0 rounded-lg bg-white object-contain p-1 ring-1 ring-slate-200"
          />
          <p className="hidden truncate text-2xl font-bold text-[#07142f] sm:block">
            BookLib
          </p>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-2 text-center md:flex">
          {navLinks.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={[
                baseLinkClass,
                activeLabel === item.label ? activeLinkClass : inactiveLinkClass,
              ].join(" ")}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/marketplace"
            className="hidden items-center justify-center rounded-lg border border-[#c9d8ea] bg-white px-4 py-2 text-sm font-semibold !text-[#153967] transition hover:bg-[#f3f7fb] lg:inline-flex"
          >
            Explore Libraries
          </Link>

          {showDemo && demoHref ? (
            <a
              href={demoHref}
              target="_blank"
              rel="noreferrer"
              className="hidden items-center justify-center rounded-lg border border-[#c9d8ea] bg-white px-4 py-2 text-sm font-semibold !text-[#153967] transition hover:bg-[#f3f7fb] sm:inline-flex"
            >
              Book Demo
            </a>
          ) : showDemo ? (
            <BookDemoCta className="hidden items-center justify-center rounded-lg border border-[#c9d8ea] bg-white px-4 py-2 text-sm font-semibold !text-[#153967] transition hover:bg-[#f3f7fb] sm:inline-flex">
              Book Demo
            </BookDemoCta>
          ) : null}

          <Link
            href={ctaHref}
            className="inline-flex items-center justify-center rounded-lg bg-[#07142f] px-3 py-2 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#153967] sm:px-4 sm:text-sm"
          >
            <span className="sm:hidden">Start</span>
            <span className="hidden sm:inline">{ctaLabel}</span>
          </Link>

          <details className="relative md:hidden">
            <summary className="flex h-9 list-none items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold !text-slate-800">
              Menu
            </summary>
            <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-60 rounded-lg border border-slate-200 bg-white p-2 shadow-md">
              <div className="grid gap-1">
                {navLinks.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={[
                      "rounded-lg px-3 py-2 text-sm font-medium",
                      activeLabel === item.label ? activeLinkClass : "text-[#263955] hover:bg-[#f3f7fb]",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                ))}
                <Link
                  href="/marketplace"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-[#263955] hover:bg-[#f3f7fb]"
                >
                  Explore Libraries
                </Link>
                {showDemo && demoHref ? (
                  <a
                    href={demoHref}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg px-3 py-2 text-sm font-medium text-[#263955] hover:bg-[#f3f7fb]"
                  >
                    Book Demo
                  </a>
                ) : showDemo ? (
                  <BookDemoCta className="rounded-lg px-3 py-2 text-sm font-medium text-[#263955] hover:bg-[#f3f7fb]">
                    Book Demo
                  </BookDemoCta>
                ) : null}
              </div>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
