export function hostedProviderMessage(provider: string) {
  return (
    `"${provider}" is a hosted provider — it needs no local tables, so there is nothing to scaffold.\n` +
    `Install the adapter and set services.auth.provider in damat.config.ts:\n` +
    `  bun add @damatjs/auth-${provider} @damatjs/auth` +
    (provider === "clerk" ? " @clerk/backend" : " jose")
  );
}

export const AUTH_NEXT_STEPS = [
  "Next steps:",
  "  1. bun add @damatjs/auth-better-auth @damatjs/auth better-auth",
  "  2. bun damat-orm migrate:create auth_init   # diff the models -> a migration",
  "  3. bun damat-orm migrate:up                 # create the tables",
  "  4. add services.auth to damat.config.ts:",
  '       services: { auth: { provider: "better-auth", options: { secret: process.env.BETTER_AUTH_SECRET } } }',
  "  You own src/modules/auth — adjust the models to match your Better Auth version.",
].join("\n");
