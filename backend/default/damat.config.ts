import { defineConfig } from "@damatjs/framework";
import "./src/events";
import "./src/jobs";
import "./src/pipelines";
import { referenceInspectionPolicy } from "./src/examples/inspectionPolicy";
import {
  assertProductionEnvironment,
  installMetricsMiddleware,
  installMetricsRoute,
} from "./src/operations";

const production = process.env.NODE_ENV === "production";

export default defineConfig({
  projectConfig: {
    releaseVersion: process.env.RELEASE_VERSION ?? "development",
    databaseUrl: process.env.DATABASE_URL ?? "",
    redisUrl: process.env.REDIS_URL,
    nodeEnv:
      process.env.NODE_ENV === "production"
        ? "production"
        : process.env.NODE_ENV === "test"
          ? "test"
          : "development",
    loggerConfig: {
      level: production ? "info" : "debug",
      format: production ? "json" : "pretty",
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
  hooks: {
    beforeServices: assertProductionEnvironment,
    beforeRoutes: installMetricsMiddleware,
    afterRoutes: installMetricsRoute,
  },
  runtime: {
    mode: "all",
    workers: ["jobs", "events", "pipelines"],
    shutdownGraceMs: 30_000,
  },
  services: {
    durability: referenceInspectionPolicy,
    jobs: { queue: "reports", concurrency: 2 },
    events: { durable: { concurrency: 2 } },
    pipelines: { concurrency: 2, routerBatchSize: 100 },
  },
  modules: {
    user: {
      resolve: "./src/modules/user",
      id: "user",
    },
    organization: {
      resolve: "./src/modules/organization",
      id: "organization",
    },
  },
  // Cross-module links live in src/links and are registered as a `link` module
  // for boot, migrations, and type generation.
  links: "./src/links",
});
