import type { Command } from "@damatjs/cli";
import { readInstallerLock } from "@damatjs/installer";

export function createModuleListHandler(
  readLock: typeof readInstallerLock = readInstallerLock,
): Command["handler"] {
  return async (ctx) => {
    const modules = Object.values(readLock(ctx.cwd).installations)
      .filter((record) => record.kind === "module")
      .sort((left, right) => left.artifactId.localeCompare(right.artifactId));
    if (!modules.length) ctx.logger.info("No modules installed");
    modules.forEach((module) =>
      ctx.logger.info(module.artifactId, {
        mode: module.mode,
        ...(module.packageBackend && { packageBackend: module.packageBackend }),
        ...(module.version && { version: module.version }),
      }),
    );
    return { exitCode: 0 };
  };
}

export const handleModuleList = createModuleListHandler();
