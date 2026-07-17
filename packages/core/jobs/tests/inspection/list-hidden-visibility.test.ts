import { beforeAll, expect, test } from "bun:test";
import { ensureStorage, insertRun, inspection } from "./context";

beforeAll(ensureStorage);

test("hidden list omits payload and metadata", async () => {
  const run = await insertRun({});
  const page = await inspection({ visibility: "hidden" }).listRuns({
    queues: [run.queue],
  });
  expect(page.items[0]).not.toHaveProperty("payload");
  expect(page.items[0]).not.toHaveProperty("metadata");
});
