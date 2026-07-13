import { describe, it, expect, beforeEach } from "bun:test";
import {
  defineJob,
  getJobDefinition,
  getAllJobDefinitions,
  clearJobDefinitions,
  DEFAULT_JOB_OPTIONS,
} from "../src/index";

beforeEach(() => {
  clearJobDefinitions();
});

describe("defineJob", () => {
  it("merges the defaults into the definition's options", () => {
    const handler = async () => {};
    const definition = defineJob("send-email", handler);

    expect(definition.name).toBe("send-email");
    expect(definition.handler).toBe(handler);
    expect(definition.options).toEqual({
      maxAttempts: 3,
      backoffMs: 1000,
      backoffMultiplier: 2,
      priority: "normal",
    });
    // The exported defaults are what got merged.
    expect(definition.options).toEqual(DEFAULT_JOB_OPTIONS);
  });

  it("lets explicit options override individual defaults", () => {
    const definition = defineJob("resize-image", async () => {}, {
      maxAttempts: 5,
      priority: "high",
    });

    expect(definition.options).toEqual({
      maxAttempts: 5,
      backoffMs: 1000, // still the default
      backoffMultiplier: 2, // still the default
      priority: "high",
    });
  });

  it("throws on a duplicate job name", () => {
    defineJob("unique-job", async () => {});
    expect(() => defineJob("unique-job", async () => {})).toThrow(
      'Job "unique-job" is already defined — job names must be unique',
    );
  });
});

describe("registry lookups", () => {
  it("getJobDefinition returns the registered definition (or undefined)", () => {
    const definition = defineJob("lookup-me", async () => {});

    expect(getJobDefinition("lookup-me")).toBe(definition);
    expect(getJobDefinition("never-defined")).toBeUndefined();
  });

  it("getAllJobDefinitions returns every registered definition", () => {
    expect(getAllJobDefinitions()).toEqual([]);

    const a = defineJob("job-a", async () => {});
    const b = defineJob("job-b", async () => {});

    expect(getAllJobDefinitions()).toEqual([a, b]);
  });

  it("clearJobDefinitions drops everything so names can be reused", () => {
    defineJob("job-a", async () => {});
    clearJobDefinitions();

    expect(getAllJobDefinitions()).toEqual([]);
    expect(getJobDefinition("job-a")).toBeUndefined();
    // The name is free again.
    expect(() => defineJob("job-a", async () => {})).not.toThrow();
  });
});
