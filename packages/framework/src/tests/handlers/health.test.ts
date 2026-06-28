import { describe, it, expect } from "bun:test";
import { createHealthRoute } from "../../handlers/health";

describe("createHealthRoute", () => {
  it("returns healthy status when no checks are configured", async () => {
    const healthRouter = createHealthRoute();
    const res = await healthRouter.request("/health");
    const data = (await res.json()) as { status: string; timestamp: string; version: string; checks: Record<string, unknown> };

    expect(res.status).toBe(200);
    expect(data).toHaveProperty("status", "healthy");
    expect(data).toHaveProperty("timestamp");
    expect(data).toHaveProperty("version");
    expect(data).toHaveProperty("checks");
  });

  it("returns healthy when all checks pass", async () => {
    const healthRouter = createHealthRoute({
      checks: {
        database: async () => ({ status: "healthy", latency: 5 }),
        redis: async () => ({ status: "healthy", latency: 2 }),
      },
    });

    const res = await healthRouter.request("/health");
    const data = (await res.json()) as { status: string; checks: { database: { status: string; latency: number }; redis: { status: string; latency: number } } };

    expect(res.status).toBe(200);
    expect(data.status).toBe("healthy");
    expect(data.checks.database).toEqual({ status: "healthy", latency: 5 });
    expect(data.checks.redis).toEqual({ status: "healthy", latency: 2 });
  });

  it("returns degraded status when a check fails", async () => {
    const healthRouter = createHealthRoute({
      checks: {
        database: async () => {
          throw new Error("Connection refused");
        },
      },
    });

    const res = await healthRouter.request("/health");
    const data = (await res.json()) as { status: string; checks: { database: { status: string } } };

    expect(res.status).toBe(503);
    expect(data.status).toBe("degraded");
    expect(data.checks.database).toEqual({ status: "unhealthy" });
  });

  it("returns degraded status when the redis check throws", async () => {
    const healthRouter = createHealthRoute({
      checks: {
        redis: async () => {
          throw new Error("Redis down");
        },
      },
    });

    const res = await healthRouter.request("/health");
    const data = (await res.json()) as { status: string; checks: { redis: { status: string } } };

    expect(res.status).toBe(503);
    expect(data.status).toBe("degraded");
    expect(data.checks.redis).toEqual({ status: "unhealthy" });
  });

  it("returns degraded when some checks are unhealthy", async () => {
    const healthRouter = createHealthRoute({
      checks: {
        database: async () => ({ status: "healthy", latency: 5 }),
        redis: async () => ({ status: "unhealthy" }),
      },
    });

    const res = await healthRouter.request("/health");
    const data = (await res.json()) as { status: string };

    expect(res.status).toBe(503);
    expect(data.status).toBe("degraded");
  });

  it("uses custom version when provided", async () => {
    const healthRouter = createHealthRoute({
      version: "1.0.0-beta",
    });

    const res = await healthRouter.request("/health");
    const data = (await res.json()) as { version: string };

    expect(data.version).toBe("1.0.0-beta");
  });

  it("uses default version when not provided", async () => {
    const healthRouter = createHealthRoute();

    const res = await healthRouter.request("/health");
    const data = (await res.json()) as { version: string };

    expect(data.version).toBe("2.0.0");
  });

  it("returns valid ISO timestamp", async () => {
    const healthRouter = createHealthRoute();

    const res = await healthRouter.request("/health");
    const data = (await res.json()) as { timestamp: string };

    const timestamp = new Date(data.timestamp);
    expect(timestamp).toBeInstanceOf(Date);
    expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
  });
});
