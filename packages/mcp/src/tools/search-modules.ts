import { NO_REGISTRY_MSG } from "../constants";
import { registryLocation } from "../env";
import { loadRegistryIndex, summarizeEntry } from "../registry";
import type { ToolDef } from "./types";

export const searchModules: ToolDef = {
  name: "search_modules",
  description:
    "Search the configured registry by a query string matched against module " +
    "ref, description and keywords. Use this to find a module to install.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search text (case-insensitive)" },
    },
    required: ["query"],
    additionalProperties: false,
  },
  handler: async ({ query }) => {
    const loc = registryLocation();
    if (!loc) return { text: NO_REGISTRY_MSG, isError: true };
    const q = String(query).toLowerCase();
    const index = await loadRegistryIndex(loc);
    const modules = Object.entries(index.modules)
      .filter(([key, entry]) => {
        const hay = [
          key,
          entry.description ?? "",
          (entry.keywords ?? []).join(" "),
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .map(([key, entry]) => summarizeEntry(key, entry));
    return {
      text: JSON.stringify({ query, count: modules.length, modules }, null, 2),
    };
  },
};
