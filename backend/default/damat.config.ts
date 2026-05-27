import { defineConfig, } from "@damatjs/framework";
import { loadEnv } from '@damatjs/utils';

loadEnv(process.env.NODE_ENV || "development", process.cwd());

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL ?? "",
    redisUrl: process.env.REDIS_URL,
    nodeEnv: "development",
    loggerConfig: {
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
    },
    http: {
      port: Number(process.env.PORT) || 6543,
      host: process.env.HOST || "0.0.0.0",
      corsConfig: process.env.FRONTEND_CORS,
    },
  },
  modules: [
    {
      resolve: "./src/modules/user",
      id: "user",
    },
  ],
});
