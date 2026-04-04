const webBase = process.env.LIBRARYPRO_WEB_URL ?? "http://127.0.0.1:3000";

const checks = [
  ["/", 200],
  ["/marketplace", 200],
  ["/libraries/focus-library", 200],
  ["/libraries/focus-library/about", 200],
  ["/libraries/focus-library/pricing", 200],
  ["/libraries/focus-library/contact", 200],
  ["/library-site?slug=focuslibrary", 200],
  ["/owner/login", 200],
  ["/student/login", 200],
  ["/superadmin/login", 200],
  ["/owner/dashboard", 307],
  ["/owner/students", 307],
  ["/owner/payments", 307],
  ["/student/dashboard", 307],
  ["/student/join-library", 307],
  ["/student/revisions", 307],
  ["/student/offers", 307],
  ["/superadmin/dashboard", 307],
  ["/superadmin/reviews", 307],
];

async function main() {
  const results = [];
  for (const [path, expected] of checks) {
    const response = await fetch(`${webBase}${path}`, { redirect: "manual" });
    results.push({
      path,
      expected,
      actual: response.status,
      ok: response.status === expected,
    });
  }

  const failed = results.filter((item) => !item.ok);
  console.info(JSON.stringify({ ok: failed.length === 0, results }, null, 2));
  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }));
  process.exit(1);
});
