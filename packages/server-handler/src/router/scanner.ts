import { readdirSync, statSync, existsSync } from "fs";
import { join } from "path";
import type { ScannedRoute } from "./types";

export function folderToUrlPath(folderPath: string): string {
  return (
    folderPath
      .replace(/\[\.\.\.([^\]]+)\]/g, "*")
      .replace(/\[([^\]]+)\]/g, ":$1")
  );
}

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
      const newBasePath = basePath ? `${basePath}/${entry}` : entry;
      routes.push(...scanDirectory(fullPath, newBasePath));
    } else if (entry === "route.ts" || entry === "route.js") {
      const urlPath = folderToUrlPath(basePath) || "/";
      routes.push({
        urlPath: urlPath.startsWith("/") ? urlPath : `/${urlPath}`,
        filePath: fullPath,
      });
    }
  }

  return routes;
}

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
