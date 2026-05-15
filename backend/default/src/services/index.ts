import { createLogger, setGlobalLogger, getLogger } from "@damatjs/logger";
import { initRedis, getRedis, disconnectRedis } from "@damatjs/utils";
import { initWorkflowLock } from "@damatjs/workflow-engine";

export const initServices = {
  logger: createLogger({
    level: "debug",
    format: "pretty",
    timestamp: true,
    prefix: "server",
    file: {
      enabled: process.env.LOG_FILE === "true",
      dir: process.env.LOG_DIR || "logs",
      errorFile: "error.log",
      allFile: "all.log",
      maxSizeBytes: 10 * 1024 * 1024,
      bufferFlushMs: 1000,
    },
  }),

  setup() {
    initRedis({ url: process.env.REDIS_URL || "redis://localhost:6379" });
    setGlobalLogger(this.logger);
    initWorkflowLock(getRedis());
    this.logger.info("Services initialized", {
      redis: process.env.REDIS_URL || "redis://localhost:6379",
      env: process.env.NODE_ENV || "development",
    });
  },

  async redisCheck() {
    const start = Date.now();
    const redis = getRedis();
    await redis.ping();
    const latency = Date.now() - start;
    this.logger.debug("Redis health check", { latency, status: "healthy" });
    return { status: "healthy", latency };
  },

  shutdown: [
    {
      name: "logger",
      handler: async () => {
        const logger = getLogger();
        logger.info("Shutting down logger");
        logger.close();
      },
    },
    { name: "db", handler: async () => { } },
    { name: "redis", handler: async () => { await disconnectRedis(); } },
  ],
};
