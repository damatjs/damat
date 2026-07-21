import { afterAll, beforeAll, expect, test } from "bun:test";
import {
  getWorkControl,
  listWorkControlActivity,
  pauseWork,
  resumeWork,
} from "../../src";
import { createRepositoryContext, testId } from "../repositoryContext";
import { actor, transaction } from "./context";

let context: Awaited<ReturnType<typeof createRepositoryContext>>;

beforeAll(async () => {
  context = await createRepositoryContext();
});
afterAll(async () => context.pool.end());

test("activity order follows serialized writes rather than transaction start", async () => {
  const scope = testId("ordering");
  let releaseEarlier!: () => void;
  let earlierStarted!: () => void;
  const wait = new Promise<void>((resolve) => (releaseEarlier = resolve));
  const started = new Promise<void>((resolve) => (earlierStarted = resolve));
  const earlier = transaction(context, async (executor) => {
    earlierStarted();
    await wait;
    await resumeWork({ kind: "job", scope, actor, executor });
  });
  await started;
  await transaction(context, (executor) =>
    pauseWork({ kind: "job", scope, actor, executor }),
  );
  releaseEarlier();
  await earlier;
  const control = await getWorkControl({
    kind: "job",
    scope,
    executor: context.pool,
  });
  const activity = await listWorkControlActivity({
    kind: "job",
    scope,
    executor: context.pool,
  });
  expect(control?.paused).toBe(false);
  expect(activity.map(({ action }) => action)).toEqual(["paused", "resumed"]);
});
