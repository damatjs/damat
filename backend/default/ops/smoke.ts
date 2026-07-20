const base = process.env.TARGET_URL ?? "http://127.0.0.1:9000";
const token = process.env.METRICS_TOKEN;
if (!token) throw new Error("METRICS_TOKEN is required");

async function waitForHealth(): Promise<Record<string, unknown>> {
  const deadline = Date.now() + Number(process.env.SMOKE_TIMEOUT_MS ?? 90_000);
  let last = "no response";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${base}/health`);
      last = await response.text();
      if (response.ok) return JSON.parse(last) as Record<string, unknown>;
    } catch (error) {
      last = String(error);
    }
    await Bun.sleep(500);
  }
  throw new Error(`health did not become ready: ${last}`);
}

const health = await waitForHealth();
if (health.status !== "healthy")
  throw new Error(`unexpected health: ${health.status}`);
const posts = await fetch(`${base}/api/posts`);
const postsBody: unknown = posts.ok ? await posts.json() : undefined;
const routeSucceeded =
  typeof postsBody === "object" &&
  postsBody !== null &&
  "success" in postsBody &&
  postsBody.success === true;
if (!routeSucceeded)
  throw new Error("HTTP route smoke failed");
if ((await fetch(`${base}/metrics`)).status !== 401)
  throw new Error("metrics endpoint is not protected");
const metrics = await fetch(`${base}/metrics`, {
  headers: { authorization: `Bearer ${token}` },
});
if (
  !metrics.ok ||
  !(await metrics.text()).includes("damat_http_requests_total")
)
  throw new Error("authenticated metrics smoke failed");
console.log(
  JSON.stringify({ health, routes: "passed", metrics: "passed" }, null, 2),
);
