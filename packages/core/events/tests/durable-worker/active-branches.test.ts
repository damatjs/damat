import { expect, test } from "bun:test";
import { ActiveEventDeliveries } from "../../src/durable/worker/active";

test("active executions clean up after unexpected rejection", async () => {
  let emptyCalls = 0;
  const active = new ActiveEventDeliveries(() => void emptyCalls++);
  active.track({
    promise: Promise.reject(new Error("unexpected execution failure")),
    abort: () => {},
  });
  await Bun.sleep(0);
  expect(active.size).toBe(0);
  expect(emptyCalls).toBe(1);
});
