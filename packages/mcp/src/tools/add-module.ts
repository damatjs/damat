import { runDamat } from "../app";
import type { ToolDef } from "./types";

export const addModule: ToolDef = {
  name: "add_module",
  description:
    "Install an existing module into the target Damat app by running " +
    "`damat module add`. The source may be a registry ref ('user', " +
    "'damatjs/user@0.2.0'), a local path ('./path/to/module'), a github " +
    "shorthand ('owner/repo' or 'owner/repo/sub/dir'), or a git URL. This " +
    "copies the module into src/modules, registers it in damat.config.ts, " +
    "syncs required env vars to .env.example, and installs npm packages. " +
    "After it succeeds, run migrations (damat-orm migrate:up) and restart.",
  inputSchema: {
    type: "object",
    properties: {
      source: { type: "string", description: "Registry ref, path, github shorthand, or git URL" },
      name: { type: "string", description: "Override the installed module id" },
      dir: { type: "string", description: "Target modules directory (default: src/modules)" },
      force: { type: "boolean", description: "Overwrite if the module already exists" },
    },
    required: ["source"],
    additionalProperties: false,
  },
  handler: async ({ source, name, dir, force }) => {
    if (!source || typeof source !== "string") {
      return { text: "A 'source' string is required", isError: true };
    }
    const args = ["module", "add", source];
    if (name) args.push("--name", String(name));
    if (dir) args.push("--dir", String(dir));
    if (force) args.push("--force");
    const { ok, output } = runDamat(args);
    return { text: output || (ok ? "Done." : "Install failed."), isError: !ok };
  },
};
