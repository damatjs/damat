import { describe, expect, test } from "bun:test";
import { join } from "node:path";

const runLive = test.skipIf(!process.env.DATABASE_URL);

describe("standalone durable module integration", () => {
  runLive(
    "runs custom providers, CRUD, and PostgreSQL-only workers",
    async () => {
      const fixture = join(
        import.meta.dir,
        "fixtures",
        "durable-module",
        "run.ts",
      );
      const child = Bun.spawn([process.execPath, fixture], {
        cwd: join(import.meta.dir, "fixtures", "durable-module"),
        env: { ...process.env, LOG_LEVEL: "fatal", REDIS_URL: "" },
        stdout: "pipe",
        stderr: "pipe",
      });
      const [exitCode, stdout, stderr] = await Promise.all([
        child.exited,
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
      ]);
      expect(exitCode, stderr).toBe(0);
      const marker = stdout
        .split("\n")
        .find((line) => line.startsWith("STANDALONE_RESULT="));
      expect(marker, stdout).toBeDefined();
      const result = JSON.parse(marker!.slice("STANDALONE_RESULT=".length));
      expect(result.health).toBe(200);
      expect(result.records.records.length).toBeGreaterThan(0);
      expect(result.job).toBe("succeeded");
      expect(result.events).toEqual([
        { consumer: "fixture.audit", status: "succeeded" },
        { consumer: "fixture.notify", status: "succeeded" },
      ]);
      expect(result.pipeline).toBe("succeeded");
      expect(result.readiness[1]).toContain("/api");
      expect(result.portReleased).toBe(true);
    },
    25_000,
  );

  runLive(
    "starts a producer-only durable event router without a consumer worker",
    async () => {
      const root = join(import.meta.dir, "fixtures", "producer-event-module");
      const child = Bun.spawn([process.execPath, join(root, "run.ts")], {
        cwd: root,
        env: { ...process.env, LOG_LEVEL: "fatal", REDIS_URL: "" },
        stdout: "pipe",
        stderr: "pipe",
      });
      const [code, stdout, stderr] = await Promise.all([
        child.exited,
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
      ]);
      expect(code, stderr).toBe(0);
      const result = stdout.match(/^PRODUCER_EVENT_RESULT=(.+)$/m)?.[1];
      expect(result).toBeDefined();
      expect(JSON.parse(result!)).toEqual({
        health: 200,
        portReleased: true,
      });
    },
    15_000,
  );
});
