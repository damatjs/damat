import { describe, expect, it } from "bun:test";
import { parseRuntimeEnvironment } from "../../runtime/environment";

describe("parseRuntimeEnvironment", () => {
  it("returns no overrides when runtime variables are absent", () => {
    expect(parseRuntimeEnvironment({})).toEqual({});
  });

  it("normalizes mode whitespace", () => {
    expect(parseRuntimeEnvironment({ DAMAT_RUNTIME_MODE: " worker " })).toEqual(
      { mode: "worker" },
    );
  });

  it("normalizes worker whitespace and duplicates", () => {
    const environment = {
      DAMAT_WORKER_TYPES: " jobs, events, jobs ,events ",
    };
    expect(parseRuntimeEnvironment(environment)).toEqual({
      workers: ["jobs", "events"],
    });
  });

  it("preserves an explicit empty worker override", () => {
    expect(parseRuntimeEnvironment({ DAMAT_WORKER_TYPES: "  " })).toEqual({
      workers: [],
    });
  });

  it("rejects unknown modes and worker capabilities", () => {
    expect(() =>
      parseRuntimeEnvironment({ DAMAT_RUNTIME_MODE: "api" }),
    ).toThrow('Unknown runtime mode "api"');
    expect(() =>
      parseRuntimeEnvironment({ DAMAT_WORKER_TYPES: "jobs,unknown" }),
    ).toThrow('Unknown worker capability "unknown"');
  });

  it("accepts pipeline workers", () => {
    expect(
      parseRuntimeEnvironment({ DAMAT_WORKER_TYPES: "pipelines" }),
    ).toEqual({ workers: ["pipelines"] });
  });
});
