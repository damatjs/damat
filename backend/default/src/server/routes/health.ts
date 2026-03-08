/**
 * Health Check Route
 * Provides health status endpoint for monitoring
 */

import { Hono } from "@damatjs/deps/hono";
import { getRedis } from "@/lib/redis";

/**
 * Create health check route handler
 */
export function createHealthRoute(): Hono {
  const healthRouter = new Hono();

  /**
   * GET /health
   * Health check endpoint
   */
  healthRouter.get("/health", async (c) => {
    const checks: Record<string, { status: string; latency?: number }> = {};

    // Database check
    try {
      const dbStart = Date.now();
      // const db = getDb();
      // await db.$queryRaw`SELECT 1`;
      checks.database = { status: "healthy", latency: Date.now() - dbStart };
    } catch (err) {
      checks.database = { status: "unhealthy" };
    }

    // Redis check
    try {
      const redisStart = Date.now();
      const redis = getRedis();
      await redis.ping();
      checks.redis = { status: "healthy", latency: Date.now() - redisStart };
    } catch (err) {
      checks.redis = { status: "unhealthy" };
    }

    const allHealthy = Object.values(checks).every(
      (check) => check.status === "healthy",
    );

    return c.json(
      {
        status: allHealthy ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
        version: "2.0.0",
        checks,
      },
      allHealthy ? 200 : 503,
    );
  });

  return healthRouter;
}
