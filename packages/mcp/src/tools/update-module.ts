import { runDamat } from "../app";
import {
  appendInstallOptions,
  installOptionProperties,
} from "./install-options";
import type { ToolDef } from "./types";

export const updateModule: ToolDef = {
  name: "update_module",
  description:
    "Update a module from the origin recorded in damat.lock.json. The " +
    "transactional installer shows owned-file changes and backs up modified " +
    "files only when yes is explicitly approved. Use dryRun before mutation; " +
    "unverified origins still require allowUnverified.",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "Installation id recorded in damat.lock.json",
      },
      ...installOptionProperties,
    },
    required: ["id"],
    additionalProperties: false,
  },
  handler: async (input) => {
    if (!input.id || typeof input.id !== "string") {
      return { text: "An 'id' string is required", isError: true };
    }
    const args = ["module", "update", input.id];
    appendInstallOptions(args, input);
    const { ok, output } = runDamat(args);
    return {
      text: output || (ok ? "Done." : "Update failed."),
      isError: !ok,
    };
  },
};
