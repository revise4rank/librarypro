import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const webBase = process.env.BOOKLIB_WEB_URL ?? "http://127.0.0.1:3000";

const credentials = {
  owner: { login: "owner@booklib.demo", password: "owner123", path: "/owner/login", button: /open library workspace/i },
  student: { login: "student@booklib.demo", password: "student123", path: "/student/login?library=focuslibrary", button: /open student portal/i },
  admin: { login: "admin@booklib.demo", password: "admin123", path: "/superadmin/login", button: /login as super admin/i },
};

const auditedPages = [
  { key: "public-home", auth: "public", path: "/" },
  { key: "marketplace", auth: "public", path: "/marketplace" },
  { key: "library-slug-home", auth: "public", path: "/libraries/focus-library" },
  { key: "library-slug-pricing", auth: "public", path: "/libraries/focus-library/pricing" },
  { key: "library-slug-contact", auth: "public", path: "/libraries/focus-library/contact" },
  { key: "owner-dashboard", auth: "owner", path: "/owner/dashboard" },
  { key: "owner-plans", auth: "owner", path: "/owner/plans" },
  { key: "owner-coupons", auth: "owner", path: "/owner/coupons" },
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
  { key: "student-settings", auth: "student", path: "/student/settings" },
  { key: "student-qr", auth: "student", path: "/student/qr" },
  { key: "student-seat", auth: "student", path: "/student/seat" },
  { key: "superadmin-dashboard", auth: "admin", path: "/superadmin/dashboard" },
  { key: "superadmin-libraries", auth: "admin", path: "/superadmin/libraries" },
  { key: "superadmin-offers", auth: "admin", path: "/superadmin/offers" },
  { key: "superadmin-payments", auth: "admin", path: "/superadmin/payments" },
  { key: "superadmin-plans", auth: "admin", path: "/superadmin/plans" },
  { key: "superadmin-reviews", auth: "admin", path: "/superadmin/reviews" },
];

const safeClickText = /(all libraries|top libraries|offers|available seats|near me|filters|hide filters|show filters|account|security|library access|desk|requests|today|week|month|pending|paid|overdue|all|previous|next|relevance|price|nearest|rated|daily|weekly|monthly)/i;
const unsafeClickText = /(delete|remove|exit|logout|save|create|send|pay|approve|reject|assign|unassign|regenerate|upload|download|renew|change password|complete|start|reserve|submit|login|register|call|whatsapp|directions|view details|open|scan|checkout|check in|hide|restore|moderate|report|publish|contact|join|request access|make active)/i;

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function loginContext(browser, auth) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1024 } });
  if (auth === "public") return context;

  const page = await context.newPage();
  const creds = credentials[auth];
  await page.goto(`${webBase}${creds.path}`, { waitUntil: "load", timeout: 30000 });
  await page.getByPlaceholder(/email|phone|student id|mobile/i).fill(creds.login);
  await page.getByPlaceholder(/password/i).fill(creds.password);
  await page.getByRole("button", { name: creds.button }).click();
  await page.waitForFunction(() => document.cookie.includes("lp_session=1"), { timeout: 20000 });
  await page.close();
  return context;
}

