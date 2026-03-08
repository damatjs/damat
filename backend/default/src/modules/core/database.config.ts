import { z } from "@damatjs/deps/zod";
import { createModuleConfig } from "@damatjs/utils/config";

export const schema = z.object({
  databaseUrl: z.string().url(),
  redisUrl: z.string().url().optional(),
});

export type DatabaseConfig = z.infer<typeof schema>;

export const databaseConfig = createModuleConfig({
  name: "database",
  schema,
  load: (env) => ({
    databaseUrl: env.DATABASE_URL,
    redisUrl: env.REDIS_URL,
  }),
});
