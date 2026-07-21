import { expect, test } from "bun:test";
import { Hono } from "@damatjs/deps/hono";
import { aggregateFileRouters } from "../../router/aggregate";

test("aggregate router exposes text and JSON route inspection", () => {
  const router = new Hono();
  router.get("/status", (context) => context.text("ok"));
  const aggregate = aggregateFileRouters([
    {
      router,
      routes: [{ method: "GET", path: "/status" }],
      getRouteList: () => "",
      getRoutesJson: () => [],
    },
  ]);
  expect(aggregate.getRouteList()).toBe(
    "Registered Routes:\n\nGET     /status",
  );
  expect(aggregate.getRoutesJson()).toEqual([
    { method: "GET", path: "/status" },
  ]);
});
