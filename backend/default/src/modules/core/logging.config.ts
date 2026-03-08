import { z } from "@damatjs/deps/zod";
import { createModuleConfig } from "@damatjs/utils/config";

export const schema = z.object({
  logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
  logFormat: z.enum(["json", "pretty"]).default("pretty"),
});

export type LoggingConfig = z.infer<typeof schema>;

export const loggingConfig = createModuleConfig({
  name: "logging",
  schema,
  load: (env) => ({
    logLevel: env.LOG_LEVEL,
    logFormat: env.LOG_FORMAT,
  }),
});
