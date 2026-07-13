import { runDamat } from "../app";
import type { ToolDef } from "./types";

export const removeModule: ToolDef = {
  name: "remove_module",
  description:
    "Remove an installed module from the target Damat app by running " +
    "`damat module remove`. Deletes the module's files (src/modules/<id>, its " +
    "grouped routes/workflows/links/tests), deregisters it from " +
    "damat.config.ts, and drops its tsconfig alias. Refused while other " +
    "installed modules depend on it unless force is true. Database tables and " +
    "applied migrations are NOT rolled back. Use dryRun first to show the " +
    "user exactly what would be deleted before removing anything.",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "The installed module id (single kebab-case segment)",
      },
      dir: {
        type: "string",
        description: "Modules directory (default: src/modules)",
      },
      force: {
        type: "boolean",
        description:
          "Remove even when other installed modules depend on this one " +
          "(default false). Requires explicit user approval.",
      },
      cleanEnv: {
        type: "boolean",
        description:
          "Also remove the module's env block from .env.example (.env is never touched).",
      },
      dryRun: {
        type: "boolean",
        description: "Print what would be removed without deleting anything.",
      },
    },
    required: ["id"],
    additionalProperties: false,
  },
  handler: async ({ id, dir, force, cleanEnv, dryRun }) => {
    if (!id || typeof id !== "string") {
      return { text: "An 'id' string is required", isError: true };
    }
    const args = ["module", "remove", id];
    if (dir) args.push("--dir", String(dir));
    if (force) args.push("--force");
    if (cleanEnv) args.push("--clean-env");
    if (dryRun) args.push("--dry-run");
    const { ok, output } = runDamat(args);
    return { text: output || (ok ? "Done." : "Remove failed."), isError: !ok };
  },
};
