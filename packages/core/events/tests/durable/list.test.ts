import { beforeAll, expect, test } from "bun:test";
import { listDurableEvents, publishDurableEvent } from "../../src";
import { durability, ensureEventStorage, uniqueEvent } from "./storage-context";

beforeAll(ensureEventStorage);

test("list returns recent events and filters by name", async () => {
  const name = uniqueEvent("listed");
  const first = await publishDurableEvent(name, { order: 1 });
  const second = await publishDurableEvent(name, { order: 2 });
  await publishDurableEvent(uniqueEvent("other"), {});
  const recent = await listDurableEvents({ limit: 1 });
  expect(recent).toHaveLength(1);
  const filtered = await listDurableEvents({ name, limit: 10 });
  expect(filtered.map(({ id }) => id).sort()).toEqual(
    [first.id, second.id].sort(),
  );
});

test("list accepts an active transaction executor", async () => {
  await durability.transaction(async (executor) => {
    const rows = await listDurableEvents({ limit: 0, executor });
    expect(rows).toHaveLength(1);
  });
});
