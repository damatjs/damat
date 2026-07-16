import { beforeEach, expect, test } from "bun:test";
import {
  config,
  initializeEventBroadcast,
  instances,
  logger,
  reset,
  state,
} from "./initialize-events-jobs-fixture";

beforeEach(reset);

test("event broadcast remains independently Redis-backed", async () => {
  const value = config();
  value.services = { events: { broadcast: true, channel: "custom" } };
  const services = instances();
  await initializeEventBroadcast(value, services, logger as never);
  expect(state.broadcasts).toEqual([{ channel: "custom" }]);
  expect(services.shutdownHandlers.map(({ name }) => name)).toEqual([
    "event-broadcast",
  ]);
});

test("event broadcast warns without Redis", async () => {
  const value = config();
  delete value.projectConfig.redisUrl;
  value.services = { events: { broadcast: true } };
  await initializeEventBroadcast(value, instances(), logger as never);
  expect(state.warnings[0]).toContain("redisUrl");
  expect(state.broadcasts).toEqual([]);
});
