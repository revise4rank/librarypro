"use client";

import {
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Compass,
  LayoutDashboard,
  MessageCircle,
  QrCode,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { BookDemoCta } from "../components/book-demo-cta";
import { FloatingWhatsapp } from "../components/floating-whatsapp";
import { PublicSiteHeader } from "../components/public-site-header";

const stats = [
  { value: "1,200+", label: "libraries managed" },
  { value: "48k+", label: "student profiles" },
  { value: "10 min", label: "guided setup" },
];

const features = [
  {
    title: "Admissions desk",
    text: "Create enquiries, approve joins, add plans, apply coupons, and move students into roster without scattered registers.",
    icon: Users,
    tone: "bg-blue-50 text-blue-600 ring-blue-100",
  },
  {
    title: "Seat map and allotment",
    text: "Select a student, choose a free seat, and confirm allotment from a clean visual workspace.",
    icon: LayoutDashboard,
    tone: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  },
  {
    title: "QR attendance",
    text: "One library QR handles student join, check-in, and checkout. Manual attendance is available for staff.",
    icon: QrCode,
    tone: "bg-pink-50 text-pink-600 ring-pink-100",
  },
  {
    title: "Payments and receipts",
    text: "Track dues, receive payments, export reports, and keep fee receipts organized for every student.",
    icon: WalletCards,
    tone: "bg-amber-50 text-amber-600 ring-amber-100",
  },
  {
    title: "Marketplace listing",
    text: "Publish plans, offers, gallery, contact details, and public library profile so students can discover you online.",
    icon: Compass,
    tone: "bg-violet-50 text-violet-600 ring-violet-100",
  },
  {
    title: "Website builder",
    text: "Build a modern subdomain website with logo, banner, plans, gallery, offer, pages, and contact actions.",
    icon: BookOpenCheck,
    tone: "bg-orange-50 text-orange-600 ring-orange-100",
  },
  {
    title: "Reports export",
    text: "Export admission, roster, payment, attendance, and daily operation reports when the team needs records.",
    icon: ReceiptText,
    tone: "bg-cyan-50 text-cyan-600 ring-cyan-100",
  },
  {
    title: "Student portal",
    text: "Students get library access, payments, scanner, study zone, syllabus tracker, alerts, and study tools.",
    icon: ClipboardList,
    tone: "bg-slate-100 text-slate-700 ring-slate-200",
  },
  {
    title: "Owner controls",
    text: "Plans, coupons, offers, referrals, team/admin access, website, listing, and billing stay in owner workspace.",
    icon: ShieldCheck,
    tone: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  },
];

const benefitBlocks = [
  {
    title: "For library owners",
    text: "Run admissions, roster, seats, attendance, payments, plans, coupons, offers, staff access, and public growth from one dashboard.",
    points: ["Less manual work", "Better seat visibility", "Cleaner fee tracking"],
  },
  {
    title: "For students",
    text: "Students can join a library, scan QR, check attendance state, track dues, get notices, and use study tools in one place.",
    points: ["Simple portal", "QR based entry", "Study zone support"],
  },
  {
    title: "For growth",
    text: "Your listing, public website, offers, plans, referrals, and gallery work together to turn discovery into enquiries.",
    points: ["Marketplace listing", "Subdomain website", "Offer visibility"],
  },
];

const steps = [
  { title: "Create library", text: "Add profile, timing, location, contact, and owner settings.", icon: BadgeCheck },
  { title: "Add plans", text: "Set trial, paid plans, coupons, and public offers.", icon: WalletCards },
  { title: "Admit students", text: "Approve joins, collect details, and build your roster.", icon: Users },
  { title: "Run daily ops", text: "Use seats, QR attendance, payments, reports, and notices.", icon: CalendarCheck },
];

const faqItems = [
  {
    question: "Can BookLib handle both owner and student workflows?",
    answer: "Yes. Owners manage library operations, while students get their own portal for QR scanning, payments, alerts, and study tools.",
  },
  {
    question: "Can my library get a public listing and website?",
    answer: "Yes. Paid libraries can publish marketplace listings and a subdomain website with plans, offers, gallery, and contact actions.",
  },
  {
    question: "What happens if a student does not have a phone?",
    answer: "Owner and approved team members can mark manual attendance, so daily check-in does not depend only on the student's phone.",
  },
  {
    question: "Can I export reports?",
    answer: "Yes. BookLib supports export flows for key operational data like roster, payments, attendance, and reports.",
  },
];

const blogCards = [
  {
    title: "Best Library Management Software for Reading Rooms in India",
    text: "A practical guide for owners comparing tools for admissions, seats, fees, attendance, and growth.",
  },
  {
    title: "How QR Attendance Reduces Manual Work",
    text: "See how one reception QR can simplify join requests, check-ins, checkouts, and staff attendance fallback.",
  },
  {
    title: "How to Grow a Study Library Online",
    text: "Use listings, offers, public plans, website pages, and referrals to increase student enquiries.",
  },
];

const footerColumns = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "Pricing", href: "/#pricing" },
      { label: "Blog", href: "/blog" },
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
      { label: "About", href: "/#about" },
      { label: "Contact", href: "mailto:support@booklib.in" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
];

function HeroMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[920px]">
      <div className="rounded-lg border border-slate-200 bg-slate-950 p-3 shadow-xl">
        <div className="overflow-hidden rounded-lg bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase text-emerald-600">BookLib owner dashboard</p>
              <h3 className="text-lg font-bold text-slate-950">Focus Library</h3>
            </div>
            <div className="flex gap-2">
              <span className="rounded-lg bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Live seats</span>
              <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">QR ready</span>
            </div>
          </div>
          <div className="grid gap-4 p-5 lg:grid-cols-[0.7fr_1.3fr_0.9fr]">
            <div className="grid gap-3">
              {["Admissions", "Roster", "Seats", "Payments"].map((item, index) => (
                <div
                  key={item}
                  className={[
                    "rounded-lg border px-3 py-3 text-sm font-semibold",
                    index === 2
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-slate-50 text-slate-700",
                  ].join(" ")}
                >
                  {item}
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-bold text-slate-950">Seat map</p>
                <p className="rounded-lg bg-white px-3 py-1 text-xs font-semibold text-slate-600">32 free</p>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {Array.from({ length: 30 }).map((_, index) => (
                  <span
                    key={index}
                    className={[
                      "h-9 rounded-lg border",
                      index % 5 === 0
                        ? "border-amber-200 bg-amber-100"
                        : index % 3 === 0
                          ? "border-slate-200 bg-white"
                          : "border-emerald-200 bg-emerald-100",
                    ].join(" ")}
                  />
                ))}
              </div>
            </div>
            <div className="grid gap-3">
              {[
                ["Pending joins", "18"],
                ["Dues today", "Rs. 12,400"],
                ["Check-ins", "86"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
                  <p className="mt-2 text-xl font-bold text-slate-950">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-7 left-4 w-[220px] rounded-lg border border-slate-200 bg-white p-3 shadow-lg md:left-10 md:w-[270px]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <QrCode className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Reception QR</p>
            <p className="text-sm font-bold text-slate-950">Join, check-in, checkout</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <PublicSiteHeader />
      <FloatingWhatsapp />

      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#ffffff_0%,#f4fbf8_45%,#eefbf5_100%)]">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-16 text-center md:py-24">
          <div className="mx-auto inline-flex items-center gap-2 rounded-lg border border-emerald-100 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
            <BadgeCheck className="h-4 w-4 text-emerald-600" />
            Trusted by modern reading rooms and study libraries
          </div>
          <h1 className="mx-auto mt-8 max-w-5xl text-[clamp(2.7rem,6.6vw,6rem)] font-bold leading-[1.04] text-slate-900">
            One-stop digital solution for your <span className="text-emerald-600">library</span>
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-600 md:text-2xl md:leading-9">
            Manage admissions, seats, QR attendance, dues, reports, public listing, website, and student portal from one simple BookLib dashboard.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/owner/register"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-7 text-base font-bold text-white shadow-sm transition hover:bg-emerald-700"
            >
              Start free trial
              <ArrowRight className="h-5 w-5" />
            </Link>
            <BookDemoCta className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-white px-7 text-base font-bold text-emerald-700 transition hover:bg-emerald-50" />
            <Link
              href="/marketplace"
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-emerald-200 bg-white px-7 text-base font-bold text-emerald-700 transition hover:bg-emerald-50"
            >
              Explore libraries
            </Link>
          </div>
          <div className="mt-14">
            <HeroMockup />
          </div>
        </div>
      </section>

      <section className="bg-emerald-600 text-white">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-16 text-center md:py-20">
          <h2 className="text-[clamp(2rem,4vw,3.2rem)] font-bold">Trusted by libraries nationwide</h2>
          <p className="mt-3 text-lg text-emerald-50">Built for owners who want operations, students, and growth in one place.</p>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {stats.map((item) => (
              <div key={item.label} className="rounded-lg border border-white/15 bg-white/10 p-6">
                <p className="text-5xl font-bold">{item.value}</p>
                <p className="mt-3 text-xl font-bold">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="bg-white">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
              <Sparkles className="h-4 w-4" />
              Powerful features
            </div>
            <h2 className="mt-7 text-[clamp(2.2rem,4.5vw,4.2rem)] font-bold leading-[1.08] text-slate-900">
              Everything your library needs to run and grow
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              BookLib connects daily operations with student experience and online discovery, so every workflow feels clear.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="rounded-lg border border-slate-200 bg-white p-7 shadow-sm">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-lg ring-1 ${item.tone}`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="mt-8 text-2xl font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-4 text-base leading-7 text-slate-600">{item.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="about" className="bg-slate-50">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-16 md:py-24">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700">
              <CheckCircle2 className="h-4 w-4" />
              Why choose BookLib
            </div>
            <h2 className="mt-7 text-[clamp(2.2rem,4.3vw,4rem)] font-bold leading-[1.08] text-slate-900">
              Simple for owners. Useful for students. Built for growth.
            </h2>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {benefitBlocks.map((item) => (
              <article key={item.title} className="rounded-lg border border-slate-200 bg-white p-7 shadow-sm">
                <h3 className="text-2xl font-bold text-slate-900">{item.title}</h3>
                <p className="mt-4 text-base leading-7 text-slate-600">{item.text}</p>
                <div className="mt-7 grid gap-3">
                  {item.points.map((point) => (
                    <div key={point} className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      {point}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto w-full max-w-[1100px] px-4 py-16 md:py-24">
          <div className="text-center">
            <h2 className="text-[clamp(2rem,4vw,3.5rem)] font-bold text-slate-900">How it works</h2>
            <p className="mt-4 text-lg text-slate-600">Get your digital library running in four practical steps.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <article key={step.title} className="rounded-lg border border-slate-200 bg-white p-7 shadow-sm">
                  <div className="flex flex-col gap-5 sm:flex-row">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
                      <Icon className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="inline-flex rounded-lg bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700">Step {index + 1}</p>
                      <h3 className="mt-3 text-2xl font-bold text-slate-900">{step.title}</h3>
                      <p className="mt-3 text-base leading-7 text-slate-600">{step.text}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-emerald-600 text-white">
        <div className="mx-auto w-full max-w-[1120px] px-4 py-16 text-center md:py-24">
          <h2 className="mx-auto max-w-4xl text-[clamp(2rem,4vw,3.7rem)] font-bold leading-[1.12]">
            Start your digital library journey with a guided trial
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-emerald-50">
            Trial access helps owners set up their library, test admissions, and understand the platform before upgrading to full growth features.
          </p>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              ["Trial setup", "Create your library and experience the core workflow."],
              ["Paid growth", "Unlock listing, website builder, offers, admins, and ads."],
              ["Superadmin control", "Plans and access rules stay configurable from admin."],
            ].map(([title, text]) => (
              <div key={title} className="rounded-lg border border-white/15 bg-white/10 p-6">
                <p className="text-2xl font-bold">{title}</p>
                <p className="mt-3 leading-7 text-emerald-50">{text}</p>
              </div>
            ))}
          </div>
          <Link
            href="/owner/register"
            className="mt-10 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-white px-7 text-base font-bold text-emerald-700 transition hover:bg-emerald-50"
          >
            Get started free
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-16 md:py-24">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
                <BookOpenCheck className="h-4 w-4" />
                Blog
              </div>
              <h2 className="mt-6 text-[clamp(2rem,4vw,3.6rem)] font-bold text-slate-900">Practical guides for library owners</h2>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
                Learn how to manage seats, attendance, fees, public listings, and student retention with better systems.
              </p>
            </div>
            <Link href="/blog" className="inline-flex items-center gap-2 text-base font-bold text-emerald-700">
              Read all blogs
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {blogCards.map((post) => (
              <Link key={post.title} href="/blog" className="rounded-lg border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                <p className="text-sm font-bold text-emerald-700">BookLib guide</p>
                <h3 className="mt-5 text-2xl font-bold leading-tight text-slate-900">{post.title}</h3>
                <p className="mt-4 text-base leading-7 text-slate-600">{post.text}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto w-full max-w-[980px] px-4 py-16 md:py-24">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700">
              <MessageCircle className="h-4 w-4" />
              Got questions?
            </div>
            <h2 className="mt-7 text-[clamp(2rem,4vw,3.6rem)] font-bold text-slate-900">
              Frequently asked questions
            </h2>
          </div>
          <div className="mt-10 grid gap-4">
            {faqItems.map((item, index) => (
              <details key={item.question} open={index === 0} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <summary className="cursor-pointer list-none text-xl font-bold text-slate-900">{item.question}</summary>
                <p className="mt-4 border-t border-slate-100 pt-4 text-base leading-7 text-slate-600">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-white">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-14">
          <div className="grid gap-10 border-t border-slate-200 pt-10 lg:grid-cols-[1.3fr_2fr]">
            <div>
              <Link href="/" className="inline-flex items-center gap-3">
                <Image
                  src="/icons/booklib-mark.png"
                  alt="BookLib"
                  width={88}
                  height={44}
                  className="h-12 w-14 rounded-lg border border-slate-200 object-contain p-1"
                />
                <span className="text-3xl font-bold text-emerald-600">BookLib</span>
              </Link>
              <p className="mt-5 max-w-md text-base leading-7 text-slate-600">
                Modern library management made simple for Indian reading rooms, study halls, and coaching library operators.
              </p>
            </div>
            <div className="grid gap-8 sm:grid-cols-3">
              {footerColumns.map((column) => (
                <div key={column.title}>
                  <p className="text-lg font-bold text-slate-900">{column.title}</p>
                  <div className="mt-5 grid gap-3">
                    {column.links.map((link) => (
                      <Link key={link.label} href={link.href} className="text-base text-slate-600 transition hover:text-emerald-700">
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-6 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
            <p>(c) 2026 BookLib. All rights reserved.</p>
            <p>Built for library owners, students, and growth teams.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
