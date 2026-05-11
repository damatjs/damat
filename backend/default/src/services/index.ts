import { createLogger } from "@damatjs/utils";
import { createRedis } from "@damatjs/utils/redis";
import { setLogger, initWorkflowLock } from "@damatjs/workflow-engine";
import { setAuthRedis } from "../utils/auth";

let redis: any;

export const initServices = {
  logger: createLogger({ logLevel: "info", logFormat: "pretty" }),

  setup() {
    redis = createRedis({ url: process.env.REDIS_URL || "redis://localhost:6379" });
    setAuthRedis(redis);
    setLogger(this.logger);
    initWorkflowLock(redis);
    this.logger.info("Services initialized");
  },

  async redisCheck() {
    const start = Date.now();
    await redis.ping();
    return { status: "healthy", latency: Date.now() - start };
  },

  shutdown: [
    { name: "db", handler: async () => {} },
    { name: "redis", handler: async () => { if (redis) await redis.quit(); } },
  ],
};
