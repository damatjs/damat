import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { InstallerPlan } from "@damatjs/installer";
import {
  kitAddCommand,
  kitListCommand,
  kitRemoveCommand,
  kitUpdateCommand,
} from "../commands/kit";
import { reportKitPlan } from "../commands/kit/shared";

const messages: string[] = [];
const logger = {
  debug() {},
  skip() {},
  info: (message: string) => messages.push(message),
  success: (message: string) => messages.push(message),
  warn: (message: string) => messages.push(message),
  error: (message: string) => messages.push(message),
};
const ctx = (cwd: string, args: string[] = [], options = {}) => ({
  command: "kit",
  cwd,
  args,
  options,
  logger,
});

function fixture() {
  const source = mkdtempSync(join(tmpdir(), "kit-update-"));
  const project = mkdtempSync(join(tmpdir(), "kit-project-"));
  mkdirSync(join(source, "src"));
  writeFileSync(join(source, "src/index.ts"), "export const x = 1;");
  writeFileSync(
    join(source, "damat.json"),
    JSON.stringify({
      schemaVersion: 1,
      kind: "kit",
      name: "update-kit",
      install: {
        provides: { code: { from: "src/**", fallbackTo: "src/{id}" } },
      },
    }),
  );
  return { source, project };
}

describe("kit lifecycle edges", () => {
  test("reports empty lists and missing update/remove arguments", async () => {
    const project = mkdtempSync(join(tmpdir(), "kit-project-"));
    expect((await kitListCommand.handler(ctx(project))).exitCode).toBe(0);
    expect((await kitUpdateCommand.handler(ctx(project))).exitCode).toBe(1);
    expect((await kitRemoveCommand.handler(ctx(project))).exitCode).toBe(1);
    expect(
      (await kitRemoveCommand.handler(ctx(project, ["missing"]))).exitCode,
    ).toBe(1);
  });

  test("updates from provenance and reports acquisition failures", async () => {
    const { source, project } = fixture();
    expect((await kitAddCommand.handler(ctx(project, [source]))).exitCode).toBe(
      0,
    );
    writeFileSync(join(source, "src/index.ts"), "export const x = 2;");
    expect(
      (await kitUpdateCommand.handler(ctx(project, ["update-kit"]))).exitCode,
    ).toBe(0);
    rmSync(source, { recursive: true, force: true });
    expect(
      (await kitUpdateCommand.handler(ctx(project, ["update-kit"]))).exitCode,
    ).toBe(1);
  });

  test("reports warnings and removal instructions", () => {
    const plan = {
      action: "remove",
      kind: "kit",
      installationId: "x",
      mode: "source",
      operations: [],
      warnings: ["in use"],
      usageLocations: [],
    } as unknown as InstallerPlan;
    reportKitPlan(ctx("/app"), plan, {
      schemaVersion: 1,
      kind: "kit",
      name: "x",
      install: { instructions: { remove: ["clean call sites"] } },
    });
    expect(messages).toContain("in use");
    expect(messages).toContain("clean call sites");
  });
});
