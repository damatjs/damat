import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { describe, it, expect, createContext, basePublishSetup } from "./context";

describe("module publish command", () => {
  const get = async () =>
    (await import("../../commands/module/publish")).modulePublishCommand;

  it("falls back to '(no body)' when the error response body is unreadable", async () => {
    basePublishSetup();
    const stubFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      ({
        ok: false,
        status: 500,
        text: () => Promise.reject(new Error("stream destroyed")),
      }) as unknown as Response) as typeof fetch;
    try {
      const cmd = await get();
      const { ctx, logger } = createContext({}, { cwd: "/m" });
      const res = await cmd.handler(ctx);
      expect(res.exitCode).toBe(1);
      expect(
        logger.error.mock.calls.some((c) => String(c[0]).includes("(no body)")),
      ).toBe(true);
    } finally {
      globalThis.fetch = stubFetch;
    }
  });
});
