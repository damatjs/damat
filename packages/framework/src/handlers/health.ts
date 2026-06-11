import { Hono } from "@damatjs/deps/hono";
import { HealthCheckOptions } from './type';

export function createHealthRoute(options?: HealthCheckOptions, entryPathUrl?: string): Hono {
  const healthRouter = new Hono();

  healthRouter.get(entryPathUrl || "/health", async (c) => {
    const checks: Record<string, { status: string; latency?: number }> = {};

    if (options?.checks?.database) {
      try {
        checks.database = await options.checks.database();
      } catch (err) {
        checks.database = { status: "unhealthy" };
      }
    }

    if (options?.checks?.redis) {
      try {
        checks.redis = await options.checks.redis();
      } catch (err) {
        checks.redis = { status: "unhealthy" };
      }
    }

    // A service that was never configured must not fail the health check
    const allHealthy = Object.values(checks).every(
      (check) => check.status === "healthy" || check.status === "not configured",
    );

    return c.json(
      {
        status: allHealthy ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
        version: options?.version || "2.0.0",
        checks,
      },
      allHealthy ? 200 : 503,
    );
  });

  return healthRouter;
}
