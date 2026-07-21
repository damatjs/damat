import { listInstalled } from "../app";
import { appDir } from "../env";
import type { ToolDef } from "./types";

export const listInstalledTool: ToolDef = {
  name: "list_installed",
  description:
    "List module installations recorded by the target app's transactional " +
    "damat.lock.json. This remains authoritative when module capabilities are " +
    "distributed across modules, routes, workflows, jobs, events, and pipelines.",
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const installed = listInstalled();
    return {
      text: JSON.stringify(
        { app: appDir(), count: installed.length, installed },
        null,
        2,
      ),
    };
  },
};
