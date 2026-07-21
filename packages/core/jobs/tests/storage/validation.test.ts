import { beforeEach, expect, test } from "bun:test";
import { clearJobDefinitions, defineJob } from "../../src/definitions/registry";
import type { JobOptions } from "../../src/definitions/types";
import { expectNoSql, type InvalidEnqueueInput } from "./validation-fixture";

beforeEach(clearJobDefinitions);

test("definition registration rejects invalid identifiers and policies", () => {
  const invalid = [
    [" ", {}, /name/i],
    ["job", { queue: "  " }, /queue/i],
    ["job", { priority: 1.5 }, /priority/i],
    ["job", { priority: Infinity }, /priority/i],
    ["job", { priority: 2_147_483_648 }, /priority/i],
    ["job", { maxAttempts: 0 }, /maxAttempts/i],
    ["job", { maxAttempts: 1.5 }, /maxAttempts/i],
    ["job", { maxAttempts: 2_147_483_648 }, /maxAttempts/i],
    ["job", { backoffMs: -1 }, /backoffMs/i],
    ["job", { backoffMs: Infinity }, /backoffMs/i],
    ["job", { backoffMultiplier: 0.5 }, /backoffMultiplier/i],
    ["job", { backoffMultiplier: NaN }, /backoffMultiplier/i],
  ] as const;
  for (const [name, options, pattern] of invalid) {
    expect(() => defineJob(name, async () => {}, options)).toThrow(pattern);
  }
});

test("undefined definition options preserve defaults", () => {
  const options = {
    priority: undefined,
    maxAttempts: undefined,
    backoffMs: undefined,
    backoffMultiplier: undefined,
  } as JobOptions;
  const definition = defineJob("undefined-options", async () => {}, options);
  expect(definition.options).toMatchObject({
    priority: 100,
    maxAttempts: 3,
    backoffMs: 1_000,
    backoffMultiplier: 2,
  });
});

test("invalid enqueue input fails before issuing SQL", async () => {
  const invalid: InvalidEnqueueInput[] = [
    { name: " ", pattern: /name/i },
    { options: { queue: "\t" }, pattern: /queue/i },
    { options: { deduplication: { key: "" } }, pattern: /deduplication/i },
    { options: { priority: 1.5 }, pattern: /priority/i },
    { options: { priority: NaN }, pattern: /priority/i },
    { options: { priority: 2_147_483_648 }, pattern: /priority/i },
    { options: { maxAttempts: 0 }, pattern: /maxAttempts/i },
    { options: { maxAttempts: 2_147_483_648 }, pattern: /maxAttempts/i },
    { options: { delayMs: -1 }, pattern: /delayMs/i },
    { options: { delayMs: Infinity }, pattern: /delayMs/i },
    { options: { delayMs: Number.MAX_SAFE_INTEGER }, pattern: /delayMs/i },
    { options: { backoffMs: 1.5 }, pattern: /backoffMs/i },
    {
      options: { backoffMs: Number.MAX_SAFE_INTEGER + 1 },
      pattern: /backoffMs/i,
    },
    { options: { backoffMultiplier: 0.9 }, pattern: /backoffMultiplier/i },
    { options: { backoffMultiplier: Infinity }, pattern: /backoffMultiplier/i },
    {
      options: {
        deduplication: { key: "key", expiresAt: new Date(Number.NaN) },
      },
      pattern: /expiresAt/i,
    },
    {
      options: {
        deduplication: { key: "key", expiresAt: 0 as never },
      },
      pattern: /expiresAt/i,
    },
  ];
  for (const input of invalid) await expectNoSql(input);
});
