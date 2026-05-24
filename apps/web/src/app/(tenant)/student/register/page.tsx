import { StudentRegisterManager } from "../../../../components/student-register-manager";

export default function StudentRegisterPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(236,173,132,0.18),transparent_24%),radial-gradient(circle_at_top_right,rgba(153,214,209,0.18),transparent_22%),linear-gradient(180deg,#fbf6ee_0%,#fffaf3_52%,#f6efe4_100%)] px-4 py-10 text-[var(--lp-text)] md:px-8">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-[var(--lp-border)] bg-[rgba(255,251,245,0.96)] p-8 shadow-[0_18px_54px_rgba(111,95,74,0.08)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[var(--lp-accent)]">Student app signup</p>
        <h1 className="mt-3 text-3xl font-black">Create your student app first, then join any library later.</h1>
        <p className="mt-4 text-sm leading-7 text-[var(--lp-muted)]">
          Nextlib app bina library ke bhi useful rehna chahiye. Isliye student apna account bana kar focus, syllabus, revision, rewards, feed, aur offers use karta rahega.
        </p>
        <StudentRegisterManager />
      </div>
    </main>
  );
}
