import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const messages: string[] = [];
const logger = {
  debug() {},
  skip() {},
  info: (message: string) => messages.push(message),
  success: (message: string) => messages.push(message),
  warn: (message: string) => messages.push(message),
  error: (message: string) => messages.push(message),
};

export const commandContext = (
  cwd: string,
  args: string[] = [],
  options = {},
) => ({
  command: "kit",
  cwd,
  args,
  options,
  logger,
});

export function kitProvider(valid = true): string {
  const root = mkdtempSync(join(tmpdir(), "kit-edge-"));
  mkdirSync(join(root, "src"));
  writeFileSync(join(root, "src/index.ts"), "export const x = 1;");
  writeFileSync(
    join(root, "damat.json"),
    valid
      ? JSON.stringify({
          schemaVersion: 1,
          kind: "kit",
          name: "edge",
          install: {
            provides: { files: { from: "src/**", fallbackTo: "src/{id}" } },
          },
        })
      : "{",
  );
  return root;
}
