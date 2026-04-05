import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const quickLinks = [
  {
    title: "Student Dashboard",
    href: "/student/dashboard",
    description: "View seat details, notice board, WiFi credentials, and payment status.",
    accent: "from-cyan-500 to-blue-600",
  },
  {
    title: "Owner Dashboard",
    href: "/owner/dashboard",
    description: "Manage revenue, alerts, occupancy, assignments, and floor-wise layouts.",
    accent: "from-amber-400 to-orange-500",
  },
];

type TenantPortalPageProps = {
  searchParams?: Promise<{ role?: string }>;
};

export default async function TenantPortalPage({ searchParams }: TenantPortalPageProps) {
  const params = (await searchParams) ?? {};
  const cookieStore = await cookies();
  const hasSession = cookieStore.get("lp_session")?.value === "1";
  const role = hasSession ? params.role ?? cookieStore.get("lp_role")?.value : params.role;

  if (role === "LIBRARY_OWNER") {
    redirect("/owner/dashboard");
  }

  if (role === "STUDENT") {
    redirect("/student/dashboard");
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#0f172a,_#111827_45%,_#1e293b)] px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <header className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Nextlib Tenant Portal</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
            One subdomain, two focused workspaces.
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-slate-300 md:text-base">
            Route authenticated users into the right experience without mixing owner operations and
            student actions on the same screen.
          </p>
          <p className="mt-3 text-xs uppercase tracking-[0.25em] text-slate-400">
            Auto-redirect ready for auth cookie or session role mapping
          </p>
        </header>

        <section className="mt-8 grid gap-6 md:grid-cols-2">
          {quickLinks.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="group rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-xl transition hover:-translate-y-1 hover:bg-white/10"
            >
              <div className={`h-2 w-32 rounded-full bg-gradient-to-r ${item.accent}`} />
              <h2 className="mt-6 text-2xl font-black">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">{item.description}</p>
              <span className="mt-8 inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-cyan-200">
                Open workspace
              </span>
            </a>
          ))}
        </section>
      </div>
    </main>
  );
}
