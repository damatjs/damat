import { getRegistryIndex } from "@/lib/registry";

// Prerender to a static file so `/index.json` is served straight from the CDN.
export const dynamic = "force-static";

/**
 * The machine-readable registry index consumed by the Damat CLI/MCP via
 * DAMAT_MODULE_REGISTRY (https://registry.damatjs.com/index.json).
 */
export function GET() {
  return Response.json(getRegistryIndex(), {
    headers: {
      "Cache-Control":
        "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
