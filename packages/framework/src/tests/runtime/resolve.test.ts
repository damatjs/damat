import { describe, expect, it } from "bun:test";
import { resolveRuntime } from "../../runtime/resolve";
import type { RuntimeConfig } from "../../config/types/runtime";

describe("resolveRuntime", () => {
  it("defaults to all with enabled durable capabilities", () => {
    expect(
      resolveRuntime({ services: { jobs: {}, events: { durable: {} } } }, {}),
    ).toEqual({ mode: "all", workers: ["jobs", "events"], servesHttp: true });
  });

  it("overrides config mode without replacing configured workers", () => {
    const config = {
      runtime: { mode: "all" as const, workers: ["events" as const] },
      services: { jobs: {}, events: { durable: {} } },
    };
    expect(resolveRuntime(config, { DAMAT_RUNTIME_MODE: "worker" })).toEqual({
      mode: "worker",
      workers: ["events"],
      servesHttp: false,
    });
  });

  it("overrides config workers without replacing configured mode", () => {
    const config = {
      runtime: { mode: "worker" as const, workers: ["events" as const] },
      services: { jobs: {}, events: { durable: {} } },
    };
    expect(resolveRuntime(config, { DAMAT_WORKER_TYPES: "jobs" })).toEqual({
      mode: "worker",
      workers: ["jobs"],
      servesHttp: false,
    });
  });

  it("server mode always drops configured workers", () => {
    const config = {
      runtime: { mode: "server" as const, workers: ["jobs" as const] },
      services: { jobs: {} },
    };
    expect(resolveRuntime(config, {})).toEqual({
      mode: "server",
      workers: [],
      servesHttp: true,
    });
  });

  it("server mode ignores known unavailable worker selections", () => {
    const config = {
      runtime: { mode: "server" as const, workers: ["events" as const] },
      services: { jobs: {} },
    };
    expect(resolveRuntime(config, {})).toEqual({
      mode: "server",
      workers: [],
      servesHttp: true,
    });
  });

  it("rejects worker mode without an enabled selected capability", () => {
    expect(() => resolveRuntime({ runtime: { mode: "worker" } }, {})).toThrow(
      "Worker runtime requires at least one enabled capability",
    );
  });

  it("rejects an explicitly selected unavailable capability", () => {
    expect(() =>
      resolveRuntime(
        { runtime: { workers: ["events"] }, services: { jobs: {} } },
        {},
      ),
    ).toThrow('Worker capability "events" is not enabled in services');
  });

  it("allows all mode with no enabled durable services", () => {
    expect(resolveRuntime({}, {})).toEqual({
      mode: "all",
      workers: [],
      servesHttp: true,
    });
  });

  it("rejects unknown runtime values imported from config", () => {
    const unknownMode = { mode: "api" } as unknown as RuntimeConfig;
    const unknownWorker = {
      workers: ["pipelines"],
    } as unknown as RuntimeConfig;
    expect(() => resolveRuntime({ runtime: unknownMode }, {})).toThrow(
      'Unknown runtime mode "api"',
    );
    expect(() => resolveRuntime({ runtime: unknownWorker }, {})).toThrow(
      'Unknown worker capability "pipelines"',
    );
  });
});
