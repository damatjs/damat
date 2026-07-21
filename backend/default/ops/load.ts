const base = process.env.TARGET_URL ?? "http://127.0.0.1:9000";
const total = Number(process.env.LOAD_REQUESTS ?? 1_000);
const concurrency = Number(process.env.LOAD_CONCURRENCY ?? 25);
const maxP95 = Number(process.env.LOAD_MAX_P95_MS ?? 500);
const maxErrorRate = Number(process.env.LOAD_MAX_ERROR_RATE ?? 0);
const timings: number[] = [];
let cursor = 0;
let failures = 0;

async function worker(): Promise<void> {
  while (cursor < total) {
    cursor += 1;
    const started = performance.now();
    try {
      const response = await fetch(`${base}/api/posts`, {
        headers: { connection: "keep-alive" },
      });
      if (!response.ok) failures += 1;
      await response.arrayBuffer();
    } catch {
      failures += 1;
    }
    timings.push(performance.now() - started);
  }
}

const started = performance.now();
await Promise.all(Array.from({ length: concurrency }, worker));
timings.sort((left, right) => left - right);
const percentile = (value: number) =>
  timings[Math.ceil(timings.length * value) - 1] ?? 0;
const result = {
  requests: timings.length,
  concurrency,
  failures,
  errorRate: failures / Math.max(timings.length, 1),
  requestsPerSecond: total / ((performance.now() - started) / 1_000),
  p50Ms: percentile(0.5),
  p95Ms: percentile(0.95),
  p99Ms: percentile(0.99),
};
console.log(JSON.stringify(result, null, 2));
if (result.errorRate > maxErrorRate || result.p95Ms > maxP95)
  throw new Error(
    `load acceptance failed (p95 <= ${maxP95}, errors <= ${maxErrorRate})`,
  );
