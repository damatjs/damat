/**
 * The app's damat.config.ts. The `modules: {}` block is written even though it
 * starts empty — `damat module add` registers installed modules by inserting
 * into exactly this block (registerModuleInConfig matches `modules: {`).
 */
export function damatConfigTemplate(name: string): string {
  return `import { defineConfig } from "@damatjs/framework";

export default defineConfig({
  projectConfig: {
    releaseVersion: process.env.RELEASE_VERSION ?? "development",
    databaseUrl: process.env.DATABASE_URL ?? "",
    redisUrl: process.env.REDIS_URL,
    nodeEnv: "development",
    loggerConfig: {
      level: "debug",
      format: "pretty",
      timestamp: true,
      prefix: "${name}",
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
  runtime: {
    mode: "all",
    workers: ["jobs", "events", "pipelines"],
    shutdownGraceMs: 30_000,
  },
  services: {
    durability: {
      inspectionVisibility: "metadata",
      retentionMs: 90 * 24 * 60 * 60 * 1_000,
      acceleration: { enabled: true },
    },
    jobs: { queue: "default", concurrency: 2 },
    events: { durable: { concurrency: 2 } },
    pipelines: { queue: "pipelines", concurrency: 2, routerBatchSize: 100 },
  },
  // Installed modules are registered here by \`damat module add\`.
  modules: {},
});
`;
}
