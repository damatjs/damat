import { runDamat } from "../app";
import {
  appendInstallOptions,
  installOptionProperties,
} from "./install-options";
import type { ToolDef } from "./types";

export const addModule: ToolDef = {
  name: "add_module",
  description:
    "Install a module with `damat module add`. Sources may be registry refs, " +
    "local paths, Git sources, npm packages, or tarballs. Unverified origins " +
    "require explicit allowUnverified approval; dependency lifecycle scripts " +
    "require allowScripts. Stable source mode copies declared capabilities " +
    "and reports backend-owned integration work without editing shared config, " +
    "environment, barrels, or call sites. Review that report, migrate, restart.",
  inputSchema: {
    type: "object",
    properties: {
      source: {
        type: "string",
        description: "Registry ref, local path, Git/npm source, or tarball",
      },
      ...installOptionProperties,
    },
    required: ["source"],
    additionalProperties: false,
  },
  handler: async (input) => {
    if (!input.source || typeof input.source !== "string") {
      return { text: "A 'source' string is required", isError: true };
    }
    const args = ["module", "add", input.source];
    appendInstallOptions(args, input);
    const { ok, output } = runDamat(args);
    return {
      text: output || (ok ? "Done." : "Install failed."),
      isError: !ok,
    };
  },
};
