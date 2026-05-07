const apiBase = process.env.BOOKLIB_API_URL ?? "http://127.0.0.1:4000/v1";
const webBase = process.env.BOOKLIB_WEB_URL ?? "http://127.0.0.1:3000";

const credentials = {
  owner: { login: "owner@booklib.demo", password: "owner123" },
  student: { login: "student@booklib.demo", password: "student123" },
  admin: { login: "admin@booklib.demo", password: "admin123" },
};

function getSetCookies(response) {
  const headers = response.headers;
  const rawSetCookie = headers.get("set-cookie");
  return (
    headers.getSetCookie?.() ??
    (rawSetCookie
      ? rawSetCookie
          .split(/,(?=[^;,\s]+=)/)
          .map((cookie) => cookie.trim())
          .filter(Boolean)
      : [])
  );
}

function mergeCookieHeader(currentCookieHeader, setCookies) {
  const jar = new Map();
  for (const cookie of currentCookieHeader.split(";")) {
    const [rawName, ...rawValue] = cookie.trim().split("=");
    if (rawName && rawValue.length > 0) {
      jar.set(rawName, rawValue.join("="));
    }
  }

  for (const cookie of setCookies) {
    const [pair] = cookie.split(";");
    const [rawName, ...rawValue] = pair.trim().split("=");
    if (rawName && rawValue.length > 0) {
      jar.set(rawName, rawValue.join("="));
    }
  }

  return Array.from(jar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

async function expectJson(response, label) {
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`${label} returned non-JSON body: ${text}`);
  }

  if (!response.ok) {
    throw new Error(`${label} failed with ${response.status}: ${JSON.stringify(json)}`);
  }

  return json;
}

