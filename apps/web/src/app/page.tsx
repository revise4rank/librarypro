"use client";

import {
  ArrowRight,
  BookOpenCheck,
  BriefcaseBusiness,
  Compass,
  LayoutDashboard,
  Mail,
  MapPin,
  Sparkles,
  Store,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { PublicSiteHeader } from "../components/public-site-header";

const proofStats = [
  { value: "1,200+", label: "libraries onboarded" },
  { value: "48k+", label: "students active" },
  { value: "10 min", label: "average setup time" },
  { value: "4.8/5", label: "operator satisfaction" },
];

const accessCards = [
  {
    title: "Library Access",
    text: "Create your library account or open the owner workspace to manage setup, admissions, roster, seats, and dues.",
    href: "/owner/register",
    icon: BriefcaseBusiness,
  },
  {
    title: "Student Portal",
    text: "Students log in for QR access, dues, notices, and daily self-service actions.",
    href: "/student/access",
    icon: Users,
  },
  {
    title: "Marketplace",
    text: "Make your library discoverable and let students compare, shortlist, and enquire.",
    href: "/marketplace",
    icon: Store,
  },
];

const journeySteps = [
  {
    title: "Onboard",
    text: "Create plans, configure coupons, and admit students into the roster through one clean onboarding desk.",
    icon: BriefcaseBusiness,
    accent: "from-emerald-400/30 to-cyan-400/10",
  },
  {
    title: "Seat Map",
    text: "Keep floors and occupancy visible, then allot seats later only for students who are still unallotted.",
    icon: LayoutDashboard,
    accent: "from-indigo-400/30 to-cyan-400/10",
  },
  {
    title: "Marketplace",
    text: "Publish your listing and library page so students can discover and compare you online.",
    icon: Compass,
    accent: "from-sky-400/30 to-emerald-400/10",
  },
  {
    title: "Growth",
    text: "Keep students engaged with notices, QR access, dues clarity, and continuity tools.",
    icon: Sparkles,
    accent: "from-violet-400/30 to-indigo-400/10",
  },
];

const benefitCards = [
  {
    title: "Calmer library operations",
    text: "Replace scattered admin work with one operator journey: pricing first, admissions next, roster daily, seats only when needed.",
    icon: BookOpenCheck,
  },
  {
    title: "Discovery that converts",
    text: "Show students a polished marketplace and branded presence that moves them from search to enquiry faster.",
    icon: Compass,
  },
  {
    title: "One journey for every student",
    text: "Keep portal access, QR check-in, notices, and payments in one reliable place students can actually use.",
    icon: Users,
  },
];

const trustedBy = ["City libraries", "Premium study spaces", "Coaching hubs", "Multi-floor operators"];

const footerColumns = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "Pricing", href: "/#pricing" },
      { label: "Marketplace", href: "/marketplace" },
    ],
  },
  {
    title: "Access",
    links: [
      { label: "Start Free Trial", href: "/owner/register" },
      { label: "Library Access", href: "/owner/login" },
      { label: "Student Login", href: "/student/login" },
      { label: "Student Access", href: "/student/access" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About LibraryPro", href: "/#features" },
      { label: "Contact support", href: "mailto:support@librarypro.in" },
      { label: "Browse libraries", href: "/marketplace" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
];

const sectionMotion = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
    },
  },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.14,
      delayChildren: 0.08,
    },
  },
};

