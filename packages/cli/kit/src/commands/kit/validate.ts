import type { Command } from "@damatjs/cli";
import { reportError } from "@damatjs/cli";
import { loadKitProfile } from "./profile";

export const kitValidateCommand: Command = {
  name: "validate",
  description:
    "Check this kit's damat.json and preview where every file would land",
  usage: "damat kit validate",
  options: [],
  handler: async (ctx) => {
    try {
      const manifest = loadKitProfile(ctx.cwd);
      const capabilities = Object.keys(manifest.install?.provides ?? {});
      if (!capabilities.length) {
        ctx.logger.error("The kit provides no install capabilities");
        return { exitCode: 1 };
      }
      ctx.logger.info(`Kit "${manifest.name}"`, {
        capabilities,
        modes: manifest.install?.modes ?? ["source"],
      });
      ctx.logger.success("Kit manifest is valid");
      return { exitCode: 0 };
    } catch (e) {
      reportError(ctx.logger, e, { prefix: "Kit manifest invalid" });
      return { exitCode: 1 };
    }
  },
};
