import Link from "next/link";

type PublicSiteHeaderProps = {
  ctaHref?: string;
  ctaLabel?: string;
  activeLabel?: string;
};

const navLinks = [
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Library Access", href: "/owner/login" },
  { label: "Student Login", href: "/student/login" },
];

export function PublicSiteHeader({
  ctaHref = "/owner/register",
  ctaLabel = "Start Free Trial",
  activeLabel,
}: PublicSiteHeaderProps) {
  const baseLinkClass = "rounded-lg px-2.5 py-1.5 text-xs font-semibold !text-white transition md:text-sm";
  const activeLinkClass = "bg-white/15 !text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)]";
  const inactiveLinkClass = "!text-white/90 hover:bg-white/10 hover:!text-white";

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[rgba(15,23,42,0.9)] backdrop-blur">
      <div className="mx-auto flex h-[50px] w-full max-w-[1120px] items-center justify-between gap-4 px-4">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-sm font-black text-[#0F172A]">
            LP
          </div>
          <p className="hidden truncate text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-300 sm:block">
            LibraryPro
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
              style={{ color: "#ffffff" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={ctaHref}
            className="inline-flex items-center justify-center rounded-xl bg-emerald-400 px-3 py-2 text-[11px] font-semibold text-[#0F172A] shadow-[0_10px_24px_rgba(16,185,129,0.28)] transition hover:bg-emerald-300 sm:px-4 sm:text-sm"
          >
            <span className="sm:hidden">Start</span>
            <span className="hidden sm:inline">{ctaLabel}</span>
          </Link>

          <details className="relative md:hidden">
            <summary className="flex h-9 list-none items-center justify-center rounded-xl border border-white/20 bg-white/10 px-3 text-xs font-semibold !text-white">
              Menu
            </summary>
            <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-56 rounded-2xl border border-white/10 bg-[#111C33] p-2 shadow-[0_18px_40px_rgba(15,23,42,0.28)]">
              <div className="grid gap-1">
                {navLinks.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={[
                      "rounded-xl px-3 py-2 text-sm font-medium",
                      activeLabel === item.label ? activeLinkClass : "text-white hover:bg-white/8",
                    ].join(" ")}
                    style={{ color: "#ffffff" }}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
