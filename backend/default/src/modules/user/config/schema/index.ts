import { z } from "@damatjs/deps/zod";
import { betterAuthSchema } from './betterAuth';

export const schema = z.object({
  // Better Auth
  betterAuth: betterAuthSchema,
});

export type schemaType = z.infer<typeof schema>;
