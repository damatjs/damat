import { describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { kitAddCommand, kitCommand, kitPlanCommand } from "../commands/kit";
import { commandContext, kitProvider } from "./commandEdgeFixture";

describe("kit command edges", () => {
  test("prints parent help and rejects missing add/plan sources", async () => {
    const root = mkdtempSync(join(tmpdir(), "kit-target-"));
    expect((await kitCommand.handler(commandContext(root))).exitCode).toBe(0);
    expect((await kitAddCommand.handler(commandContext(root))).exitCode).toBe(
      1,
    );
    expect((await kitPlanCommand.handler(commandContext(root))).exitCode).toBe(
      1,
    );
  });

  test("covers dry-run add, plan, and their error reports", async () => {
    const root = mkdtempSync(join(tmpdir(), "kit-target-"));
    const source = kitProvider();
    expect(
      (
        await kitAddCommand.handler(
          commandContext(root, [source], { "dry-run": true }),
        )
      ).exitCode,
    ).toBe(0);
    expect(
      (await kitPlanCommand.handler(commandContext(root, [source]))).exitCode,
    ).toBe(0);
    expect(
      (await kitAddCommand.handler(commandContext(root, [kitProvider(false)])))
        .exitCode,
    ).toBe(1);
    expect(
      (await kitPlanCommand.handler(commandContext(root, [kitProvider(false)])))
        .exitCode,
    ).toBe(1);
  });
});
