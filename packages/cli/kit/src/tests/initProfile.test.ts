import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { kitInitCommand } from "../commands/kit/init";

const logger = { debug() {}, info() {}, success() {}, skip() {}, warn() {}, error() {} };

describe("kit init", () => {
  test("writes only a universal provider manifest", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "kit-init-"));
    const result = await kitInitCommand.handler({
      command: "kit init", args: ["design-kit"], options: {}, logger, cwd,
    });
    expect(result.exitCode).toBe(0);
    expect(existsSync(join(cwd, "damat-kit.json"))).toBeFalse();
    const manifest = JSON.parse(readFileSync(join(cwd, "damat.json"), "utf8"));
    expect(manifest).toMatchObject({ schemaVersion: 1, kind: "kit", name: "design-kit" });
  });
});
