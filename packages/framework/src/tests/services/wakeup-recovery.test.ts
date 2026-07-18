import { expect, test } from "bun:test";
import type {
  AccelerationMode,
  DurabilityCoordinator,
} from "@damatjs/durability";
import type { Redis } from "@damatjs/redis";
import { WorkerWakeupTransport } from "../../services/initialize/wakeupTransport";
import { FakeWakeupRedis } from "./wakeup-transport-fixture";

test("Redis authorization recovery restores acceleration without restart", async () => {
  const redis = new FakeWakeupRedis();
  redis.subscribeError = new Error("NOPERM No permissions to access a channel");
  let mode: AccelerationMode = "degraded";
  const coordinator: DurabilityCoordinator = {
    get mode() {
      return mode;
    },
    setMode: (value) => void (mode = value),
    pollInterval: (fallback) => (mode === "healthy" ? 30_000 : fallback),
    run: (_key, operation) => operation(),
  };
  const warnings: string[] = [];
  const infos: string[] = [];
  const transport = new WorkerWakeupTransport(
    redis as unknown as Redis,
    coordinator,
    { job: { id: "job", inFlight: 0, wake: () => {} } },
    {
      warn: (message: string) => warnings.push(message),
      info: (message: string) => infos.push(message),
    } as never,
  );
  transport.start();
  await Bun.sleep(10);
  delete redis.subscribeError;
  const deadline = Date.now() + 1_500;
  while (mode !== "healthy" && Date.now() < deadline) {
    await Bun.sleep(20);
  }
  expect(mode).toBe("healthy");
  expect(warnings).toHaveLength(1);
  expect(infos).toEqual(["Durability Redis acceleration recovered"]);
  await transport.stop();
});
