import { beforeEach, expect, test } from "bun:test";
import {
  clearJobDefinitions,
  defineJob,
  getAllJobDefinitions,
  getJobDefinition,
} from "../../src/definitions/registry";
import { DEFAULT_JOB_OPTIONS } from "../../src/definitions/defaults";

beforeEach(clearJobDefinitions);

test("definition defaults are numeric and durable", () => {
  const definition = defineJob("default-job", async () => {});
  expect(definition.options).toEqual(DEFAULT_JOB_OPTIONS);
  expect(definition.options.priority).toBe(100);
});

test("definition options override package defaults", () => {
  defineJob("custom-job", async () => {}, {
    queue: "mail",
    priority: 5,
    maxAttempts: 7,
    backoffMs: 250,
    backoffMultiplier: 1.5,
  });
  expect(getJobDefinition("custom-job")?.options).toEqual({
    queue: "mail",
    priority: 5,
    maxAttempts: 7,
    backoffMs: 250,
    backoffMultiplier: 1.5,
  });
  expect(getAllJobDefinitions()).toHaveLength(1);
});

test("definition names remain unique", () => {
  defineJob("unique-job", async () => {});
  expect(() => defineJob("unique-job", async () => {})).toThrow(
    /already defined/,
  );
});
