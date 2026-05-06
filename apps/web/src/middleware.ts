import { NextRequest, NextResponse } from "next/server";

const RESERVED = new Set(["www", "admin"]);
const INTERNAL_TENANT_HEADER_SECRET = process.env.INTERNAL_TENANT_HEADER_SECRET ?? "";

function getTenantSlug(host: string) {
  const hostname = host.split(":")[0].toLowerCase();
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "booklib.in";

  if (hostname === baseDomain || hostname === `www.${baseDomain}` || hostname === `admin.${baseDomain}`) {
    return null;
  }

  if (!hostname.endsWith(`.${baseDomain}`)) {
    return null;
  }

  const slug = hostname.replace(`.${baseDomain}`, "");
  return RESERVED.has(slug) ? null : slug;
}

function normalizePublicHost(host: string) {
  const trimmed = host.trim();
  const hostname = trimmed.startsWith("[")
    ? trimmed.slice(0, trimmed.indexOf("]") + 1).toLowerCase()
    : trimmed.split(":")[0].toLowerCase();

  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]") {
    return trimmed;
  }

  return trimmed.replace(/:(3000|4000)$/, "");
}

function splitPublicHost(host: string) {
  const normalized = normalizePublicHost(host);

  if (normalized.startsWith("[")) {
    const match = normalized.match(/^(\[[^\]]+\])(?::(\d+))?$/);
    return {
      hostname: match?.[1] ?? normalized,
      port: match?.[2] ?? "",
    };
  }

  const [hostname, port = ""] = normalized.split(":");
  return { hostname, port };
}

function publicUrl(request: NextRequest, path: string) {
  const url = request.nextUrl.clone();
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  if (forwardedProto) {
    url.protocol = `${forwardedProto.replace(/:$/, "")}:`;
  }
  if (forwardedHost) {
    const publicHost = splitPublicHost(forwardedHost);
    url.hostname = publicHost.hostname;
    url.port = publicHost.port;
  }
  if (url.protocol === "https:" && url.port === "443") {
    url.port = "";
  }
  if (url.protocol === "http:" && url.port === "80") {
    url.port = "";
  }
  url.pathname = path;
  return url;
}

function internalRewriteUrl(request: NextRequest, path: string) {
  const url = request.nextUrl.clone();
  url.protocol = "http:";
  url.hostname = "localhost";
  url.port = "3000";
  url.pathname = path;
  return url;
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

  const publicOwnerRoutes = new Set(["/owner/register"]);
  const publicStudentRoutes = new Set(["/student/access", "/student/register"]);

  for (const route of protectedRoutes) {
    if (url.pathname.startsWith(route.prefix) && url.pathname !== route.loginPath) {
      if (route.prefix === "/owner" && publicOwnerRoutes.has(url.pathname)) {
        continue;
      }
      if (route.prefix === "/student" && publicStudentRoutes.has(url.pathname)) {
        continue;
      }
      if (!hasSession || !role || role !== route.role) {
        const loginUrl = publicUrl(request, route.loginPath);
        loginUrl.searchParams.set("next", request.nextUrl.pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  if (host.startsWith("admin.")) {
    if (url.pathname === "/") {
      return NextResponse.redirect(publicUrl(request, "/admin"));
    }

    return NextResponse.next();
  }

  if (host === (process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "booklib.in").toLowerCase() || host.startsWith("www.")) {
    if (url.pathname === "/") {
      return NextResponse.redirect(publicUrl(request, "/marketplace"));
    }

    return NextResponse.next();
  }

  if (tenantSlug) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-tenant-slug", tenantSlug);
    if (INTERNAL_TENANT_HEADER_SECRET) {
      requestHeaders.set("x-booklib-internal-tenant-secret", INTERNAL_TENANT_HEADER_SECRET);
    }

    if (url.pathname === "/") {
      return NextResponse.rewrite(internalRewriteUrl(request, "/library-site"), { request: { headers: requestHeaders } });
    }

    if (url.pathname === "/about" || url.pathname === "/pricing" || url.pathname === "/contact") {
      return NextResponse.rewrite(internalRewriteUrl(request, `/library-site${url.pathname}`), { request: { headers: requestHeaders } });
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
