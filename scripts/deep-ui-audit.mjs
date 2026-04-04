import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const webBase = process.env.LIBRARYPRO_WEB_URL ?? "http://127.0.0.1:3000";

const credentials = {
  owner: { login: "owner@librarypro.demo", password: "owner123", path: "/owner/login", button: /login as owner/i },
  student: { login: "student@librarypro.demo", password: "student123", path: "/student/login?library=focuslibrary", button: /login as student/i },
  admin: { login: "admin@librarypro.demo", password: "admin123", path: "/superadmin/login", button: /login as super admin/i },
};

const auditedPages = [
  { key: "public-home", auth: "public", path: "/" },
  { key: "marketplace", auth: "public", path: "/marketplace" },
  { key: "library-slug-home", auth: "public", path: "/libraries/focus-library" },
  { key: "library-slug-about", auth: "public", path: "/libraries/focus-library/about" },
  { key: "library-slug-pricing", auth: "public", path: "/libraries/focus-library/pricing" },
  { key: "library-slug-contact", auth: "public", path: "/libraries/focus-library/contact" },
  { key: "library-subdomain-home", auth: "public", path: "/library-site?slug=focuslibrary" },
  { key: "owner-dashboard", auth: "owner", path: "/owner/dashboard" },
  { key: "owner-admissions", auth: "owner", path: "/owner/admissions" },
  { key: "owner-admins", auth: "owner", path: "/owner/admins" },
  { key: "owner-students", auth: "owner", path: "/owner/students" },
  { key: "owner-seats", auth: "owner", path: "/owner/seats" },
  { key: "owner-payments", auth: "owner", path: "/owner/payments" },
  { key: "owner-reports", auth: "owner", path: "/owner/reports" },
  { key: "owner-checkins", auth: "owner", path: "/owner/checkins" },
  { key: "owner-leads", auth: "owner", path: "/owner/leads" },
  { key: "owner-campaigns", auth: "owner", path: "/owner/campaigns" },
  { key: "owner-offers", auth: "owner", path: "/owner/offers" },
  { key: "owner-notifications", auth: "owner", path: "/owner/notifications" },
  { key: "owner-website", auth: "owner", path: "/owner/website" },
  { key: "owner-settings", auth: "owner", path: "/owner/settings" },
  { key: "owner-billing", auth: "owner", path: "/owner/billing" },
  { key: "student-dashboard", auth: "student", path: "/student/dashboard" },
  { key: "student-join-library", auth: "student", path: "/student/join-library" },
  { key: "student-focus", auth: "student", path: "/student/focus" },
  { key: "student-syllabus", auth: "student", path: "/student/syllabus" },
  { key: "student-revisions", auth: "student", path: "/student/revisions" },
  { key: "student-feed", auth: "student", path: "/student/feed" },
  { key: "student-offers", auth: "student", path: "/student/offers" },
  { key: "student-rewards", auth: "student", path: "/student/rewards" },
  { key: "student-payments", auth: "student", path: "/student/payments" },
  { key: "student-notifications", auth: "student", path: "/student/notifications" },
  { key: "student-qr", auth: "student", path: "/student/qr" },
  { key: "student-seat", auth: "student", path: "/student/seat" },
  { key: "student-focus-mode", auth: "student", path: "/student/focus-mode" },
  { key: "superadmin-dashboard", auth: "admin", path: "/superadmin/dashboard" },
  { key: "superadmin-libraries", auth: "admin", path: "/superadmin/libraries" },
  { key: "superadmin-offers", auth: "admin", path: "/superadmin/offers" },
  { key: "superadmin-payments", auth: "admin", path: "/superadmin/payments" },
  { key: "superadmin-plans", auth: "admin", path: "/superadmin/plans" },
  { key: "superadmin-reviews", auth: "admin", path: "/superadmin/reviews" },
];

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function loginContext(browser, auth) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1024 } });
  if (auth === "public") {
    return context;
  }

  const page = await context.newPage();
  const creds = credentials[auth];
  await page.goto(`${webBase}${creds.path}`, { waitUntil: "networkidle" });
  await page.getByPlaceholder(/email|phone|student id|mobile/i).fill(creds.login);
  await page.getByPlaceholder(/password/i).fill(creds.password);
  await page.getByRole("button", { name: creds.button }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForFunction(() => document.cookie.includes("lp_session=1"));
  await page.close();
  return context;
}

