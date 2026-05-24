import autocannon from "autocannon";

const API_BASE = process.env.PERF_API_BASE ?? "http://127.0.0.1:4000";
const WEB_BASE = process.env.PERF_WEB_BASE ?? "http://127.0.0.1:3000";

function runScenario(title, options) {
  return new Promise((resolve, reject) => {
    console.log(`\n=== ${title} ===`);
    const instance = autocannon(options, (error, result) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(result);
    });
    autocannon.track(instance, {
      renderProgressBar: true,
      renderResultsTable: true,
      renderLatencyTable: true,
    });
  });
}

async function main() {
  console.log("LibraryPro performance smoke");
  console.log(`API: ${API_BASE}`);
  console.log(`WEB: ${WEB_BASE}`);

  const results = [];

  results.push(
    await runScenario("Marketplace search", {
      url: `${API_BASE}/v1/public/libraries/search?q=focus&city=Jaipur&limit=12&page=1`,
      connections: Number(process.env.PERF_CONNECTIONS ?? 50),
      duration: Number(process.env.PERF_DURATION_SECONDS ?? 20),
      pipelining: 1,
    }),
  );

  results.push(
    await runScenario("Public library profile", {
      url: `${API_BASE}/v1/public/libraries/focuslibrary`,
      connections: Number(process.env.PERF_CONNECTIONS ?? 50),
      duration: Number(process.env.PERF_DURATION_SECONDS ?? 20),
      pipelining: 1,
    }),
  );

  results.push(
    await runScenario("Marketplace page", {
      url: `${WEB_BASE}/marketplace`,
      connections: Math.max(10, Number(process.env.PERF_CONNECTIONS ?? 50) / 2),
      duration: Number(process.env.PERF_DURATION_SECONDS ?? 20),
      pipelining: 1,
    }),
  );

  const summary = results.map((result) => ({
    url: result.url,
    reqPerSec: Math.round(result.requests.average),
    latencyP99: Math.round(result.latency.p99),
    throughputKBps: Math.round(result.throughput.average / 1024),
    errors: result.errors,
    timeouts: result.timeouts,
  }));

  console.log("\nScale smoke summary:");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
