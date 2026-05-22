"use client";

import {
  ArrowRight,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  Compass,
  LayoutDashboard,
  MessageCircle,
  QrCode,
  Sparkles,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FloatingWhatsapp } from "../components/floating-whatsapp";
import { PublicSiteHeader } from "../components/public-site-header";
import { apiFetch } from "../lib/api";
import {
  emptyPublicSiteSettings,
  fetchPublicSiteSettings,
  type PublicSiteSettings,
  whatsappHref,
} from "../lib/public-site-settings";

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  readTimeMinutes: number;
  publishedAt: string | null;
};

const features = [
  { title: "Admissions Desk", text: "Create students, apply plans/coupons, and move requests into roster without mixing seat work.", icon: Users },
  { title: "Visual Seat Map", text: "Daily allotment stays simple: select student, choose free seat, confirm.", icon: LayoutDashboard },
  { title: "QR Attendance", text: "One QR handles check-in and checkout, with manual fallback for students without phones.", icon: QrCode },
  { title: "Marketplace Growth", text: "Published listings, offers, plans, gallery, and website CTAs help students discover faster.", icon: Compass },
  { title: "Payments & Reports", text: "Track dues, receipts, expenses, exports, and platform billing from one workspace.", icon: CalendarCheck },
  { title: "Student Portal", text: "Students see library access, dues, notices, study tools, syllabus, and scanner actions.", icon: BookOpen },
];

const ownerBenefits = [
  "No scattered registers for admissions, dues, and attendance",
  "Seat allotment stays clean even when the library grows",
  "Public listing and subdomain website update from one profile",
];

const studentBenefits = [
  "Simple login for dues, notices, QR scan, and study continuity",
  "Library joining and attendance through one scanner flow",
  "Cleaner communication from the library team",
];

const growthBenefits = [
  "Plans, offers, gallery, reviews, and contact actions improve trust",
  "Marketplace visibility helps students compare before calling",
  "Owner leads land in one follow-up friendly workspace",
];

const defaultBlogs: BlogPost[] = [
  {
    id: "seed-1",
    title: "Best Library Management Software for Reading Rooms in India",
    slug: "best-library-management-software-reading-rooms-india",
    category: "Library Management",
    excerpt: "A practical guide for owners who want seats, dues, attendance, and discovery in one clean system.",
    readTimeMinutes: 8,
    publishedAt: null,
  },
  {
    id: "seed-2",
    title: "How QR Attendance Helps Study Libraries Reduce Manual Work",
    slug: "qr-attendance-study-library-manual-work",
    category: "Attendance",
    excerpt: "QR entry can make check-in, checkout, and daily visibility faster for both owner and staff.",
    readTimeMinutes: 6,
    publishedAt: null,
  },
  {
    id: "seed-3",
    title: "Library Marketplace vs Normal Website: Student Discovery",
    slug: "library-marketplace-vs-normal-website-student-discovery",
    category: "Marketplace",
    excerpt: "A branded website builds trust, while a marketplace helps students discover and compare you faster.",
    readTimeMinutes: 7,
    publishedAt: null,
  },
];

const sectionMotion = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55 } },
};

