import type { Pool } from "@damatjs/orm-type";

let poolInstance: Pool | null = null;

export function getPool(): Pool | null {
  return poolInstance;
}

export function setPool(pool: Pool | null): void {
  poolInstance = pool;
}

export function hasPool(): boolean {
  return poolInstance !== null;
}

export function clearPool(): void {
  poolInstance = null;
}
