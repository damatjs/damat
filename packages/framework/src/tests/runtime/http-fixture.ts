import { Hono } from "@damatjs/deps/hono";
import { NOOP_LOGGER } from "@damatjs/logger";
import type { BootstrapOptions, ServerConfig } from "../../types";

export function createHttpFixture() {
  const bootstrapOptions: BootstrapOptions[] = [];
  const serverCalls: unknown[][] = [];
  const app = new Hono();
  const serverConfig: ServerConfig = {
    port: 4100,
    host: "127.0.0.1",
    nodeEnv: "test",
  };
  const handle = { close: async () => {} };
  const dependencies = {
    bootstrap: async (options: BootstrapOptions) => {
      bootstrapOptions.push(options);
      return { app, config: serverConfig };
    },
    startServer: (...args: unknown[]) => {
      serverCalls.push(args);
      return handle;
    },
    getLogger: () => NOOP_LOGGER,
  };
  return {
    app,
    bootstrapOptions,
    dependencies,
    handle,
    logger: NOOP_LOGGER,
    serverCalls,
    serverConfig,
  };
}
