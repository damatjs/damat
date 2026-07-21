import { NO_REGISTRY_MSG } from "../constants";
import { registryLocation } from "../env";
import { loadRegistryIndex, summarizeEntry } from "../registry";
import type { ToolDef } from "./types";

export const listModules: ToolDef = {
  name: "list_modules",
  description:
    "List all modules available in the configured Damat module registry " +
    "(DAMAT_MODULE_REGISTRY). Returns each module's ref, description, latest " +
    "version, verification status and owner.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  handler: async () => {
    const loc = registryLocation();
    if (!loc) return { text: NO_REGISTRY_MSG, isError: true };
    const index = await loadRegistryIndex(loc);
    const modules = Object.entries(index.modules).map(([key, entry]) =>
      summarizeEntry(key, entry),
    );
    return {
      text: JSON.stringify(
        { registry: loc, count: modules.length, modules },
        null,
        2,
      ),
    };
  },
};
