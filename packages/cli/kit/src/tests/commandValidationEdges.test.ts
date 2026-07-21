import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { kitInitCommand, kitValidateCommand } from "../commands/kit";
import { commandContext, kitProvider } from "./commandEdgeFixture";

describe("kit validation command edges", () => {
  test("covers init validation and existing-manifest refusal", async () => {
    const invalid = mkdtempSync(join(tmpdir(), "kit-target-"));
    expect(
      (await kitInitCommand.handler(commandContext(invalid, ["Bad_Name"])))
        .exitCode,
    ).toBe(1);
    writeFileSync(join(invalid, "damat.json"), "{}");
    expect(
      (await kitInitCommand.handler(commandContext(invalid, ["valid"])))
        .exitCode,
    ).toBe(1);
  });

  test("validates success, empty capabilities, and malformed manifests", async () => {
    expect(
      (await kitValidateCommand.handler(commandContext(kitProvider())))
        .exitCode,
    ).toBe(0);
    const empty = mkdtempSync(join(tmpdir(), "kit-empty-"));
    writeFileSync(
      join(empty, "damat.json"),
      JSON.stringify({ schemaVersion: 1, kind: "kit", name: "empty" }),
    );
    expect(
      (await kitValidateCommand.handler(commandContext(empty))).exitCode,
    ).toBe(1);
    expect(
      (await kitValidateCommand.handler(commandContext(kitProvider(false))))
        .exitCode,
    ).toBe(1);
  });
});
