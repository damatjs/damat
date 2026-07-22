import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type Command, reportError } from "@damatjs/cli";
import { cleanupTempFile } from "@damatjs/cli-support";
import { ModulePortInUseError } from "@damatjs/module";
import { preflightModuleDev } from "./devPreflight";
import { startModuleDevWatcher, type ModuleDevWatcher } from "./devWatcher";

interface DevDependencies {
  preflight: typeof preflightModuleDev;
  watch: typeof startModuleDevWatcher;
}

function forwardSignals(child: ModuleDevWatcher): () => void {
  const interrupt = () => child.kill?.("SIGINT");
  const terminate = () => child.kill?.("SIGTERM");
  process.once("SIGINT", interrupt);
  process.once("SIGTERM", terminate);
  return () => {
    process.off("SIGINT", interrupt);
    process.off("SIGTERM", terminate);
  };
}

function reportPreflightError(
  logger: Parameters<typeof reportError>[0],
  error: unknown,
) {
  if (error instanceof ModulePortInUseError) {
    logger.error(error.message);
    logger.error("Use: damat module dev --port <port>");
    return;
  }
  reportError(logger, error, { prefix: "Module development preflight failed" });
}

export function createModuleDevCommand(
  dependencies: DevDependencies = {
    preflight: preflightModuleDev,
    watch: startModuleDevWatcher,
  },
): Command {
  return {
    name: "dev",
    description: "Run this module package standalone with hot reload",
    usage: "damat module dev [--port <port>]",
    options: [
      {
        name: "port",
        alias: "p",
        type: "number",
        description: "Port to run the module server on",
      },
    ],
    handler: async (ctx) => {
      const port = ctx.options.port as number | undefined;
      try {
        await dependencies.preflight(ctx.cwd, port, ctx.logger);
      } catch (error) {
        reportPreflightError(ctx.logger, error);
        return { exitCode: 1 };
      }
      const damatDir = join(ctx.cwd, ".damat");
      if (!existsSync(damatDir)) mkdirSync(damatDir, { recursive: true });
      const entryFile = join(damatDir, "module-dev-entry.ts");
      writeFileSync(
        entryFile,
        `import { runModuleEntry } from '@damatjs/module';\nrunModuleEntry();\n`,
      );
      let removeSignals: (() => void) | undefined;
      try {
        const child = dependencies.watch({
          cwd: ctx.cwd,
          entryFile,
          ...(port !== undefined ? { port } : {}),
        });
        removeSignals = forwardSignals(child);
        return { exitCode: await child.exited };
      } finally {
        removeSignals?.();
        cleanupTempFile(entryFile, ctx.logger);
      }
    },
  };
}

export const moduleDevCommand = createModuleDevCommand();
