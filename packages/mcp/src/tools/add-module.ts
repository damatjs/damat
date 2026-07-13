import { runDamat } from "../app";
import type { ToolDef } from "./types";

export const addModule: ToolDef = {
  name: "add_module",
  description:
    "Install an existing module into the target Damat app by running " +
    "`damat module add`. The source may be a registry ref ('user', " +
    "'damatjs/user@0.2.0'), a local path ('./path/to/module'), a github " +
    "shorthand ('owner/repo' or 'owner/repo/sub/dir'), or a git URL. " +
    "Registry installs pass the registry verification gate; git and path " +
    "sources are REFUSED unless allowUnverified is true — only set it after " +
    "the user explicitly approved installing that exact source. Dependency " +
    "lifecycle scripts are skipped (`bun add --ignore-scripts`) unless " +
    "allowScripts is true. This copies the module into src/modules, " +
    "registers it in damat.config.ts, syncs required env vars to " +
    ".env.example, and installs npm packages. After it succeeds, run " +
    "migrations (damat-orm migrate:up) and restart.",
  inputSchema: {
    type: "object",
    properties: {
      source: {
        type: "string",
        description: "Registry ref, path, github shorthand, or git URL",
      },
      name: {
        type: "string",
        description:
          "Override the installed module id (single kebab-case segment)",
      },
      dir: {
        type: "string",
        description: "Target modules directory (default: src/modules)",
      },
      force: {
        type: "boolean",
        description: "Overwrite if the module already exists",
      },
      allowUnverified: {
        type: "boolean",
        description:
          "Opt in to installing an unverified path/git source (default false — " +
          "such installs are refused). Requires explicit user approval.",
      },
      allowScripts: {
        type: "boolean",
        description:
          "Run npm lifecycle scripts of the module's dependencies (default false).",
      },
    },
    required: ["source"],
    additionalProperties: false,
  },
  handler: async ({
    source,
    name,
    dir,
    force,
    allowUnverified,
    allowScripts,
  }) => {
    if (!source || typeof source !== "string") {
      return { text: "A 'source' string is required", isError: true };
    }
    const args = ["module", "add", source];
    if (name) args.push("--name", String(name));
    if (dir) args.push("--dir", String(dir));
    if (force) args.push("--force");
    if (allowUnverified) args.push("--allow-unverified");
    if (allowScripts) args.push("--allow-scripts");
    const { ok, output } = runDamat(args);
    return { text: output || (ok ? "Done." : "Install failed."), isError: !ok };
  },
};
