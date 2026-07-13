import { NO_REGISTRY_MSG } from "../constants";
import { registryLocation } from "../env";
import {
  fetchVerdict,
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
    "verification status, security verdict (legit/flagged/malicious) and links. " +
    "Read this before installing.",
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

    // Resolve which version to fetch the verdict for: explicit ref version,
    // then entry.latest, then fall back to "latest" as a sentinel.
    const version = parsed.version ?? found.entry.latest ?? "latest";

    // Attempt a live verdict fetch from the gateway (hosted registries only).
    // fetchVerdict is graceful: returns null for local/file registries or
    // when the network is unavailable — we fall through to the static entry.verdict.
    const liveVerdict = await fetchVerdict(loc, found.key, version);

    return {
      text: JSON.stringify(summarizeEntry(found.key, found.entry, liveVerdict), null, 2),
    };
  },
};
