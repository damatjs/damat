import { Hono } from "@damatjs/deps/hono";

export interface HealthCheckFn {
  (): Promise<{ status: string; latency?: number }>;
}

export interface HealthCheckOptions {
  checks?: {
    database?: HealthCheckFn;
    redis?: HealthCheckFn;
  };
  version?: string;
}

export function createHealthRoute(options?: HealthCheckOptions): Hono {
  const healthRouter = new Hono();

  healthRouter.get("/health", async (c) => {
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

    const allHealthy = Object.values(checks).every(
      (check) => check.status === "healthy",
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
