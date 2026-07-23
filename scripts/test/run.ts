import { reportCiFailure, runDiagnosed } from "./ci-diagnostics";
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

if (
  !(await runDiagnosed(["bun", "test", "--max-concurrency=1", "scripts/tests"]))
) {
  process.exit(process.exitCode);
}

const managed = await startTestPostgres().catch((error) => {
  reportCiFailure("PostgreSQL test setup failed", error);
  throw error;
});
let redis: Awaited<ReturnType<typeof startTestRedis>> | undefined;
try {
  redis = await startTestRedis().catch((error) => {
    reportCiFailure("Redis test setup failed", error);
    throw error;
  });
  const databaseUrl = process.env.DATABASE_URL ?? managed.url;
  const recoveryUrl = managed.packageUrls.DAMAT_RECOVERY_DATABASE_URL;
  await prepareRecoveryDatabase(recoveryUrl);
  const turboArgs = process.argv.slice(2);
  const passed = await run(
    [
      "bunx",
      "turbo",
      "run",
      "test",
      "--concurrency=1",
      "--output-logs=errors-only",
      ...turboArgs,
    ],
    {
      ...process.env,
      ...managed.packageUrls,
      DATABASE_URL: databaseUrl,
      DAMAT_RECOVERY_REDIS_URL: redis.url,
    },
  );
  if (passed && turboArgs.length === 0) {
    const consumerPassed = await run(
      [
        "bun",
        "test",
        "--max-concurrency=1",
        "scripts/tests/release-consumer.test.ts",
      ],
      {
        ...process.env,
        ...managed.packageUrls,
        DATABASE_URL: databaseUrl,
        DAMAT_RECOVERY_REDIS_URL: redis.url,
        DAMAT_RELEASE_CONSUMER_TEST: "1",
      },
    );
    if (consumerPassed) await run(["bun", "scripts/check-coverage-sources.ts"]);
  }
} finally {
  if (redis?.name) await stopTestRedis(redis.name);
  if (managed.name) await stopTestPostgres(managed.name);
}
