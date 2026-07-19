import { describe, expect, test } from "bun:test";
import {
  assertProductionEnvironment,
  productionEnvironmentErrors,
} from "../src/operations/environment";

const secure = {
  NODE_ENV: "production",
  DATABASE_URL:
    "postgresql://damat_runtime:runtime-password-long-enough@db:5432/damat?sslmode=require",
  MIGRATION_DATABASE_URL:
    "postgresql://damat_migrator:migration-password-long-enough@db:5432/damat?sslmode=require",
  REDIS_URL: "rediss://damat:redis-password-long-enough@redis:6379",
  METRICS_TOKEN: "metrics-token-that-is-long-and-random-1234",
  PUBLIC_BASE_URL: "https://api.example.test",
  RELEASE_VERSION: "sha-0123456789abcdef",
};

describe("production environment gate", () => {
  test("accepts distinct restricted accounts and encrypted transports", () => {
    expect(productionEnvironmentErrors(secure, true)).toEqual([]);
  });

  test("allows plain transport only for an explicit private network", () => {
    const env = {
      ...secure,
      DATABASE_URL:
        "postgresql://damat_runtime:runtime-password-long-enough@db:5432/damat",
      REDIS_URL: "redis://damat:redis-password-long-enough@redis:6379",
      DAMAT_ALLOW_INSECURE_INTERNAL_NETWORK: "true",
    };
    expect(productionEnvironmentErrors(env, false)).toEqual([]);
  });

  test("rejects administrative, shared, weak, and unencrypted credentials", () => {
    const errors = productionEnvironmentErrors(
      {
        ...secure,
        DATABASE_URL: "postgresql://postgres:short@public.db:5432/damat",
        MIGRATION_DATABASE_URL:
          "postgresql://postgres:short@public.db:5432/damat",
        REDIS_URL: "redis://default:short@public.redis:6379",
        METRICS_TOKEN: "change-me",
        PUBLIC_BASE_URL: "http://api.example.test",
        RELEASE_VERSION: "latest",
      },
      true,
    );
    expect(errors.join("\n")).toContain("administrative account");
    expect(errors.join("\n")).toContain("must use TLS");
    expect(errors.join("\n")).toContain("must differ");
    expect(errors.join("\n")).toContain("PUBLIC_BASE_URL");
    expect(errors.join("\n")).toContain("immutable release");
  });

  test("rejects malformed URLs and fails production startup loudly", () => {
    expect(
      productionEnvironmentErrors({ ...secure, DATABASE_URL: "not a URL" }),
    ).toContain("DATABASE_URL must be a valid connection URL");
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    expect(assertProductionEnvironment).not.toThrow();
    process.env.NODE_ENV = "production";
    expect(assertProductionEnvironment).toThrow(
      "Unsafe production environment",
    );
    if (original === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = original;
  });
});
