import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  kitAddCommand,
  kitCommand,
  kitInitCommand,
  kitPlanCommand,
  kitValidateCommand,
} from "../commands/kit";

const messages: string[] = [];
const logger = {
  debug() {}, skip() {},
  info: (message: string) => messages.push(message),
  success: (message: string) => messages.push(message),
  warn: (message: string) => messages.push(message),
  error: (message: string) => messages.push(message),
};
const ctx = (cwd: string, args: string[] = [], options = {}) => ({
  command: "kit", cwd, args, options, logger,
});

function provider(valid = true) {
  const root = mkdtempSync(join(tmpdir(), "kit-edge-"));
  mkdirSync(join(root, "src"));
  writeFileSync(join(root, "src/index.ts"), "export const x = 1;");
  writeFileSync(join(root, "damat.json"), valid ? JSON.stringify({
    schemaVersion: 1, kind: "kit", name: "edge",
    install: { provides: { files: { from: "src/**", fallbackTo: "src/{id}" } } },
  }) : "{");
  return root;
}

describe("kit command edges", () => {
  test("prints parent help and rejects missing add/plan sources", async () => {
    const root = mkdtempSync(join(tmpdir(), "kit-target-"));
    expect((await kitCommand.handler(ctx(root))).exitCode).toBe(0);
    expect((await kitAddCommand.handler(ctx(root))).exitCode).toBe(1);
    expect((await kitPlanCommand.handler(ctx(root))).exitCode).toBe(1);
  });

  test("covers dry-run add, plan, and their error reports", async () => {
    const root = mkdtempSync(join(tmpdir(), "kit-target-"));
    const source = provider();
    expect((await kitAddCommand.handler(ctx(root, [source], { "dry-run": true }))).exitCode)
      .toBe(0);
    expect((await kitPlanCommand.handler(ctx(root, [source]))).exitCode).toBe(0);
    expect((await kitAddCommand.handler(ctx(root, [provider(false)]))).exitCode).toBe(1);
    expect((await kitPlanCommand.handler(ctx(root, [provider(false)]))).exitCode).toBe(1);
  });

  test("covers init validation and existing-manifest refusal", async () => {
    const invalid = mkdtempSync(join(tmpdir(), "kit-target-"));
    expect((await kitInitCommand.handler(ctx(invalid, ["Bad_Name"]))).exitCode).toBe(1);
    writeFileSync(join(invalid, "damat.json"), "{}");
    expect((await kitInitCommand.handler(ctx(invalid, ["valid"]))).exitCode).toBe(1);
  });

  test("validates success, empty capabilities, and malformed manifests", async () => {
    expect((await kitValidateCommand.handler(ctx(provider()))).exitCode).toBe(0);
    const empty = mkdtempSync(join(tmpdir(), "kit-empty-"));
    writeFileSync(join(empty, "damat.json"), JSON.stringify({
      schemaVersion: 1, kind: "kit", name: "empty",
    }));
    expect((await kitValidateCommand.handler(ctx(empty))).exitCode).toBe(1);
    expect((await kitValidateCommand.handler(ctx(provider(false)))).exitCode).toBe(1);
  });
});
