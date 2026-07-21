import { expect, test } from "bun:test";
import {
  Effect,
  createStep,
  createWorkflow,
  ifElse,
  runStep,
  skipStep,
  when,
} from "../src";

test("when / ifElse / skipStep behave conditionally", async () => {
  const yes = createStep("yes", async () => "yes");
  const no = createStep("no", async () => "no");
  const workflow = createWorkflow("cond", (input: { flag: boolean }, context) =>
    Effect.gen(function* () {
      const a = yield* when(input.flag, yes, input, context, "default");
      const b = yield* ifElse(input.flag, yes, no, input, context);
      const c = input.flag
        ? yield* skipStep("skipped")
        : yield* runStep(no, input, context);
      return { a, b, c };
    }),
  );

  const onTrue = await workflow.execute({ flag: true });
  expect(onTrue.success).toBe(true);
  if (onTrue.success)
    expect(onTrue.result).toEqual({ a: "yes", b: "yes", c: "skipped" });

  const onFalse = await workflow.execute({ flag: false });
  expect(onFalse.success).toBe(true);
  if (onFalse.success)
    expect(onFalse.result).toEqual({ a: "default", b: "no", c: "no" });
});
