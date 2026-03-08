import { readdirSync, statSync, existsSync } from "fs";
import { join } from "path";
import type { ScannedRoute } from "./types";

/**
 * Converts folder path to URL path
 * - [param] -> :param (dynamic segments)
 * - [...param] -> * (catch-all segments)
 */
export function folderToUrlPath(folderPath: string): string {
  return (
    folderPath
      // Convert [...param] to catch-all
      .replace(/\[\.\.\.([^\]]+)\]/g, "*")
      // Convert [param] to :param
      .replace(/\[([^\]]+)\]/g, ":$1")
  );
}

/**
 * Recursively scan a directory for route.ts files
 */
export function scanDirectory(
  dir: string,
  basePath: string = "",
): ScannedRoute[] {
  const routes: ScannedRoute[] = [];

  if (!existsSync(dir)) {
    return routes;
  }

  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      // Recursively scan subdirectories
      const newBasePath = basePath ? `${basePath}/${entry}` : entry;
      routes.push(...scanDirectory(fullPath, newBasePath));
    } else if (entry === "route.ts" || entry === "route.js") {
      // Found a route file
      const urlPath = folderToUrlPath(basePath) || "/";
      routes.push({
        urlPath: urlPath.startsWith("/") ? urlPath : `/${urlPath}`,
        filePath: fullPath,
      });
    }
  }

  return routes;
}

/**
 * Sort routes so static routes come before dynamic ones
 * Ensures /teams/invitations comes before /teams/:teamId
 */
export function sortRoutes(routes: ScannedRoute[]): ScannedRoute[] {
  return [...routes].sort((a, b) => {
    const aHasDynamic = a.urlPath.includes(":") || a.urlPath.includes("*");
    const bHasDynamic = b.urlPath.includes(":") || b.urlPath.includes("*");

    if (aHasDynamic && !bHasDynamic) return 1;
    if (!aHasDynamic && bHasDynamic) return -1;

    // Sort by path depth (shallower first)
    const aDepth = a.urlPath.split("/").length;
    const bDepth = b.urlPath.split("/").length;
    if (aDepth !== bDepth) return aDepth - bDepth;

    // Alphabetical
    return a.urlPath.localeCompare(b.urlPath);
  });
}
