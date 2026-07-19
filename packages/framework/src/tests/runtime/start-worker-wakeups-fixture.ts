import { expect } from "bun:test";
import {
  createDurabilityClient,
  setDurabilityClient,
} from "@damatjs/durability";

export function setFakeDurability(failClaims = false): void {
  const query = async (sql: string) => {
    if (failClaims && sql.includes("WITH selected")) {
      throw new Error("relay failed");
    }
    return { rows: [], rowCount: 1 };
  };
  setDurabilityClient(
    createDurabilityClient({
      pool: { query, connect: async () => ({ query, release: () => {} }) },
    }),
  );
}

export function config(redisUrl: string) {
  return {
    projectConfig: { http: { port: 3000, host: "localhost" }, redisUrl },
    services: {
      jobs: {},
      events: { durable: {} },
      durability: { acceleration: {} },
    },
  } as never;
}

export function logger(warnings: unknown[] = []) {
  return {
    warn: (_message: string, details: unknown) => warnings.push(details),
    info: () => {},
    error: () => {},
  } as never;
}

export async function waitFor(condition: () => boolean): Promise<void> {
  const deadline = Date.now() + 500;
  while (!condition() && Date.now() < deadline) await Bun.sleep(2);
  expect(condition()).toBeTrue();
}
