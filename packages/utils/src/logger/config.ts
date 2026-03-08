import { z } from "@damatjs/deps/zod";

export const schema = z.object({
  logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
  logFormat: z.enum(["json", "pretty"]).default("pretty"),
});

export const loadConfig = (env: NodeJS.ProcessEnv) => ({
  logLevel: env.LOG_LEVEL,
  logFormat: env.LOG_FORMAT,
});
