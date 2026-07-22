import { expect, mock, test } from "bun:test";
import { PoolManager } from "@damatjs/services";

const disconnect = mock(async () => {});
const pool = { query: async () => ({ rows: [] }) };
const realPath = Bun.resolveSync("@damatjs/orm-connector", import.meta.dir);
const realConnector = await import(realPath);

mock.module("@damatjs/orm-connector", () => ({
  ...realConnector,
  ConnectionManager: class {
    connect = async () => pool;
    disconnect = disconnect;
  },
}));

const { bootModule } = await import("../src/harness/boot");

test("bootModule releases pool state when module initialization fails", async () => {
  await expect(
    bootModule(
      {
        name: "broken-init",
        service: {},
        init: () => {
          throw new Error("module init failed");
        },
      },
      { databaseUrl: "postgres://not-dialed" },
    ),
  ).rejects.toThrow("module init failed");
  expect(disconnect).toHaveBeenCalledTimes(1);
  expect(PoolManager.isInitialized()).toBe(false);
});
