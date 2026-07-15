import type { Command } from "@damatjs/cli";
import { handleClone } from "./handler";

export const cloneCommand: Command = {
  name: "clone",
  description:
    "Clone a git repo (URL or github shorthand) with optional fresh history, rename, and install",
  usage:
    "damat clone <source> [dir] [--branch <ref>] [--depth <n>] [--fresh] [--name <pkg>] [--install]",
  examples: [
    "damat clone https://github.com/acme/service.git",
    "damat clone acme/service my-service --fresh --install",
    "damat clone acme/monorepo/examples/api#v2 my-api --fresh   # subdirectory + ref",
  ],
  options: [
    {
      name: "branch",
      alias: "b",
      type: "string",
      description:
        "Branch or tag to clone (overrides a #ref suffix on the source)",
    },
    {
      name: "depth",
      type: "number",
      description:
        "Shallow-clone depth (default: full history, like git clone)",
    },
    {
      name: "fresh",
      alias: "f",
      type: "boolean",
      description:
        "Start a new git history: strip .git/.github, git init -b main, bootstrap commit",
      default: false,
    },
    {
      name: "name",
      alias: "n",
      type: "string",
      description: "Rewrite package.json's name field after cloning",
    },
    {
      name: "install",
      type: "boolean",
      description: "Run bun install after cloning",
      default: false,
    },
  ],
  handler: handleClone,
};
