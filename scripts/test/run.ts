import { startTestPostgres, stopTestPostgres } from "./postgres";
import { startTestRedis, stopTestRedis } from "./redis";
import { prepareRecoveryDatabase } from "./recovery";

async function run(command: string[], env = process.env): Promise<boolean> {
  const child = Bun.spawn(command, {
    env,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await child.exited;
  if (exitCode !== 0) process.exitCode = exitCode;
  return exitCode === 0;
}

if (!(await run(["bun", "test", "scripts/tests"]))) {
  process.exit(process.exitCode);
}

const managed = await startTestPostgres();
let redis: Awaited<ReturnType<typeof startTestRedis>> | undefined;
try {
  redis = await startTestRedis();
  const databaseUrl = process.env.DATABASE_URL ?? managed.url;
  const recoveryUrl = managed.packageUrls.DAMAT_RECOVERY_DATABASE_URL;
  await prepareRecoveryDatabase(recoveryUrl);
  const turboArgs = process.argv.slice(2);
  const passed = await run(
    ["bunx", "turbo", "run", "test", "--concurrency=1", ...turboArgs],
    {
      ...process.env,
      ...managed.packageUrls,
      DATABASE_URL: databaseUrl,
      DAMAT_RECOVERY_REDIS_URL: redis.url,
    },
  );
  if (passed && turboArgs.length === 0) {
    await run(["bun", "scripts/check-coverage-sources.ts"]);
  }
} finally {
  if (redis) await stopTestRedis(redis.name);
  await stopTestPostgres(managed.name);
}
