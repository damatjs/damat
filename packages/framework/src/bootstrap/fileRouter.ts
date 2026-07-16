import { aggregateFileRouters, createFileRouter } from "../router";
import { getLogger } from "../services";
import type { BootstrapOptions } from "../types";

type FileRouterOptions = Pick<
  BootstrapOptions,
  "routesDir" | "routeProviders" | "projectConfig" | "authHandlers"
>;

export async function createBootstrapFileRouter({
  routesDir,
  routeProviders = [],
  projectConfig,
  authHandlers,
}: FileRouterOptions) {
  const routerOptions = {
    debug: projectConfig.nodeEnv === "development",
    logger: getLogger(),
    rateLimit: projectConfig.http.rateLimit,
    auth: projectConfig.http.auth,
    authHandlers,
  };
  const routers = await Promise.all([
    createFileRouter({ routesDir, ...routerOptions }),
    ...routeProviders.map((provider) =>
      createFileRouter({
        routesDir: provider.routesDir,
        ...(provider.basePath !== undefined && {
          basePath: provider.basePath,
        }),
        ...routerOptions,
      }),
    ),
  ]);
  return aggregateFileRouters(routers);
}
