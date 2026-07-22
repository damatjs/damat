import { describe, expect, it, mock } from "bun:test";
import { resolveRuntime } from "../../runtime";
import { initializeServices } from "../../services";
import type { AppConfig } from "../../config";

const config: AppConfig = {
  projectConfig: { http: { host: "localhost", port: 0 } },
};

describe("initializeServices lifecycle extension", () => {
  it("runs beforeDurability after base services are available", async () => {
    const hook = mock(({ instances }) => {
      expect(instances.healthChecks?.database).toBeDefined();
    });
    const services = await initializeServices(
      config,
      process.cwd(),
      resolveRuntime(config, {}),
      { beforeDurability: hook },
    );
    expect(hook).toHaveBeenCalledTimes(1);
    await services.shutdownHandlers
      .find(({ name }) => name === "logger")!
      .handler();
  });

  it("cleans initialized services and preserves hook failures", async () => {
    const failure = new Error("migration failed");
    await expect(
      initializeServices(config, process.cwd(), resolveRuntime(config, {}), {
        beforeDurability: () => {
          throw failure;
        },
      }),
    ).rejects.toBe(failure);
  });
});
