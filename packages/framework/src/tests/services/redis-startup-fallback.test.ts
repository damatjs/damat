import { expect, mock, test } from "bun:test";
import type { ILogger } from "@damatjs/logger";
import type { AppConfig } from "../../config";
import type { ServiceInstances } from "../../services/types";

let redisFailure = "Redis unavailable";

class UnavailableRedis {
  on() {
    return this;
  }
  async ping() {
    throw new Error(redisFailure);
  }
  async quit() {}
}

mock.module("@damatjs/deps/ioredis", () => ({
  Redis: UnavailableRedis,
  default: UnavailableRedis,
}));

const { initializeRedis } = await import("../../services/initialize/redis");
const { hasRedis } = await import("../../services/redis");
const { startWorkerWakeups } = await import("../../runtime/startWorkerWakeups");

for (const failure of [
  "Redis unavailable",
  "WRONGPASS invalid username-password pair",
]) {
  test(`continues with PostgreSQL fallback: ${failure}`, async () => {
    redisFailure = failure;
    const warnings: unknown[][] = [];
    const logger = {
      warn: (...args: unknown[]) => warnings.push(args),
      error: () => {},
    } as unknown as ILogger;
    const config = {
      projectConfig: {
        http: { port: 3000, host: "localhost" },
        redisUrl: "redis://localhost:6379",
      },
    } as AppConfig;
    const instances: ServiceInstances = {
      healthChecks: {},
      shutdownHandlers: [],
      durabilityCoordinator: {} as never,
    };
    await initializeRedis(config, instances, logger);
    expect(hasRedis()).toBe(false);
    expect(() =>
      startWorkerWakeups(config, instances, logger, {}),
    ).not.toThrow();
    expect(instances.shutdownHandlers).toEqual([]);
    expect((await instances.healthChecks!.redis!()).status).toBe("unhealthy");
    expect(warnings[0]?.[0]).toContain("continuing without acceleration");
  });
}