function pageScanScript(stage) {
  return (scanStage) => {
    const normalizeColor = (() => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) return (value) => String(value);
      return (value) => {
        const input = String(value).trim();
        context.fillStyle = "#000000";
        context.fillStyle = input;
        return context.fillStyle || input;
      };
    })();

    function componentValue(value, scale = 255) {
      const token = String(value).trim();
      if (!token || token === "none") return 0;
      if (token.endsWith("%")) return (Number.parseFloat(token) / 100) * scale;
      return Number.parseFloat(token);
    }

    function alphaValue(value) {
      if (value === undefined) return 1;
      const token = String(value).trim();
      if (!token || token === "none") return 1;
      if (token.endsWith("%")) return Number.parseFloat(token) / 100;
      return Number.parseFloat(token);
    }

    function parseColor(value) {
      const input = String(value).trim();
      if (!input || input === "transparent") return { r: 0, g: 0, b: 0, a: 0 };

      const hex = input.match(/^#([0-9a-f]{3,8})$/i);
      if (hex) {
        const raw = hex[1];
        const full = raw.length <= 4
          ? raw.split("").map((char) => `${char}${char}`).join("")
          : raw;
        return {
          r: Number.parseInt(full.slice(0, 2), 16),
          g: Number.parseInt(full.slice(2, 4), 16),
          b: Number.parseInt(full.slice(4, 6), 16),
          a: full.length >= 8 ? Number.parseInt(full.slice(6, 8), 16) / 255 : 1,
        };
      }

      const rgb = input.match(/^rgba?\(([^)]+)\)$/i);
      if (rgb) {
        const parts = rgb[1]
          .replace(/\s*\/\s*/g, " ")
          .split(/[\s,]+/)
          .filter(Boolean);
        return {
          r: componentValue(parts[0]),
          g: componentValue(parts[1]),
          b: componentValue(parts[2]),
          a: alphaValue(parts[3]),
        };
      }

      const oklab = input.match(/^okl(?:ab|ch)\(\s*([0-9.]+%?)/i);
      if (oklab) {
        const lightness = oklab[1].endsWith("%") ? Number.parseFloat(oklab[1]) / 100 : Number.parseFloat(oklab[1]);
        const gray = Math.max(0, Math.min(255, lightness * 255));
        const alphaMatch = input.match(/\/\s*([0-9.]+%?)/);
        return { r: gray, g: gray, b: gray, a: alphaValue(alphaMatch?.[1]) };
      }

      return null;
    }

    function colorParts(value) {
      return parseColor(normalizeColor(value)) ?? parseColor(value);
    }

    function relativeLuminance(color) {
      const values = [color.r, color.g, color.b].map((part) => {
        const value = part / 255;
        return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
    }

    function contrastRatio(foreground, background) {
      const fg = relativeLuminance(foreground);
      const bg = relativeLuminance(background);
      const light = Math.max(fg, bg);
      const dark = Math.min(fg, bg);
      return (light + 0.05) / (dark + 0.05);
    }

    function effectiveBackground(node) {
      let current = node;
      while (current && current.nodeType === Node.ELEMENT_NODE) {
        const style = window.getComputedStyle(current);
        const color = colorParts(style.backgroundColor);
        if (color && color.a >= 0.65) return color;
        current = current.parentElement;
      }
      return { r: 255, g: 255, b: 255, a: 1 };
    }

    const controls = Array.from(document.querySelectorAll("button, a[href], [role='button'], [role='tab']"));
    return controls
      .map((node, index) => {
        const rect = node.getBoundingClientRect();
        const style = window.getComputedStyle(node);
        const text = (node.textContent || "").replace(/\s+/g, " ").trim();
        const visible = rect.width > 1 && rect.height > 1 && style.display !== "none" && style.visibility !== "hidden";
        if (!visible || text.length === 0) return null;

        const color = colorParts(style.color);
        const background = effectiveBackground(node);
        const contrast = color ? contrastRatio(color, background) : 0;
        const opacity = Number.parseFloat(style.opacity || "1");
        const disabled = node.matches(":disabled") || node.getAttribute("aria-disabled") === "true";
        const problem =
          !disabled &&
          (opacity < 0.35 ||
            (color?.a ?? 1) < 0.35 ||
            contrast < 2.2 ||
            rect.width < Math.min(28, text.length * 2));

        return {
          index,
          stage: scanStage,
          tag: node.tagName.toLowerCase(),
          text: text.slice(0, 90),
          className: typeof node.className === "string" ? node.className.slice(0, 240) : "",
          color: style.color,
          background: `rgb(${Math.round(background.r)}, ${Math.round(background.g)}, ${Math.round(background.b)})`,
          opacity,
          contrast: Math.round(contrast * 100) / 100,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          disabled,
          problem,
        };
      })
      .filter(Boolean);
  };
}

async function scanControls(page, stage) {
  return page.evaluate(pageScanScript(stage), stage);
}

async function safeClickControls(page) {
  const clickResults = [];
  const initial = await page.evaluate(() =>
    Array.from(document.querySelectorAll("button"))
      .map((node, index) => ({
        index,
        text: (node.textContent || "").replace(/\s+/g, " ").trim(),
        disabled: node.matches(":disabled") || node.getAttribute("aria-disabled") === "true",
        visible: (() => {
          const rect = node.getBoundingClientRect();
          const style = window.getComputedStyle(node);
          return rect.width > 1 && rect.height > 1 && style.display !== "none" && style.visibility !== "hidden";
        })(),
      }))
      .filter((item) => item.visible && !item.disabled && item.text),
  );

  const candidates = initial
    .filter((item) => safeClickText.test(item.text) && !unsafeClickText.test(item.text))
    .slice(0, 10);

  for (const candidate of candidates) {
    try {
      const button = page.locator("button").nth(candidate.index);
      await button.click({ timeout: 3000 });
      await page.waitForTimeout(450);
      const controls = await scanControls(page, `after click: ${candidate.text.slice(0, 40)}`);
      clickResults.push({ clicked: candidate.text, controls });
    } catch (error) {
      clickResults.push({
        clicked: candidate.text,
        clickError: error instanceof Error ? error.message : String(error),
        controls: [],
      });
    }
  }

  return clickResults;
}

async function auditPage(context, outputDir, spec) {
  const page = await context.newPage();
  await page.goto(`${webBase}${spec.path}`, { waitUntil: "load", timeout: 30000 });
  await page.waitForTimeout(1200);

  const initialControls = await scanControls(page, "initial");
  const clickResults = await safeClickControls(page);
  const finalControls = await scanControls(page, "final");
  const allControls = [
    ...initialControls,
    ...clickResults.flatMap((item) => item.controls),
    ...finalControls,
  ];
  const findings = allControls.filter((item) => item.problem);
  const screenshotPath = path.join(outputDir, `${spec.key}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  const finalUrl = page.url();
  await page.close();

  return {
    ...spec,
    finalUrl,
    screenshotPath,
    scannedControls: allControls.length,
    clickedControls: clickResults.map((item) => ({
      text: item.clicked,
      error: item.clickError ?? null,
    })),
    findings,
  };
}

async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputDir = path.join(process.cwd(), "artifacts", "button-visibility-audit", stamp);
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
              ...spec,
              finalUrl: `${webBase}${spec.path}`,
              screenshotPath: null,
              scannedControls: 0,
              clickedControls: [],
              findings: [{ stage: "audit", text: "Audit failed", reason: error instanceof Error ? error.message : String(error) }],
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
  const findings = reports.flatMap((report) =>
    report.findings.map((finding) => ({
      page: report.key,
      path: report.path,
      ...finding,
    })),
  );
  const findingsPath = path.join(outputDir, "findings.json");

  await fs.writeFile(reportPath, JSON.stringify(reports, null, 2), "utf8");
  await fs.writeFile(findingsPath, JSON.stringify(findings, null, 2), "utf8");

  console.log(JSON.stringify({
    outputDir,
    reportPath,
    findingsPath,
    totalPages: reports.length,
    totalFindings: findings.length,
    pagesWithFindings: reports.filter((report) => report.findings.length > 0).length,
    topFindings: findings.slice(0, 20),
  }, null, 2));

  if (findings.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
