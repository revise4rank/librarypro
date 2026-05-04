import Link from "next/link";
import { PublicSiteHeader } from "../../components/public-site-header";

const sections = [
  {
    title: "Platform use",
    text: "LibraryPro provides software for library operators to manage admissions, seats, payments, student access, public pages, and marketplace discovery.",
  },
  {
    title: "Operator responsibility",
    text: "Library owners are responsible for the accuracy of their listings, student records, pricing, notices, and payment updates entered into the platform.",
  },
  {
    title: "Student access",
    text: "Students should use credentials, library codes, or join flows shared by their library. Access may depend on the library owner's approval and account status.",
  },
  {
    title: "Support",
    text: "For service, billing, or access questions, contact support@librarypro.in.",
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#FAFAFA] text-[#0F172A]">
      <PublicSiteHeader />
      <section className="mx-auto w-full max-w-[900px] px-4 py-14 md:py-20">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">Legal</p>
        <h1 className="mt-3 text-[clamp(2rem,5vw,4rem)] font-black tracking-[-0.055em]">Terms of Service</h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
          These terms describe the expected use of LibraryPro by library owners, teams, and students.
          Last updated: April 27, 2026.
        </p>

        <div className="mt-10 grid gap-4">
          {sections.map((section) => (
            <article key={section.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
