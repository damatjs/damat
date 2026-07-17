import { afterEach, beforeEach, expect, spyOn, test } from "bun:test";
import { runEntry } from "../../entry";

let reported: unknown[][];
let exits: Array<number | undefined>;
let errorSpy: ReturnType<typeof spyOn>;
let exitSpy: ReturnType<typeof spyOn>;

beforeEach(() => {
  reported = [];
  exits = [];
  errorSpy = spyOn(console, "error").mockImplementation((...args) => {
    reported.push(args);
  });
  exitSpy = spyOn(process, "exit").mockImplementation(((code?: number) => {
    exits.push(code);
    return undefined as never;
  }) as typeof process.exit);
});

afterEach(() => {
  errorSpy.mockRestore();
  exitSpy.mockRestore();
});

test("runEntry completes when its application start succeeds", async () => {
  let starts = 0;
  await runEntry(async () => void starts++);
  expect(starts).toBe(1);
  expect(reported).toEqual([]);
  expect(exits).toEqual([]);
});

test("runEntry reports runtime startup failures and exits", async () => {
  const failure = new Error("boom");
  await runEntry(async () => {
    throw failure;
  });
  expect(reported).toEqual([["Failed to start runtime:", failure]]);
  expect(exits).toEqual([1]);
});
