export function manifestTemplate(): string {
  return `${JSON.stringify(
    {
      name: "auth",
      version: "0.1.0",
      description: "Better Auth storage tables (user/session/account/verification).",
      paths: { entry: "./index.ts", models: "./models", migrations: "./migrations" },
    },
    null,
    2,
  )}\n`;
}
