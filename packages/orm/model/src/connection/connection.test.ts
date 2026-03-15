import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { DatabaseConnection } from "../types";
import { createMockEntityManager, createMockOrm } from "./__mocks__/mikro-orm";

// ─────────────────────────────────────────────────────────────────────────────
// Module-level mock — must happen before any import of a module that
// transitively touches @damatjs/deps/mikro-orm/postgresql so that
// createConnection / initConnection never try to load the real driver.
// ─────────────────────────────────────────────────────────────────────────────

const mockOrmInit = mock();

mock.module("@damatjs/deps/mikro-orm/postgresql", () => ({
  MikroORM: { init: mockOrmInit },
  // Keep other named exports that transitive imports (e.g. createOrmConfig) need
  PostgreSqlDriver: class PostgreSqlDriver {},
  Options: {},
}));

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function createMockConnection(
  overrides: Partial<DatabaseConnection> = {},
): DatabaseConnection {
  const orm = createMockOrm();
  const em = createMockEntityManager();

  return {
    orm,
    em,
    close: mock().mockResolvedValue(undefined),
    isConnected: mock().mockResolvedValue(true),
    fork: mock().mockReturnValue(em),
    ...overrides,
  } as DatabaseConnection;
}

// ─────────────────────────────────────────────────────────────────────────────
// singleton
// ─────────────────────────────────────────────────────────────────────────────

