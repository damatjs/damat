import { expect, test } from "bun:test";
import { createRedis } from "../src";

test("uses explicit PING instead of privileged INFO by default", () => {
  const client = createRedis({ url: "redis://127.0.0.1:6379" });
  expect(client.options.enableReadyCheck).toBe(false);
  client.disconnect();
});

test("allows callers to restore the ioredis readiness probe", () => {
  const client = createRedis({
    url: "redis://127.0.0.1:6379",
    options: { enableReadyCheck: true },
  });
  expect(client.options.enableReadyCheck).toBe(true);
  client.disconnect();
});
