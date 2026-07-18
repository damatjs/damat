import { startTestPostgres, stopTestPostgres } from "./postgres";

async function run(command: string[], env = process.env): Promise<void> {
  const child = Bun.spawn(command, {
    env,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await child.exited;
  if (exitCode !== 0) process.exitCode = exitCode;
}

await run(["bun", "test", "scripts/tests"]);
if (process.exitCode) process.exit(process.exitCode);

const managed = await startTestPostgres();
try {
  const databaseUrl = process.env.DATABASE_URL ?? managed.url;
  await run(
    [
      "bunx",
      "turbo",
      "run",
      "test",
      "--concurrency=1",
      ...process.argv.slice(2),
    ],
    {
      ...process.env,
      ...managed.packageUrls,
      DATABASE_URL: databaseUrl,
    },
  );
} finally {
  await stopTestPostgres(managed.name);
}
