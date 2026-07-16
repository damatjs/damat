import { DurabilityNotConfiguredError } from "../errors";
import type { DurabilityClient } from "./types";

const CLIENT = Symbol.for("damatjs.durability.client");
type GlobalWithClient = typeof globalThis & {
  [CLIENT]?: DurabilityClient;
};

const storage = globalThis as GlobalWithClient;

export function setDurabilityClient(client: DurabilityClient): void {
  storage[CLIENT] = client;
}

export function getDurabilityClient(): DurabilityClient {
  const client = storage[CLIENT];
  if (!client) throw new DurabilityNotConfiguredError();
  return client;
}

export function clearDurabilityClient(): void {
  delete storage[CLIENT];
}
