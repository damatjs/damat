import { mock } from "bun:test";
import type {
  EntityManager,
  MikroORM,
} from "@damatjs/deps/mikro-orm/postgresql";

// ---------------------------------------------------------------------------
// Minimal EntityManager mock
// ---------------------------------------------------------------------------

export function createMockEntityManager(
  overrides: Partial<EntityManager> = {},
): EntityManager {
  const mockConnection = {
    execute: mock().mockResolvedValue([{ "?column?": 1 }]),
  };

  const forkedEm: Partial<EntityManager> = {
    getConnection: mock().mockReturnValue(mockConnection),
  };

  const em = {
    getConnection: mock().mockReturnValue(mockConnection),
    fork: mock().mockReturnValue(forkedEm as EntityManager),
    ...overrides,
  } as unknown as EntityManager;

  return em;
}

// ---------------------------------------------------------------------------
// Minimal MikroORM mock
// ---------------------------------------------------------------------------

export function createMockOrm(overrides: Partial<MikroORM> = {}): MikroORM {
  const em = createMockEntityManager();

  const orm = {
    em,
    close: mock().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as MikroORM;

  return orm;
}
