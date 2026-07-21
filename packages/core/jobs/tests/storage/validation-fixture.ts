import { expect } from "bun:test";
import {
  createTransactionalExecutor,
  invalidateTransactionalExecutor,
} from "@damatjs/durability";
import { enqueueJob } from "../../src/client";
import type { EnqueueJobOptions } from "../../src/repositories";

export type InvalidEnqueueInput = {
  name?: string;
  options?: EnqueueJobOptions;
  pattern: RegExp;
};

export async function expectNoSql(input: InvalidEnqueueInput): Promise<void> {
  let queries = 0;
  const executor = createTransactionalExecutor({
    query: async () => {
      queries++;
      return { rows: [], rowCount: 0 };
    },
  });
  await expect(
    enqueueJob(input.name ?? "job", {}, { ...input.options, executor }),
  ).rejects.toThrow(input.pattern);
  expect(queries).toBe(0);
  invalidateTransactionalExecutor(executor);
}
