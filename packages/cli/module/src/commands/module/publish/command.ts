import type { Command } from "@damatjs/cli";
import { handleModulePublish } from "./handler";

export const modulePublishCommand: Command = {
  name: "publish",
  description:
    "Validate, build, pack, and publish this module to the registry gateway",
  aliases: ["pub"],
  usage:
    "damat module publish [--no-typecheck] [--no-validate] [--dry-run] [--registry <url>] [--token <token>]",
  options: [
    {
      name: "typecheck",
      type: "boolean",
      description: "Type-check before building (use --no-typecheck to skip)",
      default: true,
    },
    {
      name: "validate",
      type: "boolean",
      description:
        "Contract-validate before building (use --no-validate to skip)",
      default: true,
    },
    {
      name: "dry-run",
      type: "boolean",
      description:
        "Validate + build + pack but do NOT publish — print what would be sent",
      default: false,
    },
    {
      name: "registry",
      type: "string",
      description:
        "Gateway base URL (overrides DAMAT_PUBLISH_REGISTRY / derived from DAMAT_MODULE_REGISTRY)",
    },
    {
      name: "token",
      type: "string",
      description: "Publish token (overrides DAMAT_PUBLISH_TOKEN)",
    },
  ],
  handler: handleModulePublish,
};
