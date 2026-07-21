import type { ILogger } from "@damatjs/logger";
import type { ModuleSchema } from "@damatjs/orm-type";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const noop = () => {};
export const quietLogger = {
  info: noop,
  warn: noop,
  error: noop,
  debug: noop,
  trace: noop,
  fatal: noop,
  child: () => quietLogger,
} as unknown as ILogger;

export const runSchema: ModuleSchema = {
  moduleName: "shop",
  tables: [
    {
      name: "ai_sessions",
      columns: [
        { name: "id", type: "uuid", nullable: false, primaryKey: true },
        { name: "name", type: "text", nullable: false },
      ],
    },
  ],
  enums: [{ name: "status", values: ["a", "b"] }],
  relationships: [],
};

export function makeRunFixture() {
  const root = mkdtempSync(join(tmpdir(), "module-generator-run-"));
  return {
    root,
    dirs: {
      typesDir: join(root, "types"),
      serviceDir: join(root, "service"),
      routesRoot: join(root, "api", "routes"),
      workflowsRoot: join(root, "workflows"),
    },
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}
