import { listInstalled } from "../app";
import { appDir } from "../env";
import type { ToolDef } from "./types";

export const listInstalledTool: ToolDef = {
  name: "list_installed",
  description:
    "List Damat modules already installed in the target app by scanning its " +
    "modules directory (default src/modules) for module.json manifests.",
  inputSchema: {
    type: "object",
    properties: {
      dir: {
        type: "string",
        description: "Modules directory (default: src/modules)",
      },
    },
    additionalProperties: false,
  },
  handler: async ({ dir }) => {
    const modulesDir = (dir as string) || "src/modules";
    const installed = listInstalled(modulesDir);
    return {
      text: JSON.stringify(
        { app: appDir(), dir: modulesDir, count: installed.length, installed },
        null,
        2,
      ),
    };
  },
};
