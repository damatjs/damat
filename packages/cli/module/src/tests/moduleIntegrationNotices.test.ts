import { expect, test } from "bun:test";
import { join } from "node:path";

test("module install preserves user-owned integration files", async () => {
  const script = join(import.meta.dir, "fixtures/moduleIntegrationCheck.ts");
  const worker = new Worker(script);
  const result = await new Promise<unknown>((resolve, reject) => {
    worker.onmessage = (event) => resolve(event.data);
    worker.onerror = (event) => reject(event.error ?? new Error(event.message));
  });
  worker.terminate();
  expect(result).toEqual({ preserved: true, installed: true, notice: true });
});