export default function HomePage() {
  return (
    <AnimatePresence mode="wait">
      <motion.main
        key="landing"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="min-h-screen bg-[#FAFAFA] text-[#FFFFFF]"
      >
        <PublicSiteHeader />

        <section className="bg-[#FAFAFA] text-[#0F172A]">
          <div className="mx-auto w-full max-w-[1120px] px-4 py-16 md:py-24">
            <motion.div variants={sectionMotion} className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
              <div>
                <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  Visual-first library journey
                </div>
                <h1 className="mt-6 max-w-3xl text-[clamp(2.25rem,5vw,4.25rem)] font-bold leading-[1.02] tracking-[-0.045em]">
                  Your Library, Managed &amp; Discovered.
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                  Create pricing once, admit students cleanly, manage the active roster daily, and only then allot seats when placement is ready.
                </p>
              </div>

              <motion.div
                variants={sectionMotion}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="grid gap-4">
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Library Journey</p>
                      <p className="mt-1 text-base font-semibold text-slate-900">One flow from onboarding to daily growth</p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      ["Library setup", "10 min"],
                      ["Seat visibility", "Live map"],
                      ["Student continuity", "QR + dues"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-lg border border-slate-200 bg-white p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
                        <p className="mt-3 text-xl font-bold tracking-tight text-slate-950">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>

            <motion.div variants={sectionMotion} className="mt-12 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Access Center</p>
                  <h2 className="mt-2 text-[clamp(1.5rem,3vw,2.4rem)] font-bold tracking-[-0.04em] text-slate-950">
                    Pick the part of the platform you need.
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                    Owners start with library access, set up plans, admit students, and manage the roster before seat placement. Students and marketplace visitors get their own clean entry points.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {accessCards.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.title}
                      href={item.href}
                      className="group rounded-xl border border-slate-200 bg-[#F8FAFC] p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-sm"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0F172A] text-white transition group-hover:scale-105">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-5 text-xl font-bold tracking-tight text-slate-950">{item.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-slate-600">{item.text}</p>
                      <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-950">
                        Open
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </section>

        <motion.section
          variants={sectionMotion}
          className="border-y border-white/10 bg-[#0F172A] text-white"
        >
          <div className="mx-auto grid w-full max-w-[1120px] gap-4 px-4 py-8 sm:grid-cols-2 lg:grid-cols-4">
            {proofStats.map((item) => (
              <div key={item.label} className="rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-center">
                <p className="text-2xl font-bold tracking-tight">{item.value}</p>
                <p className="mt-1 text-sm text-slate-300">{item.label}</p>
              </div>
            ))}
          </div>
        </motion.section>

        <section id="features" className="bg-[#0F172A] text-white">
          <div className="mx-auto w-full max-w-[1120px] px-4 py-20 md:py-24">
            <motion.div variants={sectionMotion} className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300">Interactive roadmap</p>
              <h2 className="mt-3 text-[clamp(1.8rem,3.5vw,2.8rem)] font-bold tracking-[-0.04em]">
                Follow the library journey from setup to growth.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-300">
                This is how LibraryPro works in practice. Each step in the journey becomes visible as the page moves,
                keeping the story simple and product-first.
              </p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={staggerContainer}
              className="mt-12 grid gap-6 lg:grid-cols-4"
            >
              {journeySteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <motion.article
                    key={step.title}
                    variants={sectionMotion}
                    whileInView={{
                      scale: [0.98, 1.02, 1],
                      boxShadow: [
                        "0 0 0 rgba(16,185,129,0)",
                        "0 0 40px rgba(16,185,129,0.18)",
                        "0 0 0 rgba(16,185,129,0)",
                      ],
                    }}
                    viewport={{ once: true, amount: 0.45 }}
                    transition={{ duration: 0.65, delay: index * 0.08 }}
                    className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-4"
                  >
                    {index < journeySteps.length - 1 ? (
                      <div className="absolute left-[calc(100%-8px)] top-11 hidden h-[2px] w-8 bg-white/15 lg:block" />
                    ) : null}
                    <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${step.accent} opacity-80`} />
                    <div className="relative">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-[#111C33] text-white">
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">Step 0{index + 1}</p>
                      <h3 className="mt-2 text-xl font-bold tracking-tight">{step.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-slate-300">{step.text}</p>
                    </div>
                  </motion.article>
                );
              })}
            </motion.div>
          </div>
        </section>

        <section className="bg-[#FAFAFA] text-[#0F172A]">
          <div className="mx-auto w-full max-w-[1120px] px-4 py-20 md:py-24">
            <motion.div variants={sectionMotion} className="mx-auto max-w-2xl text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">Benefit-first product design</p>
              <h2 className="mt-3 text-[clamp(1.8rem,3.4vw,2.75rem)] font-bold tracking-[-0.04em]">
                Less noise. More clarity. Better library decisions.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Start with plans and admissions, keep the roster under control, then use seats and discovery as the next step instead of mixing everything at once.
              </p>
            </motion.div>

            <motion.div variants={staggerContainer} className="mt-12 grid gap-4 md:grid-cols-3">
              {benefitCards.map((item) => {
                const Icon = item.icon;
                return (
                  <motion.article key={item.title} variants={sectionMotion} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0F172A] text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 text-xl font-bold tracking-tight text-slate-950">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{item.text}</p>
                  </motion.article>
                );
              })}
            </motion.div>
          </div>
        </section>

        <section id="pricing" className="bg-[#FAFAFA] text-[#0F172A]">
          <div className="mx-auto w-full max-w-[1120px] px-4 py-16 md:py-20">
            <motion.div variants={sectionMotion} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
              <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                <div className="max-w-2xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">Pricing</p>
                  <h2 className="mt-3 text-[clamp(1.8rem,3vw,2.8rem)] font-bold tracking-[-0.045em] text-slate-950">
                    Start with access that feels simple from day one.
                  </h2>
                  <p className="mt-3 text-base leading-7 text-slate-600">
                    Launch your library workspace, train your team, and open your student-facing portal without a heavy setup project.
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                  <p className="text-sm font-semibold text-emerald-800">Owner onboarding in minutes</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Free trial available</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {[
                  {
                    title: "Operations",
                    text: "Seats, admissions, dues, and attendance in one owner workspace.",
                  },
                  {
                    title: "Discovery",
                    text: "Marketplace visibility and a polished public library presence.",
                  },
                  {
                    title: "Student continuity",
                    text: "Portal access, QR entry, notices, and payments in one flow.",
                  },
                ].map((item) => (
                  <div key={item.title} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-lg font-bold tracking-tight text-slate-950">{item.title}</p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{item.text}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        <motion.footer variants={sectionMotion} className="bg-[#0F172A] text-white">
          <div className="mx-auto w-full max-w-[1120px] px-4 py-14 md:py-16">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5 shadow-sm md:p-6">
              <div className="grid gap-8 lg:grid-cols-[1.2fr_1.8fr]">
                <div>
                  <Link href="/" className="inline-flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-sm font-black text-[#0F172A]">
                      LP
                    </span>
                    <span>
                      <span className="block text-[12px] font-semibold uppercase tracking-[0.28em] text-emerald-300">
                        LibraryPro
                      </span>
                      <span className="mt-1 block text-sm text-slate-300">
                        Library growth and operations platform
                      </span>
                    </span>
                  </Link>

                  <p className="mt-5 max-w-md text-sm leading-7 text-slate-300">
                    Manage admissions, seats, dues, student access, and marketplace discovery from one clean workspace.
                  </p>

                  <div className="mt-5 grid gap-3 text-sm text-slate-300">
                    <a href="mailto:support@librarypro.in" className="inline-flex items-center gap-2 transition hover:text-white">
                      <Mail className="h-4 w-4 text-emerald-300" />
                      support@librarypro.in
                    </a>
                    <p className="inline-flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-emerald-300" />
                      Built for Indian library operators
                    </p>
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {footerColumns.map((column) => (
                    <div key={column.title}>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{column.title}</p>
                      <div className="mt-4 grid gap-3">
                        {column.links.map((link) => (
                          <Link
                            key={link.label}
                            href={link.href}
                            className="text-sm text-slate-300 transition hover:text-white"
                          >
                            {link.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-9 border-t border-white/10 pt-5">
                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300">Trusted by modern operators</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {trustedBy.map((item) => (
                        <span key={item} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs leading-6 text-slate-400 md:text-right">
                    (c) 2026 LibraryPro. All rights reserved.
                    <br />
                    Secure owner workflows, student access, and public discovery.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.footer>
      </motion.main>
    </AnimatePresence>
  );
}
