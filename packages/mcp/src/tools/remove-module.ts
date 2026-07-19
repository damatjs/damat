import { runDamat } from "../app";
import type { ToolDef } from "./types";

export const removeModule: ToolDef = {
  name: "remove_module",
  description:
    "Remove installer-owned module files and uniquely owned packages with " +
    "`damat module remove`. The plan reads damat.lock.json, reports remaining " +
    "usage, and never rolls back database tables or applied migrations. Use " +
    "dryRun first. Pass yes only after approval when owned files were modified.",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "Installation id recorded in damat.lock.json",
      },
      yes: {
        type: "boolean",
        description: "Confirm backup and removal of modified owned files.",
      },
      dryRun: {
        type: "boolean",
        description: "Print the removal plan without mutation.",
      },
    },
    required: ["id"],
    additionalProperties: false,
  },
  handler: async ({ id, yes, dryRun }) => {
    if (!id || typeof id !== "string") {
      return { text: "An 'id' string is required", isError: true };
    }
    const args = ["module", "remove", id];
    if (yes) args.push("--yes");
    if (dryRun) args.push("--dry-run");
    const { ok, output } = runDamat(args);
    return {
      text: output || (ok ? "Done." : "Remove failed."),
      isError: !ok,
    };
  },
};
