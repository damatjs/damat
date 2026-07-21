import { expect, test } from "bun:test";
import { enqueueJob, listJobActivity, listJobRuns } from "../../src/client";
import { ensureStorage, uniqueName } from "./context";

test("concurrent deduplicated enqueue replays one run", async () => {
  await ensureStorage();
  const name = uniqueName("dedup");
  const key = crypto.randomUUID();
  const [left, right] = await Promise.all([
    enqueueJob(name, { side: "left" }, { deduplication: { key } }),
    enqueueJob(name, { side: "right" }, { deduplication: { key } }),
  ]);
  expect(left.id).toBe(right.id);
  const runs = await listJobRuns({ name });
  expect(runs).toHaveLength(1);
  expect(await listJobActivity(left.id)).toHaveLength(1);
});

test("expired deduplication keys create a fresh run", async () => {
  await ensureStorage();
  const name = uniqueName("dedup-expired");
  const key = crypto.randomUUID();
  const first = await enqueueJob(
    name,
    {},
    {
      deduplication: { key, expiresAt: new Date(Date.now() - 1_000) },
    },
  );
  const second = await enqueueJob(name, {}, { deduplication: { key } });
  expect(second.id).not.toBe(first.id);
});
