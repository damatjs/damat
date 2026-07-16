import { createServer } from "node:net";
import { serve } from "@damatjs/deps/hono";
import type { ModuleServerHandle } from "./types";

type ClosableServer = ModuleServerHandle & {
  closeIdleConnections?: () => void;
  closeAllConnections?: () => void;
};

export async function resolveServerPort(requested: number): Promise<number> {
  if (requested !== 0) return requested;
  return new Promise<number>((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = typeof address === "object" && address ? address.port : 0;
      probe.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

export async function startHttpServer(
  fetch: (request: Request) => Response | Promise<Response>,
  requestedPort: number,
  listening: (port: number) => void,
): Promise<{ server: ModuleServerHandle; port: number }> {
  const selectedPort = await resolveServerPort(requestedPort);
  return new Promise((resolve) => {
    const server = serve({ fetch, port: selectedPort }, ({ port }) => {
      listening(port);
      resolve({ server, port });
    });
  });
}

export async function closeServer(server: ClosableServer): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeIdleConnections?.();
    server.closeAllConnections?.();
  });
}
