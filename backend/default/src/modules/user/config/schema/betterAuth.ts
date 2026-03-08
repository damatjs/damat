import { z } from "@damatjs/deps/zod";


export const betterAuthSchema = z.object({
  // Better Auth
  betterAuthSecret: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  betterAuthUrl: z.string().url().optional(),
  sessionMaxAge: z.coerce.number().default(604800), // 7 days
  sessionUpdateAge: z.coerce.number().default(86400), // 1 day

  // OAuth providers (optional)
  googleClientId: z.string().optional(),
  googleClientSecret: z.string().optional(),
  githubClientId: z.string().optional(),
  githubClientSecret: z.string().optional(),

  // Admin
  adminSecret: z.string().optional(),
  superAdminEmail: z.string().email().optional(),
});