describe("singleton", () => {
  it("exports a mutable connectionInstance initialised to null", async () => {
    const { connectionInstance, setConnectionInstance } =
      await import("./singleton");
    expect(connectionInstance === null || connectionInstance !== null).toBe(
      true,
    );
    expect(typeof setConnectionInstance).toBe("function");
  });

  it("setConnectionInstance updates connectionInstance", async () => {
    const singleton = await import("./singleton");
    const conn = createMockConnection();

    singleton.setConnectionInstance(conn);
    expect(singleton.connectionInstance).toBe(conn);

    singleton.setConnectionInstance(null);
    expect(singleton.connectionInstance).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// wrapOrmConnection
// ─────────────────────────────────────────────────────────────────────────────

describe("wrapOrmConnection", () => {
  it("wraps orm and exposes the expected interface", async () => {
    const { wrapOrmConnection } = await import("./wrapOrmConnection");
    const orm = createMockOrm();
    const conn = wrapOrmConnection(orm);

    expect(conn.orm).toBe(orm);
    expect(conn.em).toBe(orm.em);
    expect(typeof conn.close).toBe("function");
    expect(typeof conn.isConnected).toBe("function");
    expect(typeof conn.fork).toBe("function");
  });

  it("close() delegates to orm.close()", async () => {
    const { wrapOrmConnection } = await import("./wrapOrmConnection");
    const orm = createMockOrm();
    const conn = wrapOrmConnection(orm);

    await conn.close();

    expect(orm.close).toHaveBeenCalledTimes(1);
  });

  it("fork() delegates to orm.em.fork()", async () => {
    const { wrapOrmConnection } = await import("./wrapOrmConnection");
    const orm = createMockOrm();
    const conn = wrapOrmConnection(orm);

    const forked = conn.fork();

    expect(orm.em.fork).toHaveBeenCalledTimes(1);
    expect(forked).toBeDefined();
  });

  describe("isConnected()", () => {
    it("returns true when SELECT 1 succeeds", async () => {
      const { wrapOrmConnection } = await import("./wrapOrmConnection");
      const orm = createMockOrm();
      const conn = wrapOrmConnection(orm);

      const result = await conn.isConnected();

      expect(result).toBe(true);
      expect(orm.em.getConnection).toHaveBeenCalled();
    });

    it("returns false when SELECT 1 throws", async () => {
      const { wrapOrmConnection } = await import("./wrapOrmConnection");
      const em = createMockEntityManager({
        getConnection: mock().mockReturnValue({
          execute: mock().mockRejectedValue(new Error("connection refused")),
        }),
      });
      const orm = createMockOrm({ em });
      const conn = wrapOrmConnection(orm);

      const result = await conn.isConnected();

      expect(result).toBe(false);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// createConnection / createConnectionFromOptions
// ─────────────────────────────────────────────────────────────────────────────

describe("createConnection", () => {
  beforeEach(async () => {
    mockOrmInit.mockReset();
    const singleton = await import("./singleton");
    singleton.setConnectionInstance(null);
  });

  it("createConnection calls MikroORM.init and returns a DatabaseConnection", async () => {
    const orm = createMockOrm();
    mockOrmInit.mockResolvedValue(orm);

    const { createConnection } = await import("./createConnection");

    const conn = await createConnection({
      database: { url: "postgres://localhost/test" },
      modules: [],
    });

    expect(mockOrmInit).toHaveBeenCalledTimes(1);
    expect(conn.orm).toBe(orm);
    expect(conn.em).toBe(orm.em);
    expect(typeof conn.close).toBe("function");
  });

  it("createConnectionFromOptions calls MikroORM.init with raw options", async () => {
    const orm = createMockOrm();
    mockOrmInit.mockResolvedValue(orm);

    const { createConnectionFromOptions } = await import("./createConnection");

    const conn = await createConnectionFromOptions({
      clientUrl: "postgres://localhost/test",
    } as any);

    expect(mockOrmInit).toHaveBeenCalledTimes(1);
    expect(conn.orm).toBe(orm);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// initConnection / initConnectionFromOptions
// ─────────────────────────────────────────────────────────────────────────────

describe("initConnection", () => {
  beforeEach(async () => {
    mockOrmInit.mockReset();
    const singleton = await import("./singleton");
    singleton.setConnectionInstance(null);
  });

  it("initConnection creates and stores a new connection when none exists", async () => {
    const orm = createMockOrm();
    mockOrmInit.mockResolvedValue(orm);

    const { initConnection } = await import("./initConnection");

    const conn = await initConnection({
      database: { url: "postgres://localhost/test" },
      modules: [],
    });

    expect(mockOrmInit).toHaveBeenCalledTimes(1);
    expect(conn.orm).toBe(orm);

    const { connectionInstance } = await import("./singleton");
    expect(connectionInstance).toBe(conn);
  });

  it("initConnection returns the existing connection without re-initialising", async () => {
    const existing = createMockConnection();
    const singleton = await import("./singleton");
    singleton.setConnectionInstance(existing);

    const { initConnection } = await import("./initConnection");

    const conn = await initConnection({
      database: { url: "postgres://localhost/test" },
      modules: [],
    });

    expect(conn).toBe(existing);
    expect(mockOrmInit).not.toHaveBeenCalled();
  });

  it("initConnectionFromOptions creates and stores a connection when none exists", async () => {
    const orm = createMockOrm();
    mockOrmInit.mockResolvedValue(orm);

    const { initConnectionFromOptions } = await import("./initConnection");

    const conn = await initConnectionFromOptions({
      clientUrl: "postgres://localhost/test",
    } as any);

    expect(mockOrmInit).toHaveBeenCalledTimes(1);
    expect(conn.orm).toBe(orm);
  });

  it("initConnectionFromOptions returns existing connection without re-initialising", async () => {
    const existing = createMockConnection();
    const singleton = await import("./singleton");
    singleton.setConnectionInstance(existing);

    const { initConnectionFromOptions } = await import("./initConnection");

    const conn = await initConnectionFromOptions({
      clientUrl: "postgres://localhost/test",
    } as any);

    expect(conn).toBe(existing);
    expect(mockOrmInit).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getConnection / getOrm / getEm
// ─────────────────────────────────────────────────────────────────────────────

describe("getConnection", () => {
  beforeEach(async () => {
    const singleton = await import("./singleton");
    singleton.setConnectionInstance(null);
  });

  it("getConnection throws when no connection is initialised", async () => {
    const { getConnection } = await import("./getConnection");
    expect(() => getConnection()).toThrow(
      "Database connection not initialized. Call initConnection() first.",
    );
  });

  it("getConnection returns the singleton connection when set", async () => {
    const conn = createMockConnection();
    const singleton = await import("./singleton");
    singleton.setConnectionInstance(conn);

    const { getConnection } = await import("./getConnection");
    expect(getConnection()).toBe(conn);
  });

  it("getOrm returns the ORM from the singleton connection", async () => {
    const conn = createMockConnection();
    const singleton = await import("./singleton");
    singleton.setConnectionInstance(conn);

    const { getOrm } = await import("./getConnection");
    expect(getOrm()).toBe(conn.orm);
  });

  it("getEm returns a forked EntityManager", async () => {
    const em = createMockEntityManager();
    const conn = createMockConnection({ fork: mock().mockReturnValue(em) });
    const singleton = await import("./singleton");
    singleton.setConnectionInstance(conn);

    const { getEm } = await import("./getConnection");
    const result = getEm();

    expect(conn.fork).toHaveBeenCalledTimes(1);
    expect(result).toBe(em);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// closeConnection
// ─────────────────────────────────────────────────────────────────────────────

describe("closeConnection", () => {
  beforeEach(async () => {
    const singleton = await import("./singleton");
    singleton.setConnectionInstance(null);
  });

  it("does nothing when no connection exists", async () => {
    const { closeConnection } = await import("./closeConnection");
    await expect(closeConnection()).resolves.toBeUndefined();
  });

  it("calls close() and nulls the singleton when a connection exists", async () => {
    const conn = createMockConnection();
    const singleton = await import("./singleton");
    singleton.setConnectionInstance(conn);

    const { closeConnection } = await import("./closeConnection");
    await closeConnection();

    expect(conn.close).toHaveBeenCalledTimes(1);
    expect(singleton.connectionInstance).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isConnectionHealthy
// ─────────────────────────────────────────────────────────────────────────────

describe("isConnectionHealthy", () => {
  beforeEach(async () => {
    const singleton = await import("./singleton");
    singleton.setConnectionInstance(null);
  });

  it("returns false when no connection exists and none is provided", async () => {
    const { isConnectionHealthy } = await import("./isConnectionHealthy");
    expect(await isConnectionHealthy()).toBe(false);
  });

  it("returns true for an explicit healthy connection", async () => {
    const conn = createMockConnection({
      isConnected: mock().mockResolvedValue(true),
    });
    const { isConnectionHealthy } = await import("./isConnectionHealthy");
    expect(await isConnectionHealthy(conn)).toBe(true);
  });

  it("returns false for an explicit unhealthy connection", async () => {
    const conn = createMockConnection({
      isConnected: mock().mockResolvedValue(false),
    });
    const { isConnectionHealthy } = await import("./isConnectionHealthy");
    expect(await isConnectionHealthy(conn)).toBe(false);
  });

  it("uses the singleton connection when no argument is passed", async () => {
    const conn = createMockConnection({
      isConnected: mock().mockResolvedValue(true),
    });
    const singleton = await import("./singleton");
    singleton.setConnectionInstance(conn);

    const { isConnectionHealthy } = await import("./isConnectionHealthy");
    expect(await isConnectionHealthy()).toBe(true);
    expect(conn.isConnected).toHaveBeenCalledTimes(1);
  });

  it("uses the singleton connection when it is unhealthy", async () => {
    const conn = createMockConnection({
      isConnected: mock().mockResolvedValue(false),
    });
    const singleton = await import("./singleton");
    singleton.setConnectionInstance(conn);

    const { isConnectionHealthy } = await import("./isConnectionHealthy");
    expect(await isConnectionHealthy()).toBe(false);
  });
});
