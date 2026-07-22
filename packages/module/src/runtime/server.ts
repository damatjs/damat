import { createServer } from "node:net";
import { serve } from "@damatjs/deps/hono";
import type { ModuleServerHandle } from "./types";

type ClosableServer = ModuleServerHandle & {
  closeIdleConnections?: () => void;
  closeAllConnections?: () => void;
};

export class ModulePortInUseError extends Error {
  constructor(readonly port: number) {
    super(`Port ${port} is already in use.`);
    this.name = "ModulePortInUseError";
  }
}

function codeOf(error: unknown): string | undefined {
  return error && typeof error === "object" && "code" in error
    ? String(error.code)
    : undefined;
}

function listenError(error: unknown, port: number): Error {
  if (codeOf(error) === "EADDRINUSE") return new ModulePortInUseError(port);
  return error instanceof Error ? error : new Error(String(error));
}

function validatePort(port: number): void {
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new Error(`Invalid module server port: ${String(port)}`);
  }
}

export async function resolveServerPort(
  requested: number,
  host = "127.0.0.1",
): Promise<number> {
  validatePort(requested);
  return new Promise<number>((resolve, reject) => {
    const probe = createServer();
    probe.once("error", (error) => reject(listenError(error, requested)));
    probe.listen(requested, host, () => {
      const address = probe.address();
      const port = typeof address === "object" && address ? address.port : 0;
      probe.close((error) =>
        error ? reject(listenError(error, requested)) : resolve(port),
      );
    });
  });
}

export async function assertServerPortAvailable(
  requested: number,
  host = "127.0.0.1",
): Promise<void> {
  validatePort(requested);
  if (requested !== 0) await resolveServerPort(requested, host);
}

export async function startHttpServer(
  fetch: (request: Request) => Response | Promise<Response>,
  requestedPort: number,
  host: string,
  serveHttp: typeof serve = serve,
): Promise<{ server: ModuleServerHandle; port: number }> {
  const selectedPort = await resolveServerPort(requestedPort, host);
  return new Promise((resolve, reject) => {
    try {
      const server = serveHttp(
        { fetch, port: selectedPort, hostname: host },
        ({ port }) => resolve({ server, port }),
      );
      server.once("error", (error) => reject(listenError(error, selectedPort)));
    } catch (error) {
      reject(listenError(error, selectedPort));
    }
  });
}

export async function closeServer(server: ClosableServer): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) =>
      !error || codeOf(error) === "ERR_SERVER_NOT_RUNNING"
        ? resolve()
        : reject(error),
    );
    server.closeIdleConnections?.();
    server.closeAllConnections?.();
  });
}
