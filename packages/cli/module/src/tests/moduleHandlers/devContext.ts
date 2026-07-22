import { mm } from "./context";

export async function getModuleDevCommand() {
  const { createModuleDevCommand } = await import("../../commands/module/dev");
  return createModuleDevCommand({
    preflight: async () => {
      mm.calls.push("runtime-plan", "port-check");
      if (mm.portError) throw mm.portError;
      mm.calls.push("database-check");
      if (mm.databaseError) throw mm.databaseError;
      return mm.runtimePlan as never;
    },
    watch: ({ cwd, entryFile, port }) => {
      const child = Bun.spawn({
        cmd: ["bun", entryFile],
        cwd,
        stdout: "inherit",
        stderr: "inherit",
        env: {
          ...process.env,
          ...(port !== undefined ? { PORT: String(port) } : {}),
        },
      });
      return {
        exited: child.exited,
        kill: (signal) => child.kill?.(signal),
      };
    },
  });
}
