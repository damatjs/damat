import { expect, test } from "bun:test";
import { Effect } from "@damatjs/deps/effect";
import { createStep, createWorkflow, parallel, runStep } from "../src";

test("parallel starts every branch before waiting for completion", async () => {
  const started: string[] = [];
  let release!: () => void;
  let allStarted!: () => void;
  const gate = new Promise<void>((resolve) => void (release = resolve));
  const ready = new Promise<void>((resolve) => void (allStarted = resolve));
  const branch = (name: string) =>
    createStep(name, async () => {
      started.push(name);
      if (started.length === 3) allStarted();
      await gate;
      return name;
    });
  const workflow = createWorkflow("parallel-barrier", (input: {}, context) =>
    Effect.gen(function* () {
      return yield* parallel(
        runStep(branch("one"), input, context),
        runStep(branch("two"), input, context),
        runStep(branch("three"), input, context),
      );
    }),
  );
  const execution = workflow.execute({});
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error("parallel branches did not start")),
      2_000,
    );
  });

  try {
    await Promise.race([ready, timeout]);
    expect(started.sort()).toEqual(["one", "three", "two"]);
  } finally {
    if (timer) clearTimeout(timer);
    release();
  }
  expect(await execution).toMatchObject({ success: true });
});
