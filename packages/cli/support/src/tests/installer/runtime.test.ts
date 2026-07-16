import { describe, expect, mock, test } from "bun:test";
import {
  createInstallerPorts,
  createInstallerRuntime,
} from "../../installer/runtime";

function context(options: Record<string, unknown> = {}) {
  return {
    cwd: "/app",
    options,
    logger: {
      info: mock(() => {}),
      warn: mock(() => {}),
      error: mock(() => {}),
    },
  } as never;
}

describe("installer CLI adapters", () => {
  test("adapts fetch responses for artifact acquisition", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = mock(
      async () => new Response('{"ok":true}', { status: 201 }),
    );
    try {
      const response = await createInstallerPorts(context()).fetch!(
        "https://example.test/a",
      );
      expect(response.ok).toBe(true);
      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({ ok: true });
      const bytes = await createInstallerPorts(context()).fetch!(
        "https://example.test/a",
      );
      expect(await bytes.arrayBuffer()).toBeInstanceOf(ArrayBuffer);
    } finally {
      globalThis.fetch = original;
    }
  });

  test("maps runtime flags, package manager, and logger calls", () => {
    const ctx = context({
      "package-manager": "pnpm",
      "dry-run": true,
      "allow-scripts": true,
    });
    const runtime = createInstallerRuntime(ctx);
    runtime.logger.info("i");
    runtime.logger.warn("w");
    runtime.logger.error("e");
    expect(runtime).toMatchObject({
      dryRun: true,
      allowScripts: true,
      packageManager: "pnpm",
    });
    expect(ctx.logger.info).toHaveBeenCalledWith("i");
    expect(ctx.logger.warn).toHaveBeenCalledWith("w");
    expect(ctx.logger.error).toHaveBeenCalledWith("e");
    expect(
      createInstallerRuntime(context({ "package-manager": "other" }))
        .packageManager,
    ).toBeUndefined();
  });
});
