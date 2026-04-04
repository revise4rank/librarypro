import Link from "next/link";

const useCases = [
  {
    title: "Marketplace-led admissions",
    text: "Students search by city, area, price, amenities, distance, and live seat visibility before they contact the library.",
  },
  {
    title: "Premium subdomain website",
    text: "Every premium library gets its own public multipage website where branding, offers, gallery, student login, QR entry, and notices live.",
  },
  {
    title: "Owner operating workspace",
    text: "Owners control seats, student allotment, payments, check-ins, reminders, expenses, and analytics from one organized workspace.",
  },
  {
    title: "Student self-service flow",
    text: "Students log in on their library website, open QR, track fees, view notices, and monitor regular study progress.",
  },
];

const productBlocks = [
  "Seat creation, batch section setup, and live occupancy grid",
  "Student enrolment with ID, password, validity, and due tracking",
  "QR entry register with today check-ins, inside now, and overstay watch",
  "Marketplace listing, library microsite, and direct contact actions",
  "Payments, expenses, reminders, notifications, and owner analytics",
  "Platform billing, premium plan upgrades, and subdomain management",
];

const featureTiles = [
  { title: "RedBus-style seat selection", note: "Visual seat tiles with free, reserved, occupied, and disabled states." },
  { title: "One library, one website", note: "Owner branding, logo, offers, gallery, location, and student portal on the same subdomain." },
  { title: "Operator-first dashboard", note: "Quick actions stay visible so owners can create seats, allot students, and monitor dues faster." },
  { title: "Student focus tracking", note: "Regular study days, streak, and QR-based attendance visibility for every enrolled student." },
];

const proofStats = [
  { value: "Live", label: "seat and check-in sync foundation" },
  { value: "Multi-tenant", label: "library websites + dashboard architecture" },
  { value: "Real API", label: "marketplace, owner, student, and admin modules" },
  { value: "Premium", label: "subdomain website + dashboard model" },
];