async function inspectPage(page) {
  return page.evaluate(() => {
    const collectText = (value) => (value || "").replace(/\s+/g, " ").trim();
    const links = Array.from(document.querySelectorAll("a[href]"))
      .map((node) => ({
        text: collectText(node.textContent).slice(0, 80),
        href: node.getAttribute("href") || "",
      }))
      .filter((item) => item.href && !item.href.startsWith("mailto:") && !item.href.startsWith("tel:"))
      .slice(0, 40);

    const buttons = Array.from(document.querySelectorAll("button"))
      .map((node) => collectText(node.textContent).slice(0, 80))
      .filter(Boolean)
      .slice(0, 30);

    const tiles = document.querySelectorAll("section, article").length;

    return {
      title: document.title,
      links,
      buttons,
      tiles,
    };
  });
}

async function auditPage(context, outputDir, spec) {
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  const failedRequests = [];
  let timedOut = false;

  page.on("pageerror", (error) => pageErrors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("requestfailed", (request) => {
    failedRequests.push({
      url: request.url(),
      error: request.failure()?.errorText ?? "unknown",
    });
  });

  try {
    await page.goto(`${webBase}${spec.path}`, { waitUntil: "networkidle", timeout: 30000 });
  } catch (error) {
    timedOut = true;
    await page.goto(`${webBase}${spec.path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2000);
    consoleErrors.push(`Navigation timeout fallback used: ${String(error)}`);
  }

  const finalUrl = page.url();
  const inspection = await inspectPage(page);
  const screenshotPath = path.join(outputDir, `${spec.key}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const findings = [];
  if (finalUrl.includes("/login") && spec.auth !== "public") {
    findings.push("Unexpected redirect to login");
  }
  if (timedOut) {
    findings.push("Navigation timeout fallback used");
  }
  if (pageErrors.length > 0) {
    findings.push(`Page errors: ${pageErrors.length}`);
  }
  if (consoleErrors.length > 0) {
    findings.push(`Console errors: ${consoleErrors.length}`);
  }
  if (failedRequests.length > 0) {
    findings.push(`Failed requests: ${failedRequests.length}`);
  }
  if (inspection.links.length === 0 && inspection.buttons.length === 0) {
    findings.push("Low interactive surface detected");
  }

  await page.close();

  return {
    key: spec.key,
    auth: spec.auth,
    path: spec.path,
    finalUrl,
    screenshotPath,
    tiles: inspection.tiles,
    linkCount: inspection.links.length,
    buttonCount: inspection.buttons.length,
    links: inspection.links,
    buttons: inspection.buttons,
    pageErrors,
    consoleErrors,
    failedRequests,
    findings,
  };
}

async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputDir = path.join(process.cwd(), "artifacts", "deep-ui-audit", stamp);
  await ensureDir(outputDir);

  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const reports = [];

  try {
    for (const auth of ["public", "owner", "student", "admin"]) {
      const context = await loginContext(browser, auth);
      try {
        for (const spec of auditedPages.filter((item) => item.auth === auth)) {
          try {
            reports.push(await auditPage(context, outputDir, spec));
          } catch (error) {
            reports.push({
              key: spec.key,
              auth: spec.auth,
              path: spec.path,
              finalUrl: `${webBase}${spec.path}`,
              screenshotPath: null,
              tiles: 0,
              linkCount: 0,
              buttonCount: 0,
              links: [],
              buttons: [],
              pageErrors: [],
              consoleErrors: [String(error)],
              failedRequests: [],
              findings: [`Audit failed: ${String(error)}`],
            });
          }
        }
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  const reportPath = path.join(outputDir, "report.json");
  await fs.writeFile(reportPath, JSON.stringify(reports, null, 2), "utf8");

  const findingsOnly = reports.map((item) => ({
    key: item.key,
    path: item.path,
    findings: item.findings,
    screenshotPath: item.screenshotPath,
  }));

  const findingsPath = path.join(outputDir, "findings.json");
  await fs.writeFile(findingsPath, JSON.stringify(findingsOnly, null, 2), "utf8");

  console.log(JSON.stringify({
    outputDir,
    reportPath,
    findingsPath,
    totalPages: reports.length,
    pagesWithFindings: findingsOnly.filter((item) => item.findings.length > 0).length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
