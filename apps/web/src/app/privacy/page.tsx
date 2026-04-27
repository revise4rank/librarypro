import Link from "next/link";
import { PublicSiteHeader } from "../../components/public-site-header";

const sections = [
  {
    title: "Information we handle",
    text: "LibraryPro may handle account details, library profile data, student admission records, payment status, seat activity, and support messages required to run the platform.",
  },
  {
    title: "How we use it",
    text: "We use this information to provide owner dashboards, student access, marketplace listings, support, security checks, and product improvements.",
  },
  {
    title: "Data control",
    text: "Library owners control their operational records. Students can contact their library operator or LibraryPro support for access, correction, or account help.",
  },
  {
    title: "Contact",
    text: "For privacy questions, contact support@librarypro.in.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#FAFAFA] text-[#0F172A]">
      <PublicSiteHeader />
      <section className="mx-auto w-full max-w-[900px] px-4 py-14 md:py-20">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">Legal</p>
        <h1 className="mt-3 text-[clamp(2rem,5vw,4rem)] font-black tracking-[-0.055em]">Privacy Policy</h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
          This page explains the practical privacy approach for LibraryPro users, operators, and students.
          Last updated: April 27, 2026.
        </p>

        <div className="mt-10 grid gap-4">
          {sections.map((section) => (
            <article key={section.title} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_14px_32px_rgba(15,23,42,0.05)]">
              <h2 className="text-lg font-bold tracking-tight">{section.title}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">{section.text}</p>
            </article>
          ))}
        </div>

        <Link href="/" className="mt-8 inline-flex rounded-2xl bg-[#0F172A] px-5 py-3 text-sm font-semibold text-white">
          Back to home
        </Link>
      </section>
    </main>
  );
}
