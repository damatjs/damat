import type { Command } from "@damatjs/cli";
import { readInstallerLock } from "@damatjs/installer";

export const kitListCommand: Command = {
  name: "list",
  description: "List installed kits from damat.lock.json",
  handler: async (ctx) => {
    const kits = Object.values(readInstallerLock(ctx.cwd).installations)
      .filter((record) => record.kind === "kit")
      .sort((left, right) => left.artifactId.localeCompare(right.artifactId));
    if (!kits.length) ctx.logger.info("No kits installed");
    kits.forEach((kit) =>
      ctx.logger.info(kit.artifactId, {
        mode: kit.mode,
        ...(kit.packageBackend && { packageBackend: kit.packageBackend }),
        ...(kit.version && { version: kit.version }),
      }),
    );
    return { exitCode: 0 };
  },
};
