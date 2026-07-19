import { timingSafeEqual } from "node:crypto";
import type { LifecycleHookContext } from "@damatjs/framework";
import { metrics } from "./metrics-state";

function authorized(header: string | undefined): boolean {
  const expected = `Bearer ${process.env.METRICS_TOKEN ?? ""}`;
  if (!header || header.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(header), Buffer.from(expected));
}

function exposition(): string {
  const memory = process.memoryUsage();
  const values: Array<[string, number]> = [
    ["damat_uptime_seconds", (Date.now() - metrics.startedAt) / 1000],
    ["damat_http_requests_total", metrics.requests],
    ["damat_http_errors_total", metrics.errors],
    ["damat_http_request_duration_ms_sum", metrics.durationMs],
    ["damat_process_resident_memory_bytes", memory.rss],
    ["damat_process_heap_used_bytes", memory.heapUsed],
  ];
  return `${values.map(([name, value]) => `${name} ${value}`).join("\n")}\n`;
}

export function installMetricsMiddleware({ app }: LifecycleHookContext): void {
  if (!app) throw new Error("metrics middleware requires the HTTP application");
  app.use("*", async (context, next) => {
    const started = performance.now();
    await next();
    metrics.requests += 1;
    metrics.durationMs += performance.now() - started;
    if (context.res.status >= 500) metrics.errors += 1;
  });
}

export function installMetricsRoute({ app }: LifecycleHookContext): void {
  if (!app) throw new Error("metrics route requires the HTTP application");
  app.get("/metrics", (context) => {
    if (!authorized(context.req.header("authorization")))
      return context.json({ error: "Unauthorized" }, 401);
    return context.body(exposition(), 200, {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
      "Cache-Control": "no-store",
    });
  });
}
