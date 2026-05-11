import type { ScannedRoute } from "../types";

export function sortRoutes(routes: ScannedRoute[]): ScannedRoute[] {
  return [...routes].sort((a, b) => {
    const aHasDynamic = a.urlPath.includes(":") || a.urlPath.includes("*");
    const bHasDynamic = b.urlPath.includes(":") || b.urlPath.includes("*");

    if (aHasDynamic && !bHasDynamic) return 1;
    if (!aHasDynamic && bHasDynamic) return -1;

    const aDepth = a.urlPath.split("/").length;
    const bDepth = b.urlPath.split("/").length;
    if (aDepth !== bDepth) return aDepth - bDepth;

    return a.urlPath.localeCompare(b.urlPath);
  });
}
