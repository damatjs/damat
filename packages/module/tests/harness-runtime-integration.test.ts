import { expect, test } from "bun:test";
import { join } from "node:path";

const databaseUrl = process.env.DATABASE_URL;
const fixture = join(import.meta.dir, "fixtures/harness-module");

test.skipIf(!databaseUrl)(
  "harness applies custom migrations, catalogs, and failure cleanup",
  async () => {
    const child = Bun.spawn([process.execPath, join(fixture, "run.ts")], {
      cwd: fixture,
      env: { ...process.env, LOG_LEVEL: "fatal" },
      stdout: "pipe",
      stderr: "pipe",
    });
    const [code, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ]);
    expect(code, stderr).toBe(0);
    const result = stdout.match(/^HARNESS_RESULT=(.+)$/m)?.[1];
    expect(result).toBeDefined();
    expect(JSON.parse(result!)).toEqual({
      tables: {
        domain: "harness_fixture_records",
        events: "_damat_event_outbox",
      },
      rejected: true,
      poolReleased: true,
    });
  },
  15_000,
);
