import type { Command } from "@damatjs/cli";
import { CLI_VERSION } from "../../version.generated";
import { handleCreate } from "./handler";

export const createCommand: Command = {
  name: "create",
  description:
    "Scaffold a new Damat backend app (offline, from embedded templates)",
  aliases: ["new"],
  usage:
    "damat create <name> [--dir <path>] [--pin <version>] [--no-git] [--no-install]",
  examples: [
    "damat create my-api",
    "damat create my-api --no-install   # scaffold only, install later",
    "damat create my-api --pin 0.6.0    # pin @damatjs/* to a specific version",
  ],
  options: [
    {
      name: "dir",
      alias: "d",
      type: "string",
      description: "Directory to create the app in (default: ./<name>)",
    },
    {
      name: "pin",
      alias: "p",
      type: "string",
      description: `Pin @damatjs/* dependencies to a version (default: the CLI's own version, ${CLI_VERSION})`,
    },
    {
      name: "git",
      type: "boolean",
      description:
        "Initialize a git repository with an initial commit (use --no-git to skip)",
      default: true,
    },
    {
      name: "install",
      type: "boolean",
      description:
        "Run bun install after scaffolding (use --no-install to skip)",
      default: true,
    },
  ],
  handler: handleCreate,
};