const landingLinks = [
  {
    title: "Explore live marketplace",
    text: "Search and compare published library listings with real API-backed cards.",
    href: "/marketplace",
    cta: "Open marketplace",
  },
  {
    title: "See a live library website",
    text: "Open a premium library detail page with pricing, about, contact, and subdomain flow.",
                href: "/libraries/focus-library",
    cta: "View library details",
  },
  {
    title: "Open owner website builder",
    text: "Control logo, offers, gallery, contact blocks, and the premium library website from dashboard.",
    href: "/owner/website",
    cta: "Open website builder",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fbf6ee_0%,#fffaf3_46%,#f4ede0_100%)] text-[var(--lp-text)]">
      <section className="border-b border-[var(--lp-border)] bg-[rgba(255,248,238,0.92)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1540px] items-center justify-between gap-4 px-4 py-4 md:px-8">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-[1.35rem] bg-[linear-gradient(135deg,#df8757,#2f8f88)] text-lg font-black text-white shadow-[0_14px_30px_rgba(111,95,74,0.16)]">
              LP
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[var(--lp-accent)]">LibraryPro</p>
              <h1 className="mt-1 text-lg font-bold tracking-tight md:text-2xl">Library Management SaaS + Marketplace</h1>
            </div>
          </div>

          <nav className="hidden items-center gap-7 text-sm font-medium text-[var(--lp-muted)] lg:flex">
            <a href="#use-cases" className="transition hover:text-[var(--lp-text)]">Use Cases</a>
            <a href="#features" className="transition hover:text-[var(--lp-text)]">Features</a>
            <a href="#marketplace-preview" className="transition hover:text-[var(--lp-text)]">Marketplace</a>
            <Link href="/owner/login" className="transition hover:text-[var(--lp-text)]">Owner Login</Link>
          </nav>

          <div className="flex flex-wrap gap-3">
            <Link href="/marketplace" className="rounded-full border border-[var(--lp-border)] bg-[var(--lp-surface)] px-5 py-2.5 text-sm font-semibold text-[var(--lp-primary)]">
              Browse libraries
            </Link>
            <Link href="/owner/login" className="rounded-full bg-[var(--lp-primary)] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(210,114,61,0.18)]">
              Start Owner Panel
            </Link>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-80">
          <div className="absolute left-[6%] top-20 h-52 w-52 rounded-full bg-[rgba(223,135,87,0.18)] blur-3xl" />
          <div className="absolute right-[8%] top-24 h-56 w-56 rounded-full bg-[rgba(47,143,136,0.14)] blur-3xl" />
          <div className="absolute bottom-10 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[rgba(255,214,171,0.18)] blur-3xl" />
        </div>

        <div className="relative mx-auto grid w-full max-w-[1540px] gap-10 px-4 py-10 md:px-8 md:py-16 xl:grid-cols-[1.05fr_0.95fr] xl:items-center xl:py-20">
          <div className="animate-fade-up">
            <div className="inline-flex rounded-full bg-[#f8eadf] px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--lp-primary)]">
              Built for libraries that want marketplace growth + daily control
            </div>
            <h2 className="mt-6 max-w-5xl text-5xl font-black leading-[0.96] tracking-tight md:text-7xl xl:text-[5.55rem]">
              Run your library, sell seats online, and manage every student from one modern system.
            </h2>
            <p className="mt-7 max-w-3xl text-base leading-8 text-[var(--lp-muted)] md:text-lg">
              LibraryPro combines a public library marketplace with premium owner websites, seat management, QR check-in,
              student login, billing, reminders, and analytics. Students discover libraries on the main website. Premium libraries
              run admissions and daily operations on their own branded subdomain.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/marketplace" className="rounded-full bg-[var(--lp-primary)] px-7 py-4 text-sm font-semibold text-white shadow-[0_18px_38px_rgba(210,114,61,0.18)]">
                Explore Marketplace
              </Link>
              <Link href="/owner/login" className="rounded-full border border-[var(--lp-border)] bg-[var(--lp-surface)] px-7 py-4 text-sm font-semibold text-[var(--lp-primary)]">
                Open Owner Workspace
              </Link>
              <Link href="/student/login?library=focuslibrary" className="rounded-full border border-[var(--lp-border)] bg-white px-7 py-4 text-sm font-semibold text-[var(--lp-text)]">
                Student Portal Preview
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {[
                "Marketplace discovery ready",
                "QR attendance foundation",
                "Subdomain library website",
                "Seat + student operations",
              ].map((item) => (
                <span key={item} className="rounded-full border border-[var(--lp-border)] bg-[rgba(255,255,255,0.84)] px-4 py-2 text-sm font-medium text-[var(--lp-muted)]">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="animate-fade-up-delay grid gap-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-[2.1rem] border border-[var(--lp-border)] bg-[rgba(255,251,245,0.92)] p-6 shadow-[0_18px_46px_rgba(111,95,74,0.08)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--lp-accent)]">Owner command view</p>
                <h3 className="mt-3 text-3xl font-black leading-tight">Create floors, sections, seats, and allot students visually.</h3>
                <div className="mt-5 grid gap-3">
                  {["Floor -> Section -> Seat count", "Seat drawer with reserve/block/free", "Allotment with due and validity"].map((point) => (
                    <div key={point} className="rounded-[1.2rem] bg-[#fff6ec] px-4 py-3 text-sm font-semibold text-[var(--lp-text)]">
                      {point}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[2.1rem] border border-[var(--lp-border)] bg-[rgba(248,252,248,0.92)] p-6 shadow-[0_18px_46px_rgba(111,95,74,0.08)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--lp-accent)]">Student workspace</p>
                <h3 className="mt-3 text-3xl font-black leading-tight">Login from the library website and continue QR, fees, notices, and study progress.</h3>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-[1.2rem] bg-white px-4 py-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--lp-accent)]">Current streak</p>
                    <p className="mt-2 text-2xl font-black">12 days</p>
                  </div>
                  <div className="rounded-[1.2rem] bg-white px-4 py-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--lp-accent)]">Next due</p>
                    <p className="mt-2 text-2xl font-black">28 Apr</p>
                  </div>
                  <div className="col-span-2 rounded-[1.2rem] bg-white px-4 py-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--lp-accent)]">Student login branding</p>
                    <p className="mt-2 text-sm font-semibold leading-7 text-[var(--lp-muted)]">Owner can set logo, offer banner, gallery, amenities, and notices on the same subdomain website.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[2.1rem] border border-[var(--lp-border)] bg-[linear-gradient(135deg,rgba(255,244,233,0.92),rgba(228,241,229,0.92),rgba(223,241,238,0.92))] p-6 shadow-[0_20px_48px_rgba(111,95,74,0.08)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--lp-accent)]">Product stack</p>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {productBlocks.map((item) => (
                  <div key={item} className="rounded-[1.2rem] border border-[rgba(255,255,255,0.72)] bg-[rgba(255,255,255,0.66)] px-4 py-4 text-sm font-semibold leading-7 text-[var(--lp-text)]">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="use-cases" className="mx-auto w-full max-w-[1540px] px-4 pb-6 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--lp-accent)]">Detailed use cases</p>
            <h3 className="mt-2 text-3xl font-black md:text-4xl">Built for the whole library lifecycle</h3>
          </div>
          <div className="rounded-full border border-[var(--lp-border)] bg-[var(--lp-surface)] px-4 py-2 text-sm font-semibold text-[var(--lp-primary)]">
            Marketplace + subdomain + dashboard
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-4">
          {useCases.map((item, index) => (
            <article key={item.title} className="animate-fade-up rounded-[2rem] border border-[var(--lp-border)] bg-[rgba(255,251,245,0.95)] p-7 shadow-[0_16px_38px_rgba(111,95,74,0.08)]" style={{ animationDelay: `${index * 80}ms` }}>
              <div className="inline-flex rounded-full bg-[#f8eadf] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--lp-primary)]">
                0{index + 1}
              </div>
              <h4 className="mt-4 text-2xl font-black">{item.title}</h4>
              <p className="mt-4 text-sm leading-8 text-[var(--lp-muted)]">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto w-full max-w-[1540px] px-4 py-8 md:px-8 md:py-12">
        <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
          <div className="rounded-[2.4rem] border border-[var(--lp-border)] bg-[rgba(255,249,241,0.95)] p-8 shadow-[0_18px_46px_rgba(111,95,74,0.08)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--lp-accent)]">Why it feels like a serious SaaS</p>
            <h3 className="mt-4 text-4xl font-black leading-tight">Not just a listing site. Not just a dashboard.</h3>
            <p className="mt-5 text-base leading-8 text-[var(--lp-muted)]">
              LibraryPro connects public discovery, premium branded subdomain websites, owner operations, and student actions into one product. That means the owner does not maintain separate tools for listing, seat mapping, attendance, reminders, and admissions.
            </p>
            <div className="mt-8 grid gap-4">
              {proofStats.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-[1.35rem] border border-[var(--lp-border)] bg-white px-4 py-4">
                  <span className="text-sm font-medium text-[var(--lp-muted)]">{item.label}</span>
                  <span className="text-2xl font-black text-[var(--lp-text)]">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {featureTiles.map((item, index) => (
              <article key={item.title} className="animate-fade-up rounded-[2rem] border border-[var(--lp-border)] bg-[linear-gradient(180deg,rgba(255,251,245,0.98),rgba(247,252,248,0.96))] p-7 shadow-[0_16px_38px_rgba(111,95,74,0.08)]" style={{ animationDelay: `${index * 90}ms` }}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[var(--lp-accent)]">Feature</p>
                <h4 className="mt-4 text-3xl font-black leading-tight">{item.title}</h4>
                <p className="mt-4 text-sm leading-8 text-[var(--lp-muted)]">{item.note}</p>
                <div className="mt-6 h-2 w-full rounded-full bg-[#ecf3ee]">
                  <div className="h-2 rounded-full bg-[linear-gradient(90deg,#df8757,#2f8f88)]" style={{ width: `${72 + index * 6}%` }} />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="marketplace-preview" className="mx-auto w-full max-w-[1540px] px-4 pb-16 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--lp-accent)]">Marketplace preview</p>
            <h3 className="mt-2 text-3xl font-black md:text-4xl">Open the real product paths from here</h3>
          </div>
          <Link href="/marketplace" className="rounded-full bg-[var(--lp-primary)] px-5 py-3 text-sm font-semibold text-white">
            Open Full Marketplace
          </Link>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          {landingLinks.map((item, index) => (
            <article key={item.title} className="animate-fade-up overflow-hidden rounded-[2rem] border border-[var(--lp-border)] bg-[rgba(255,251,245,0.96)] shadow-[0_18px_44px_rgba(111,95,74,0.08)]" style={{ animationDelay: `${index * 100}ms` }}>
              <div className="bg-[linear-gradient(135deg,#f7e6d8,#fff7ee_45%,#dff0e7)] p-6">
                <span className="rounded-full bg-[rgba(255,255,255,0.78)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--lp-primary)]">
                  Live product route
                </span>
                <h4 className="mt-5 text-3xl font-black">{item.title}</h4>
                <p className="mt-3 text-sm leading-7 text-[var(--lp-muted)]">{item.text}</p>
              </div>

              <div className="p-6">
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    "Real route",
                    "No injected preview data",
                    "Ready for QA",
                  ].map((chip) => (
                    <div key={chip} className="rounded-[1.25rem] bg-[#f4faf5] p-4 text-center text-sm font-semibold text-[var(--lp-primary)]">
                      {chip}
                    </div>
                  ))}
                </div>

                <div className="mt-6 grid gap-3">
                  <Link href={item.href} className="rounded-[1.2rem] bg-[var(--lp-primary)] px-4 py-3 text-center text-sm font-semibold text-white">
                    {item.cta}
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
