import { afterEach, expect, test } from "bun:test";
import type { Logger, LoggerConfig } from "@damatjs/logger";
import type { AppConfig } from "../../config";
import { start } from "../../entry";
import { clearGlobalLogger } from "../../services";

afterEach(clearGlobalLogger);

test("entry configures one logger before hooks and shutdown", async () => {
  const order: string[] = [];
  const received: unknown[] = [];
  const logger = { marker: "configured" } as unknown as Logger;
  const loggerConfig: LoggerConfig = { level: "debug", prefix: "app" };
  const config: AppConfig = {
    projectConfig: { http: { port: 3000 }, loggerConfig },
    runtime: { mode: "server" },
    hooks: {
      beforeServices: ({ logger: hookLogger }) => {
        order.push("before");
        received.push(hookLogger);
      },
      afterServices: ({ logger: hookLogger }) => {
        order.push("after");
        received.push(hookLogger);
      },
    },
  };

  await start(
    "/app",
    {},
    {
      loadConfigAsync: async () => config,
      initLogger: (receivedConfig) => {
        order.push("logger");
        expect(receivedConfig).toBe(loggerConfig);
        return logger;
      },
      setupShutdownHandlers: (signalLogger) => {
        order.push("signals");
        received.push(signalLogger);
      },
      initializeServices: async () => {
        order.push("services");
        return { shutdownHandlers: [] };
      },
      registerShutdown: () => {},
      startHttpRuntime: async () => ({ close: async () => {} }),
    },
  );

  expect(order).toEqual(["logger", "before", "signals", "services", "after"]);
  expect(received).toEqual([logger, logger, logger]);
});
