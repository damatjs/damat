import type { ServerHandle } from "../server";
import type { ShutdownRegistration } from "../shutdown";
import type { ResolvedRuntime } from "./types";

interface RuntimeServiceResult {
  shutdownHandlers: ShutdownRegistration[];
}

export interface RuntimeStartupDependencies<T extends RuntimeServiceResult> {
  initialize(runtime: ResolvedRuntime): Promise<T>;
  startHttp(services: T): Promise<ServerHandle> | ServerHandle;
  register(handler: ShutdownRegistration): void;
}

export async function startResolvedRuntime<T extends RuntimeServiceResult>(
  runtime: ResolvedRuntime,
  dependencies: RuntimeStartupDependencies<T>,
): Promise<void> {
  const services = await dependencies.initialize(runtime);
  for (const handler of services.shutdownHandlers) {
    dependencies.register(handler);
  }
  if (!runtime.servesHttp) return;
  const server = await dependencies.startHttp(services);
  dependencies.register({
    name: "http",
    phase: "http",
    handler: () => server.close(),
  });
}
