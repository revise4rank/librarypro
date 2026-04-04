const apiBase = process.env.LIBRARYPRO_API_URL ?? "http://127.0.0.1:4000/v1";
const webBase = process.env.LIBRARYPRO_WEB_URL ?? "http://127.0.0.1:3000";

const credentials = {
  owner: { login: "owner@librarypro.demo", password: "owner123" },
  student: { login: "student@librarypro.demo", password: "student123" },
  admin: { login: "admin@librarypro.demo", password: "admin123" },
};

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
  return json.data.accessToken;
}

async function authedFetch(token, path, init = {}, label = path) {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  return expectJson(response, label);
}

async function checkWeb(path, expectedStatus = 200) {
  const response = await fetch(`${webBase}${path}`, { redirect: "manual" });
  if (response.status !== expectedStatus) {
    throw new Error(`Web route ${path} expected ${expectedStatus} but got ${response.status}`);
  }
}

async function main() {
  console.info("Running LibraryPro E2E smoke...");

  await checkWeb("/", 200);
  await checkWeb("/marketplace", 200);
  await checkWeb("/owner/login", 200);

  const ownerToken = await login("owner", credentials.owner);
  const studentToken = await login("student", credentials.student);
  const adminToken = await login("admin", credentials.admin);

  const ownerDashboard = await authedFetch(ownerToken, "/owner/dashboard", {}, "owner dashboard");
  const ownerSettings = await authedFetch(ownerToken, "/owner/settings", {}, "owner settings");
  const ownerBilling = await authedFetch(ownerToken, "/billing/subscription", {}, "owner billing subscription");

  const renewal = await authedFetch(
    ownerToken,
    "/billing/subscription/renew",
    {
      method: "POST",
      body: JSON.stringify({ planCode: "GROWTH_999" }),
    },
    "owner billing renew",
  );

  const studentDashboard = await authedFetch(studentToken, "/student/dashboard", {}, "student dashboard");
  const studentPayments = await authedFetch(studentToken, "/student/payments", {}, "student payments");
  const studentQr = await authedFetch(studentToken, "/student/entry-qr", {}, "student QR");
  const studentNotifications = await authedFetch(studentToken, "/student/notifications", {}, "student notifications");

  const adminDashboard = await authedFetch(adminToken, "/admin/dashboard", {}, "admin dashboard");

  const summary = {
    owner: {
      occupancy: ownerDashboard.data?.metrics?.occupancy_percent ?? null,
      library: ownerSettings.data?.libraryName ?? ownerDashboard.data?.library?.name ?? null,
      subscriptionStatus: ownerBilling.data?.subscription?.status ?? null,
      renewalOrderId: renewal.data?.razorpayOrderId ?? null,
    },
    student: {
      seat: studentDashboard.data?.assignment?.seat_number ?? null,
      paymentRows: studentPayments.data?.payments?.length ?? 0,
      notificationRows: studentNotifications.data?.length ?? 0,
      qrKeyId: studentQr.data?.qrKeyId ?? null,
    },
    admin: {
      mrr: adminDashboard.data?.metrics?.mrr ?? null,
      libraries: adminDashboard.data?.metrics?.active_libraries ?? null,
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