export default function HomePage() {
  const [settings, setSettings] = useState<PublicSiteSettings>(emptyPublicSiteSettings);
  const [blogs, setBlogs] = useState<BlogPost[]>(defaultBlogs);

  useEffect(() => {
    fetchPublicSiteSettings().then(setSettings).catch(() => setSettings(emptyPublicSiteSettings));
    apiFetch<{ success: boolean; data: BlogPost[] }>("/public/blogs", undefined, false)
      .then((response) => setBlogs(response.data.slice(0, 3)))
      .catch(() => setBlogs(defaultBlogs));
  }, []);

  const demoHref = useMemo(
    () => whatsappHref(settings.demoWhatsappNumber || settings.supportWhatsappNumber, settings.demoWhatsappMessage),
    [settings],
  );

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-950">
      <PublicSiteHeader
        demoHref={demoHref}
        showDemo={settings.enableBookDemoCta && Boolean(demoHref)}
        ctaHref="/owner/register"
        ctaLabel="Get Started"
      />
      <FloatingWhatsapp settings={settings} />

      <section className="overflow-hidden bg-[radial-gradient(circle_at_top_left,#D1FAE5_0,transparent_34%),linear-gradient(135deg,#07111F_0%,#0F172A_48%,#062A24_100%)] text-white">
        <div className="mx-auto grid w-full max-w-[1180px] gap-10 px-4 py-16 md:py-24 lg:grid-cols-[0.98fr_1.02fr] lg:items-center">
          <motion.div initial="hidden" animate="visible" variants={sectionMotion}>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-200">
              <Sparkles className="h-4 w-4" />
              Library growth + daily operations
            </div>
            <h1 className="mt-6 max-w-3xl text-[clamp(2.45rem,5vw,5.3rem)] font-black leading-[0.98] tracking-[-0.055em]">
              Run your study library like a modern business.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
              BookLib brings admissions, roster, seat map, QR attendance, dues, student portal, marketplace listing, and public website into one polished workflow.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/owner/register" className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/20">
                Start Free Trial <ArrowRight className="h-4 w-4" />
              </Link>
              {settings.enableBookDemoCta && demoHref ? (
                <a href={demoHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white">
                  <MessageCircle className="h-4 w-4" /> Book Demo
                </a>
              ) : null}
              <Link href="/marketplace" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-black text-white">
                Explore Libraries
              </Link>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {["10 min setup", "QR attendance", "Marketplace ready"].map((item) => (
                <div key={item} className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-bold text-slate-200">
                  <CheckCircle2 className="mb-2 h-4 w-4 text-emerald-300" />
                  {item}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial="hidden" animate="visible" variants={sectionMotion} className="rounded-[1.75rem] border border-white/15 bg-white/10 p-3 shadow-2xl shadow-black/25">
            <div className="rounded-[1.3rem] bg-[#F8FAFC] p-4 text-slate-950">
              <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                  <Image src="/icons/booklib-logo.png" alt="BookLib" width={64} height={52} className="h-10 w-14 rounded-xl bg-white object-contain ring-1 ring-slate-200" />
                  <div>
                    <p className="text-sm font-black">Owner command center</p>
                    <p className="text-xs font-semibold text-emerald-700">Live operating snapshot</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">ACTIVE</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                {[
                  ["Seats", "124"],
                  ["Inside", "86"],
                  ["Due", "18"],
                  ["Leads", "32"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
                    <p className="mt-2 text-2xl font-black">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Seat map</p>
                  <div className="mt-4 grid grid-cols-6 gap-2">
                    {Array.from({ length: 30 }).map((_, index) => (
                      <div key={index} className={`aspect-square rounded-lg ${index % 7 === 0 ? "bg-amber-100" : index % 5 === 0 ? "bg-slate-200" : "bg-emerald-100"} ring-1 ring-slate-200`} />
                    ))}
                  </div>
                </div>
                <div className="grid gap-3">
                  {["New admission", "Manual attendance", "Publish listing"].map((item) => (
                    <div key={item} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-black">{item}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">Ready from dashboard</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="features" className="mx-auto w-full max-w-[1180px] px-4 py-16 md:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Features</p>
          <h2 className="mt-3 text-[clamp(2rem,4vw,3.4rem)] font-black tracking-[-0.045em]">One platform for every serious library workflow.</h2>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-xl font-black tracking-tight">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid w-full max-w-[1180px] gap-4 px-4 py-16 md:grid-cols-3 md:py-20">
          {[
            ["For library owners", ownerBenefits],
            ["For students", studentBenefits],
            ["For growth", growthBenefits],
          ].map(([title, items]) => (
            <article key={title as string} className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-5">
              <h3 className="text-2xl font-black tracking-tight">{title as string}</h3>
              <div className="mt-5 grid gap-3">
                {(items as string[]).map((item) => (
                  <p key={item} className="flex gap-3 text-sm leading-6 text-slate-600">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    {item}
                  </p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto w-full max-w-[1180px] px-4 py-16 md:py-20">
        <div className="rounded-[1.5rem] bg-slate-950 p-6 text-white md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">Pricing</p>
              <h2 className="mt-3 text-[clamp(2rem,4vw,3.2rem)] font-black tracking-[-0.05em]">Start simple, upgrade when your library needs growth tools.</h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">Trial libraries can start with core listing and seat basics. Paid plans unlock richer website, ads/offers, team access, and growth controls.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-5">
              <p className="text-sm font-bold text-emerald-200">Popular paid access</p>
              <p className="mt-2 text-4xl font-black">Rs. 999</p>
              <p className="mt-1 text-sm text-slate-300">6 months plan, configurable by superadmin</p>
              <Link href="/owner/register" className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950">
                Start library account
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto w-full max-w-[1180px] px-4 py-16 md:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Blog</p>
              <h2 className="mt-3 text-[clamp(2rem,4vw,3.2rem)] font-black tracking-[-0.045em]">Ideas to grow and operate better libraries.</h2>
            </div>
            <Link href="/blog" className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-950">View all blogs</Link>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {blogs.map((post, index) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="group overflow-hidden rounded-2xl border border-slate-200 bg-[#F8FAFC] shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                <div className={`h-48 bg-gradient-to-br ${index === 0 ? "from-emerald-200 via-cyan-100 to-slate-900" : index === 1 ? "from-amber-200 via-emerald-100 to-slate-900" : "from-sky-200 via-emerald-100 to-slate-900"} p-5`}>
                  <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-black text-emerald-700">{post.category}</span>
                </div>
                <div className="p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{post.readTimeMinutes} min read</p>
                  <h3 className="mt-3 text-xl font-black leading-tight tracking-tight group-hover:text-emerald-700">{post.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{post.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <footer id="contact" className="bg-slate-950 text-white">
        <div className="mx-auto grid w-full max-w-[1180px] gap-8 px-4 py-12 md:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <Image src="/icons/booklib-logo.png" alt="BookLib" width={120} height={96} className="h-14 w-20 rounded-2xl bg-white object-contain p-1.5" />
            <p className="mt-4 max-w-md text-sm leading-7 text-slate-300">BookLib helps Indian study libraries run cleaner operations and get discovered faster.</p>
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">Product</p>
            <div className="mt-4 grid gap-3 text-sm text-slate-300">
              <Link href="/#features">Features</Link>
              <Link href="/blog">Blog</Link>
              <Link href="/marketplace">Marketplace</Link>
              <Link href="/owner/login">Library Access</Link>
            </div>
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">Contact</p>
            <div className="mt-4 grid gap-3 text-sm text-slate-300">
              <a href="mailto:support@booklib.in">support@booklib.in</a>
              {demoHref ? <a href={demoHref} target="_blank" rel="noreferrer">Book demo on WhatsApp</a> : null}
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/terms">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
