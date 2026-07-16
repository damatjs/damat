import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readInstallerLock } from "@damatjs/installer";
import { kitAddCommand, kitListCommand, kitRemoveCommand } from "../commands/kit";

const logger = {
  messages: [] as string[],
  debug() {}, success(message: string) { this.messages.push(message); },
  skip() {}, warn(message: string) { this.messages.push(message); },
  error(message: string) { this.messages.push(message); },
  info(message: string) { this.messages.push(message); },
};

function fixture(name = "feature", project?: string) {
  const source = mkdtempSync(join(tmpdir(), "kit-source-"));
  const target = project ?? mkdtempSync(join(tmpdir(), "kit-target-"));
  mkdirSync(join(source, "src"));
  writeFileSync(join(source, "src/index.ts"), "export const feature = true;");
  writeFileSync(join(source, "damat.json"), JSON.stringify({
    schemaVersion: 1, kind: "kit", name,
    install: { provides: { files: { from: "src/**", fallbackTo: "src/{id}" } } },
  }));
  return { source, project: target };
}

const context = (cwd: string, args: string[], options = {}) => ({
  command: "kit", cwd, args, options, logger,
});

describe("kit install commands", () => {
  test("add, list, and remove share the transactional installer", async () => {
    const { source, project } = fixture();
    const added = await kitAddCommand.handler(context(project, [source]));
    expect(added.exitCode).toBe(0);
    expect(existsSync(join(project, "src/feature/index.ts"))).toBeTrue();
    expect(readInstallerLock(project).installations.feature?.kind).toBe("kit");

    const second = fixture("alpha", project);
    expect((await kitAddCommand.handler(context(project, [second.source]))).exitCode)
      .toBe(0);

    logger.messages = [];
    expect((await kitListCommand.handler(context(project, []))).exitCode).toBe(0);
    expect(logger.messages).toContain("feature");
    expect(logger.messages).toContain("alpha");

    expect((await kitRemoveCommand.handler(context(project, ["feature"]))).exitCode).toBe(0);
    expect(existsSync(join(project, "src/feature/index.ts"))).toBeFalse();
  });
});
