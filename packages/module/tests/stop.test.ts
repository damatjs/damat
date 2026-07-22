import { describe, expect, test } from "bun:test";
import net from "node:net";
import { serve, Hono } from "@damatjs/deps/hono";
import {
  assertServerPortAvailable,
  closeServer,
  ModulePortInUseError,
  resolveServerPort,
  startHttpServer,
} from "../src/runtime/server";

/**
 * Guards the harness teardown contract: `closeServer` (used by
 * `startModuleApp().stop()`) must resolve promptly even when a client is holding
 * a keep-alive connection open and the route never read the request body.
 *
 * Under Node, a bare graceful `server.close()` hangs forever in exactly this
 * situation; the force-close inside `closeServer` is what prevents it. (Under
 * Bun `close()` already resolves immediately, so here this is a behavioural
 * guard — but it fails fast instead of hanging if the force-close regresses.)
 */
describe("closeServer", () => {
  test("validates ports and detects an occupied fixed port", async () => {
    await expect(assertServerPortAvailable(-1)).rejects.toThrow(
      "Invalid module server port",
    );
    await expect(assertServerPortAvailable(0)).resolves.toBeUndefined();
    const blocker = net.createServer();
    await new Promise<void>((resolve) =>
      blocker.listen(0, "127.0.0.1", resolve),
    );
    const address = blocker.address();
    const port = typeof address === "object" && address ? address.port : 0;
    try {
      await expect(resolveServerPort(port)).rejects.toBeInstanceOf(
        ModulePortInUseError,
      );
    } finally {
      await new Promise<void>((resolve) => blocker.close(() => resolve()));
    }
  });

  test("maps a bind-time address collision", async () => {
    const error = Object.assign(new Error("occupied"), { code: "EADDRINUSE" });
    const serve = (_options: unknown, _ready: unknown) =>
      ({
        once: (_event: string, listener: (reason: Error) => void) =>
          queueMicrotask(() => listener(error)),
      }) as never;
    await expect(
      startHttpServer(() => new Response("ok"), 0, "127.0.0.1", serve as never),
    ).rejects.toBeInstanceOf(ModulePortInUseError);
  });

  test("resolves promptly with a held-open keep-alive connection + unread body", async () => {
    const app = new Hono();
    app.post("/x", (c) => c.json({ ok: true })); // never reads the request body

    const selectedPort = await resolveServerPort(0);
    const { server, port } = await new Promise<{ server: any; port: number }>(
      (resolve) => {
        const handle = serve(
          { fetch: app.fetch, port: selectedPort },
          (info: any) => resolve({ server: handle, port: info.port }),
        );
      },
    );

    // A real held-open keep-alive connection (what a pooled HTTP client leaves).
    const socket = net.connect(port, "127.0.0.1");
    await new Promise<void>((r) => socket.once("connect", () => r()));
    const body = JSON.stringify({ hello: "x" });
    socket.write(
      `POST /x HTTP/1.1\r\nHost: localhost\r\nContent-Type: application/json\r\nContent-Length: ${Buffer.byteLength(
        body,
      )}\r\nConnection: keep-alive\r\n\r\n${body}`,
    );
    await new Promise<void>((r) => socket.once("data", () => r())); // response received

    try {
      const result = await Promise.race([
        closeServer(server).then(() => "closed" as const),
        new Promise<"timeout">((r) => setTimeout(() => r("timeout"), 2000)),
      ]);
      expect(result).toBe("closed");
    } finally {
      socket.destroy();
      server.closeAllConnections?.();
    }
  });
});
