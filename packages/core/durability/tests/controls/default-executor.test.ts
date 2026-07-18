import { afterAll, beforeAll, expect, test } from "bun:test";
import {
  clearDurabilityClient,
  getWorkControl,
  pauseWork,
  setDurabilityClient,
} from "../../src";
import { createRepositoryContext, testId } from "../repositoryContext";
import { actor } from "./context";

let context: Awaited<ReturnType<typeof createRepositoryContext>>;
beforeAll(async () => {
  context = await createRepositoryContext();
  setDurabilityClient(context.durability);
});
afterAll(async () => {
  clearDurabilityClient();
  await context.pool.end();
});

test("control writes use the configured durability transaction", async () => {
  const scope = testId("default-executor");
  await pauseWork({ kind: "job", scope, actor });
  await expect(
    getWorkControl({ kind: "job", scope, executor: context.pool }),
  ).resolves.toMatchObject({ paused: true, actor });
});
