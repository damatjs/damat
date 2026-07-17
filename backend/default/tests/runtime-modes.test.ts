import { describe, expect, test } from "bun:test";
import { resolveRuntime } from "@damatjs/framework";
import config from "../damat.config";

describe("reference runtime modes", () => {
  test("enables both durable worker capabilities", () => {
    expect(config.services?.jobs?.queue).toBe("reports");
    expect(config.services?.events?.durable).toBeDefined();
    expect(resolveRuntime(config, {})).toEqual({
      mode: "all",
      workers: ["jobs", "events"],
      servesHttp: true,
    });
  });

  test("selects the API-only runtime", () => {
    expect(resolveRuntime(config, { DAMAT_RUNTIME_MODE: "server" })).toEqual({
      mode: "server",
      workers: [],
      servesHttp: true,
    });
  });

  test.each(["jobs", "events"] as const)(
    "selects the %s worker without HTTP",
    (worker) => {
      expect(
        resolveRuntime(config, {
          DAMAT_RUNTIME_MODE: "worker",
          DAMAT_WORKER_TYPES: worker,
        }),
      ).toEqual({ mode: "worker", workers: [worker], servesHttp: false });
    },
  );
});
