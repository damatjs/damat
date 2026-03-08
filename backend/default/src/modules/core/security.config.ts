import { z } from "@damatjs/deps/zod";
import { createModuleConfig } from "@damatjs/utils/config";

export const schema = z.object({
  corsOrigin: z.string().default("*"),
  rateLimitRequestsPerMinute: z.coerce.number().default(60),
  rateLimitRequestsPerHour: z.coerce.number().default(1000),
  rateLimitRequestsPerDay: z.coerce.number().default(10000),
});

export type SecurityConfig = z.infer<typeof schema>;

export const securityConfig = createModuleConfig({
  name: "security",
  schema,
  load: (env) => ({
    corsOrigin: env.CORS_ORIGIN,
    rateLimitRequestsPerMinute: env.RATE_LIMIT_REQUESTS_PER_MINUTE,
    rateLimitRequestsPerHour: env.RATE_LIMIT_REQUESTS_PER_HOUR,
    rateLimitRequestsPerDay: env.RATE_LIMIT_REQUESTS_PER_DAY,
  }),
});
