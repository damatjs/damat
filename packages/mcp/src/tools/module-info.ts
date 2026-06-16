import { NO_REGISTRY_MSG } from "../constants";
import { registryLocation } from "../env";
import {
  formatModuleRef,
  loadRegistryIndex,
  lookupEntry,
  parseModuleRef,
  summarizeEntry,
} from "../registry";
import type { ToolDef } from "./types";

export const moduleInfo: ToolDef = {
  name: "module_info",
  description:
    "Get full registry details for one module ref (e.g. 'user', " +
    "'damatjs/user@0.2.0'): description, versions, source, owner, license, " +
    "verification status and links. Read this before installing.",
  inputSchema: {
    type: "object",
    properties: {
      ref: { type: "string", description: "Module ref: name, namespace/name, optionally @version" },
    },
    required: ["ref"],
    additionalProperties: false,
  },
  handler: async ({ ref }) => {
    const loc = registryLocation();
    if (!loc) return { text: NO_REGISTRY_MSG, isError: true };
    const parsed = parseModuleRef(String(ref));
    if (!parsed) return { text: `"${ref}" is not a valid module ref`, isError: true };
    const index = await loadRegistryIndex(loc);
    const found = lookupEntry(index, parsed);
    if (!found) {
      return { text: `Registry has no module "${formatModuleRef(parsed)}"`, isError: true };
    }
    return { text: JSON.stringify(summarizeEntry(found.key, found.entry), null, 2) };
  },
};
