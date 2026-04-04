import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const webBase = process.env.LIBRARYPRO_WEB_URL ?? "http://127.0.0.1:3000";

const ownerCredentials = { login: "owner@librarypro.demo", password: "owner123" };
const studentCredentials = { login: "student@librarypro.demo", password: "student123" };

const viewports = [
  { name: "320", width: 320, height: 900 },
  { name: "375", width: 375, height: 900 },
  { name: "390", width: 390, height: 900 },
  { name: "430", width: 430, height: 932 },
];

const pages = [
  { key: "marketplace", path: "/marketplace", auth: "public" },
  { key: "library_home", path: "/libraries/focuslibrary", auth: "public" },
  { key: "library_site", path: "/library-site?slug=focuslibrary", auth: "public" },
  { key: "owner_reports", path: "/owner/reports", auth: "owner" },
  { key: "owner_payments", path: "/owner/payments", auth: "owner" },
  { key: "owner_seats", path: "/owner/seats", auth: "owner" },
  { key: "student_focus", path: "/student/focus", auth: "student" },
  { key: "student_syllabus", path: "/student/syllabus", auth: "student" },
  { key: "student_revisions", path: "/student/revisions", auth: "student" },
];

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function inspectPage(page) {
  return page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const doc = document.documentElement;
    const body = document.body;

    const offenders = Array.from(document.querySelectorAll("body *"))
      .map((node) => {
        const rect = node.getBoundingClientRect();
        const style = window.getComputedStyle(node);
        const text = (node.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80);
        return {
          tag: node.tagName.toLowerCase(),
          classes: node.className || "",
          text,
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          overflowX: style.overflowX,
        };
      })
      .filter((item) => item.right > viewportWidth + 2 || item.left < -2)
      .slice(0, 20);

    const stickyFixed = Array.from(document.querySelectorAll("body *"))
      .map((node) => {
        const style = window.getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        const text = (node.textContent || "").replace(/\s+/g, " ").trim().slice(0, 50);
        return {
          tag: node.tagName.toLowerCase(),
          position: style.position,
          top: rect.top,
          bottom: rect.bottom,
          height: rect.height,
          text,
        };
      })
      .filter((item) => item.position === "fixed" || item.position === "sticky")
      .slice(0, 20);

    return {
      title: document.title,
      bodyScrollWidth: body.scrollWidth,
      docScrollWidth: doc.scrollWidth,
      innerWidth: viewportWidth,
      hasHorizontalOverflow: doc.scrollWidth > viewportWidth + 2 || body.scrollWidth > viewportWidth + 2,
      offenders,
      stickyFixed,
    };
  });
}

async function runForContext(browser, auth, outputDir) {
  const context = await browser.newContext();
  if (auth === "owner" || auth === "student") {
    const page = await context.newPage();
    const credentials = auth === "owner" ? ownerCredentials : studentCredentials;
    const loginPath = auth === "owner" ? "/owner/login" : "/student/login?library=focuslibrary";

    await page.goto(`${webBase}${loginPath}`, { waitUntil: "networkidle" });
    await page.getByPlaceholder(/email|phone|student id|mobile/i).fill(credentials.login);
    await page.getByPlaceholder(/password/i).fill(credentials.password);
    await page.getByRole("button", {
      name: auth === "owner" ? /login as owner/i : /login as student/i,
    }).click();
    await page.waitForLoadState("networkidle");
    await page.waitForFunction(() => document.cookie.includes("lp_session=1"));
    await page.close();
  }
  return { context, outputDir };
}

async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputDir = path.join(process.cwd(), "artifacts", "mobile-qa", stamp);
  await ensureDir(outputDir);

  const browser = await chromium.launch({
    headless: true,
    channel: "chrome",
  });
  const reports = [];

  try {
    for (const auth of ["public", "owner", "student"]) {
      const { context } = await runForContext(browser, auth, outputDir);
      try {
        for (const pageSpec of pages.filter((item) => item.auth === auth)) {
          for (const viewport of viewports) {
            const page = await context.newPage({ viewport: { width: viewport.width, height: viewport.height } });
            const url = `${webBase}${pageSpec.path}`;
            await page.goto(url, { waitUntil: "networkidle" });
            await page.screenshot({
              path: path.join(outputDir, `${pageSpec.key}-${viewport.name}.png`),
              fullPage: true,
            });

            const inspection = await inspectPage(page);
            reports.push({
              page: pageSpec.key,
              path: pageSpec.path,
              auth,
              viewport: viewport.name,
              width: viewport.width,
              height: viewport.height,
              status: page.url(),
              ...inspection,
            });

            await page.close();
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

  const summary = reports.map((item) => ({
    page: item.page,
    viewport: item.viewport,
    overflow: item.hasHorizontalOverflow,
    offenderCount: item.offenders.length,
  }));

  console.log(JSON.stringify({ outputDir, reportPath, summary }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