async function login(role, payload) {
  const response = await fetch(`${apiBase}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await expectJson(response, `${role} login`);
  const cookieHeader = mergeCookieHeader("", getSetCookies(response));
  if (!cookieHeader.includes("lp_access=")) {
    throw new Error(`${role} login did not return auth cookie`);
  }

  return {
    role,
    cookieHeader,
    csrfToken: json.data?.csrfToken ?? null,
    user: json.data?.user ?? null,
  };
}

async function authedFetch(session, path, init = {}, label = path) {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = {
    "content-type": "application/json",
    cookie: session.cookieHeader,
    ...(session.csrfToken && !["GET", "HEAD", "OPTIONS"].includes(method) ? { "x-csrf-token": session.csrfToken } : {}),
    ...(init.headers ?? {}),
  };

  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers,
  });
  const setCookies = getSetCookies(response);
  if (setCookies.length > 0) {
    session.cookieHeader = mergeCookieHeader(session.cookieHeader, setCookies);
  }
  return expectJson(response, label);
}

async function checkWeb(path, expectedStatus = 200) {
  const response = await fetch(`${webBase}${path}`, { redirect: "manual" });
  if (response.status !== expectedStatus) {
    throw new Error(`Web route ${path} expected ${expectedStatus} but got ${response.status}`);
  }
  return response;
}

async function checkHomePage() {
  const response = await checkWeb("/", 200);
  const body = await response.text();
  for (const required of ['id="features"', 'id="pricing"', "Start Free Trial", "Explore Libraries"]) {
    if (!body.includes(required)) {
      throw new Error(`Homepage missing required landing content: ${required}`);
    }
  }
}

async function main() {
  console.info("Running BookLib E2E smoke...");

  await checkHomePage();
  await checkWeb("/marketplace", 200);
  await checkWeb("/libraries/focus-library", 200);
  await checkWeb("/owner/login", 200);
  await checkWeb("/student/login?library=focuslibrary", 200);
  await checkWeb("/student/settings", 307);

  const publicSearch = await expectJson(
    await fetch(`${apiBase}/public/libraries/search?q=focus&city=Indore&limit=12&page=1`),
    "public marketplace search",
  );
  const publicLibrary = await expectJson(
    await fetch(`${apiBase}/public/libraries/focuslibrary`),
    "public library profile",
  );

  const ownerSession = await login("owner", credentials.owner);
  const studentSession = await login("student", credentials.student);
  const adminSession = await login("admin", credentials.admin);

  const ownerDashboard = await authedFetch(ownerSession, "/owner/dashboard", {}, "owner dashboard");
  const ownerSettings = await authedFetch(ownerSession, "/owner/settings", {}, "owner settings");
  const ownerStudents = await authedFetch(ownerSession, "/owner/students", {}, "owner students");
  const ownerSeats = await authedFetch(ownerSession, "/owner/seats", {}, "owner seats");
  const ownerPayments = await authedFetch(ownerSession, "/owner/payments", {}, "owner payments");
  const ownerReports = await authedFetch(ownerSession, "/owner/reports", {}, "owner reports");
  const ownerPublicProfile = await authedFetch(ownerSession, "/owner/public-profile", {}, "owner public profile");
  const ownerBilling = await authedFetch(ownerSession, "/billing/subscription", {}, "owner billing subscription");

  const studentMe = await authedFetch(studentSession, "/auth/me", {}, "student me");
  const studentLibraries = await authedFetch(studentSession, "/student/libraries", {}, "student libraries");
  const studentDashboard = await authedFetch(studentSession, "/student/dashboard", {}, "student dashboard");
  const studentPayments = await authedFetch(studentSession, "/student/payments", {}, "student payments");
  const studentQr = await authedFetch(studentSession, "/student/entry-qr", {}, "student QR");
  const studentNotifications = await authedFetch(studentSession, "/student/notifications", {}, "student notifications");
  const studentFocus = await authedFetch(studentSession, "/student/focus", {}, "student focus");
  const studentRevisions = await authedFetch(studentSession, "/student/revisions", {}, "student revisions");
  const studentSyllabus = await authedFetch(studentSession, "/student/syllabus", {}, "student syllabus");
  const studentJoinRequests = await authedFetch(studentSession, "/student/join-requests", {}, "student join requests");

  const adminDashboard = await authedFetch(adminSession, "/admin/dashboard", {}, "admin dashboard");
  const adminLibraries = await authedFetch(adminSession, "/admin/libraries", {}, "admin libraries");
  const adminPayments = await authedFetch(adminSession, "/admin/payments", {}, "admin payments");
  const adminPlans = await authedFetch(adminSession, "/admin/plans", {}, "admin plans");
  const adminMarketplaceSettings = await authedFetch(adminSession, "/admin/marketplace-settings", {}, "admin marketplace settings");

  const summary = {
    public: {
      searchRows: Array.isArray(publicSearch.data) ? publicSearch.data.length : 0,
      searchTotal: publicSearch.meta?.total ?? null,
      library: publicLibrary.data?.library_name ?? publicLibrary.data?.library?.name ?? publicLibrary.data?.name ?? null,
    },
    owner: {
      occupancy: ownerDashboard.data?.metrics?.occupancy_percent ?? null,
      library: ownerSettings.data?.libraryName ?? ownerDashboard.data?.library?.name ?? null,
      students: ownerStudents.data?.students?.length ?? ownerStudents.data?.length ?? 0,
      seats: ownerSeats.data?.seats?.length ?? ownerSeats.data?.length ?? 0,
      payments: ownerPayments.data?.payments?.length ?? ownerPayments.data?.length ?? 0,
      reportCards: ownerReports.data?.cards?.length ?? null,
      publicProfilePublished: ownerPublicProfile.data?.profile?.isPublished ?? ownerPublicProfile.data?.isPublished ?? null,
      subscriptionStatus: ownerBilling.data?.subscription?.status ?? null,
    },
    student: {
      name: studentMe.data?.fullName ?? studentSession.user?.fullName ?? null,
      libraries: studentLibraries.data?.length ?? 0,
      seat: studentDashboard.data?.assignment?.seat_number ?? null,
      paymentRows: studentPayments.data?.payments?.length ?? 0,
      notificationRows: studentNotifications.data?.length ?? 0,
      qrKeyId: studentQr.data?.qrKeyId ?? null,
      focusSubjects: studentFocus.data?.subjects?.length ?? 0,
      revisionRows: studentRevisions.data?.revisions?.length ?? 0,
      syllabusSubjects: studentSyllabus.data?.subjects?.length ?? 0,
      joinRequests: studentJoinRequests.data?.length ?? 0,
    },
    admin: {
      mrr: adminDashboard.data?.metrics?.mrr ?? null,
      libraries: adminDashboard.data?.metrics?.active_libraries ?? null,
      libraryRows: adminLibraries.data?.libraries?.length ?? adminLibraries.data?.length ?? 0,
      paymentRows: adminPayments.data?.payments?.length ?? adminPayments.data?.length ?? 0,
      planRows: adminPlans.data?.plans?.length ?? adminPlans.data?.length ?? 0,
      marketplaceEnabled: adminMarketplaceSettings.data?.settings?.marketplaceEnabled ?? null,
    },
  };

  console.info(JSON.stringify({ ok: true, summary }, null, 2));
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exit(1);
});
