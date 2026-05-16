import { describe, it, expect } from "bun:test";
import { createConnection } from "../index";
import type { DbPoolConfig } from "@damatjs/orm-type";

describe("createConnection", () => {
  it("should create a connection with string config", async () => {
    const config = "postgres://test:test@localhost:5432/test";
    const connection = await createConnection(config);
    expect(connection.pool).toBeDefined();
    expect(connection.close).toBeFunction();
    expect(connection.isConnected).toBeFunction();
    expect(connection.getClient).toBeFunction();
    expect(connection.query).toBeFunction();
    expect(connection.transaction).toBeFunction();
    expect(connection.getStats).toBeFunction();
  });

  it("should create a connection with object config", async () => {
    const config: DbPoolConfig = {
      host: "localhost",
      port: 5432,
      user: "test",
      password: "test",
      database: "test",
    };
    const connection = await createConnection(config);
    expect(connection.pool).toBeDefined();
  });
});
