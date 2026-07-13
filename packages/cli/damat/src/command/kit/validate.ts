import type { Command } from "@damatjs/cli";
import { reportError } from "@damatjs/cli";
import { readKitManifest } from "./manifest";
import { buildKitPlan } from "./plan";

export const kitValidateCommand: Command = {
  name: "validate",
  description: "Check this kit's damat-kit.json and preview where every file would land",
  usage: "damat kit validate",
  options: [],
  handler: async (ctx) => {
    let manifest;
    try {
      manifest = readKitManifest(ctx.cwd);
    } catch (e) {
      reportError(ctx.logger, e, { prefix: "Kit manifest invalid" });
      return { exitCode: 1 };
    }

    const plan = buildKitPlan(ctx.cwd, manifest);
    const viaMapping = plan.files.filter((f) => f.via === "mapping").length;
    const viaFallback = plan.files.filter((f) => f.via === "fallback").length;

    ctx.logger.info(
      [
        `Kit "${manifest.name}" placement preview:`,
        ...plan.files.map(
          (f) => `  ${f.source} -> ${f.target}${f.via === "fallback" ? "  (fallback)" : ""}`,
        ),
      ].join("\n"),
    );
    ctx.logger.info("Summary", {
      mapped: viaMapping,
      fallback: viaFallback,
      unmatched: plan.unmatched.length,
    });

    if (plan.unmatched.length > 0) {
      ctx.logger.warn(
        [
          "These files match no mapping and there is no `fallback` — installs will skip them:",
          ...plan.unmatched.map((f) => `  - ${f}`),
        ].join("\n"),
      );
    }
    if (plan.files.length === 0) {
      ctx.logger.error("The kit ships no files — check `mappings`/`ignore`");
      return { exitCode: 1 };
    }

    ctx.logger.success("Kit manifest is valid");
    return { exitCode: 0 };
  },
};
