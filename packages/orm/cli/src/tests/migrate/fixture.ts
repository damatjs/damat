import "./project";
import "./state";
import { root, setupProject } from "./project";
import { setupState } from "./reset";

export * from "./project";
export * from "./state";

export function setupMigrateFixture(): void {
  setupProject();
  setupState();
}

export function context(
  args: string[] = [],
  options: Record<string, unknown> = {},
) {
  const calls: Array<{ level: string; msg: string }> = [];
  const logger = Object.fromEntries(
    ["info", "error", "success", "warn", "skip"].map((level) => [
      level,
      (msg: string) => calls.push({ level, msg: String(msg) }),
    ]),
  );
  return {
    calls,
    ctx: { command: "migrate", args, options, logger, cwd: root } as any,
  };
}

export function logged(
  calls: Array<{ level: string; msg: string }>,
  level: string,
  pattern: RegExp,
) {
  return calls.some((call) => call.level === level && pattern.test(call.msg));
}

export const loadUp = async () =>
  (await import("../../cli/commands/migrate/up")).default;
export const loadStatus = async () =>
  (await import("../../cli/commands/migrate/status")).default;
export const loadList = async () =>
  (await import("../../cli/commands/migrate/list")).default;
export const loadCreate = async () =>
  (await import("../../cli/commands/migrate/create")).default;
