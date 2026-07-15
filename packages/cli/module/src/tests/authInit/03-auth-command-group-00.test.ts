import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { describe, test, expect, authCommand, createContext } from "./context";

describe("auth command group", () => {
  test("the parent prints a provider cheat-sheet", async () => {
    const { ctx, logger } = createContext({}, {
      args: [],
      cwd: "/app",
    } as never);
    expect((await authCommand.handler(ctx)).exitCode).toBe(0);
    const info = logger.info.mock.calls.map((c) => String(c[0])).join("\n");
    expect(info).toContain("services.auth");
    expect(info).toContain("Better Auth");
  });
});
