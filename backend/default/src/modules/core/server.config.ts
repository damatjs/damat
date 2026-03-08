import { z } from "@damatjs/deps/zod";
import { createModuleConfig } from "@damatjs/utils/config";

export const schema = z.object({
  port: z.coerce.number().default(3000),
  nodeEnv: z.enum(["development", "production", "test"]).default("development"),
  apiVersion: z.string().default("v1"),
  apiBaseUrl: z.string().url().optional(),
});

export type ServerConfig = z.infer<typeof schema>;

export const serverConfig = createModuleConfig({
  name: "server",
  schema,
  load: (env) => ({
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
    apiVersion: env.API_VERSION,
    apiBaseUrl: env.API_BASE_URL || env.BETTER_AUTH_URL,
  }),
});
