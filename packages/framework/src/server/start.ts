import { serve } from "@damatjs/deps/hono";
import type { Hono } from "@damatjs/deps/hono";
import type { ILogger, Logger, ServerConfig } from "../types";
import type { ServerHandle } from "./types";

export function startServer(
  app: Hono,
  config: ServerConfig,
  logger: Logger | ILogger,
  serveAdapter: typeof serve = serve,
): ServerHandle {
  const server = serveAdapter(
    {
      fetch: app.fetch,
      port: config.port,
      ...(config.host === undefined ? {} : { hostname: config.host }),
    },
    (info: { port: number }) => {
      logger.info("Server running", {
        url: `http://localhost:${info.port}`,
      });
    },
  );
  let closing: Promise<void> | undefined;
  return {
    close() {
      closing ??= closeServer(server);
      return closing;
    },
  };
}

function closeServer(server: ReturnType<typeof serve>): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const close = () => {
      server.off("error", reject);
      server.close((error) => (error ? reject(error) : resolve()));
    };
    if (server.listening) return close();
    server.once("listening", close);
    server.once("error", reject);
  });
}
