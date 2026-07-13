import { runDamat } from "../app";
import type { ToolDef } from "./types";

export const updateModule: ToolDef = {
  name: "update_module",
  description:
    "Update an installed module by running `damat module update`: re-fetches " +
    "the module from the source recorded in damat.config.ts, shows a version " +
    "and file diff, and force-reinstalls it. Overwrites any local edits to " +
    "the module's installed files, so use dryRun first and get the user's " +
    "approval before passing yes. Path/git sources are refused unless " +
    "allowUnverified is true.",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "The installed module id (single kebab-case segment)" },
      dir: { type: "string", description: "Modules directory (default: src/modules)" },
      yes: {
        type: "boolean",
        description:
          "Apply the update (default false — without it the command only " +
          "prints the diff and fails). Requires explicit user approval since " +
          "local edits are overwritten.",
      },
      allowUnverified: {
        type: "boolean",
        description:
          "Allow updating from a recorded path/git source (default false).",
      },
      allowScripts: {
        type: "boolean",
        description:
          "Run npm lifecycle scripts of the module's dependencies (default false).",
      },
      dryRun: {
        type: "boolean",
        description: "Show the version and file changes without writing anything.",
      },
    },
    required: ["id"],
    additionalProperties: false,
  },
  handler: async ({ id, dir, yes, allowUnverified, allowScripts, dryRun }) => {
    if (!id || typeof id !== "string") {
      return { text: "An 'id' string is required", isError: true };
    }
    const args = ["module", "update", id];
    if (dir) args.push("--dir", String(dir));
    if (yes) args.push("--yes");
    if (allowUnverified) args.push("--allow-unverified");
    if (allowScripts) args.push("--allow-scripts");
    if (dryRun) args.push("--dry-run");
    const { ok, output } = runDamat(args);
    return { text: output || (ok ? "Done." : "Update failed."), isError: !ok };
  },
};
