import { readdirSync, statSync, existsSync } from "fs";
import { join } from "path";
import type { ScannedRoute } from "../types";
import { folderToUrlPath } from "./folderToUrlPath";

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
      // TODO: GOING TO REPLACE THIS WITH ANOTHER SYSTEM WHERE WE INTAKE THE GET, POST, DELETE,PATCH
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
