import { expect, test } from "bun:test";
import { join } from "node:path";

test("a fresh module scaffold passes contract validation", async () => {
  const script = join(import.meta.dir, "fixtures/scaffoldContractCheck.ts");
  const worker = new Worker(script);
  const result = await new Promise<unknown>((resolve, reject) => {
    worker.onmessage = (event) => resolve(event.data);
    worker.onerror = (event) => reject(event.error ?? new Error(event.message));
  });
  worker.terminate();
  expect(result).toEqual({ errors: [] });
});
