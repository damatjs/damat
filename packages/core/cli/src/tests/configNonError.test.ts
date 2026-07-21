import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../config";
import { ConfigLoadError } from "../errors";

describe("loadConfig non-Error failures", () => {
  test("wraps a non-Error throw without inventing a cause", async () => {
    const dir = mkdtempSync(join(tmpdir(), "damat-cli-non-error-"));
    const file = join(dir, "bad.config");
    writeFileSync(file, "fixture");

    try {
      const result = loadConfig({
        file,
        load: async () => {
          throw "loader failed";
        },
      });
      const error = (await result.catch((value) => value)) as Error;

      expect(error).toBeInstanceOf(ConfigLoadError);
      expect(error.message).toContain(file);
      expect(error.cause).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
