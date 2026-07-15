export function readmeTemplate(): string {
  return `# auth (Better Auth storage)

Damat-native models for Better Auth's core tables. You own these files — the
\`@damatjs/auth-better-auth\` adapter only READS and WRITES these tables (by the
names below); it never creates or migrates them.

## Apply the schema

\`\`\`bash
bun damat-orm migrate:create auth_init   # diff these models -> a migration
bun damat-orm migrate:up                 # create the tables
\`\`\`

## Wire the adapter

\`\`\`ts
// damat.config.ts
services: {
  auth: {
    provider: "better-auth",
    options: {
      secret: process.env.BETTER_AUTH_SECRET,
      // tables default to user/session/account/verification — override here if you renamed them
    },
  },
}
\`\`\`

Adjust the models if your Better Auth version or plugins add fields, then
re-run \`migrate:create\`.
`;
}
