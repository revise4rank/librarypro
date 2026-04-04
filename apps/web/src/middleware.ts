import { NextRequest, NextResponse } from "next/server";

const RESERVED = new Set(["www", "admin"]);
const INTERNAL_TENANT_HEADER_SECRET =
  process.env.INTERNAL_TENANT_HEADER_SECRET ?? process.env.JWT_SECRET ?? "librarypro-internal";

function getTenantSlug(host: string) {
  const hostname = host.split(":")[0].toLowerCase();
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "librarypro.com";

  if (hostname === baseDomain || hostname === `www.${baseDomain}` || hostname === `admin.${baseDomain}`) {
    return null;
  }

  if (!hostname.endsWith(`.${baseDomain}`)) {
    return null;
  }

  const slug = hostname.replace(`.${baseDomain}`, "");
  return RESERVED.has(slug) ? null : slug;
}

export function middleware(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").toLowerCase();
  const tenantSlug = getTenantSlug(host);
  const url = request.nextUrl.clone();
  const role = request.cookies.get("lp_role")?.value;
  const hasSession = request.cookies.get("lp_session")?.value === "1";

  const protectedRoutes = [
    { prefix: "/owner", loginPath: "/owner/login", role: "LIBRARY_OWNER" },
    { prefix: "/student", loginPath: "/student/login", role: "STUDENT" },
    { prefix: "/superadmin", loginPath: "/superadmin/login", role: "SUPER_ADMIN" },
  ] as const;

  for (const route of protectedRoutes) {
    if (url.pathname.startsWith(route.prefix) && url.pathname !== route.loginPath) {
      if (!hasSession || !role || role !== route.role) {
        url.pathname = route.loginPath;
        url.searchParams.set("next", request.nextUrl.pathname);
        return NextResponse.redirect(url);
      }
    }
  }

  if (host.startsWith("admin.")) {
    if (url.pathname === "/") {
      url.pathname = "/admin";
      return NextResponse.rewrite(url);
    }

    return NextResponse.next();
  }

  if (host === (process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "librarypro.com").toLowerCase() || host.startsWith("www.")) {
    if (url.pathname === "/") {
      url.pathname = "/marketplace";
      return NextResponse.rewrite(url);
    }

    return NextResponse.next();
  }

  if (tenantSlug) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-tenant-slug", tenantSlug);
    requestHeaders.set("x-librarypro-internal-tenant-secret", INTERNAL_TENANT_HEADER_SECRET);

    if (url.pathname === "/") {
      url.pathname = "/library-site";
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }

    if (url.pathname === "/about" || url.pathname === "/pricing" || url.pathname === "/contact") {
      url.pathname = `/library-site${url.pathname}`;
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
