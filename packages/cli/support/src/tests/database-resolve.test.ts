import { describe, expect, test } from "bun:test";
import {
  databaseOption,
  resolveDatabaseSelection,
  type DatabasePrompt,
} from "../database";

function prompt(values: string[]): DatabasePrompt {
  return {
    text: async () => values.shift() ?? "",
    secret: async () => values.shift() ?? "",
  };
}

const forbiddenPrompt: DatabasePrompt = {
  text: async () => {
    throw new Error("noninteractive selection prompted for text");
  },
  secret: async () => {
    throw new Error("noninteractive selection prompted for a secret");
  },
};

describe("database selection", () => {
  test("reads dashed and camel-cased CLI option keys", () => {
    expect(databaseOption({ "database-url": "a" }, "database-url")).toBe("a");
    expect(databaseOption({ databaseUrl: "b" }, "database-url")).toBe("b");
    expect(databaseOption({}, "database-url")).toBeUndefined();
  });

  test("uses explicit URLs and fields without prompting", async () => {
    expect(
      await resolveDatabaseSelection(
        { databaseUrl: "postgres://u:p@localhost/app" },
        "fallback",
      ),
    ).toEqual({ url: "postgres://u:p@localhost/app", setup: true });
    const fields = await resolveDatabaseSelection(
      { "database-user": "damat", "database-name": "selected" },
      "fallback",
    );
    expect(fields.url).toContain("damat:postgres@localhost:5432/selected");
    expect(fields.setup).toBe(true);
  });

  test("honors deferred and noninteractive setup modes", async () => {
    const deferred = await resolveDatabaseSelection(
      { databaseSetup: false, databaseUrl: "postgres://u:p@localhost/app" },
      "app",
      forbiddenPrompt,
      false,
    );
    expect(deferred.setup).toBe(false);
    expect(
      (await resolveDatabaseSelection({}, "app", forbiddenPrompt, false)).setup,
    ).toBe(false);
    expect(
      (
        await resolveDatabaseSelection(
          { "database-setup": true },
          "app",
          forbiddenPrompt,
          false,
        )
      ).setup,
    ).toBe(true);
  });

  test("accepts an interactively entered URL", async () => {
    const result = await resolveDatabaseSelection(
      {},
      "app",
      prompt(["postgres://u:p@localhost/entered"]),
      true,
    );
    expect(result).toEqual({
      url: "postgres://u:p@localhost/entered",
      setup: true,
    });
  });

  test("prompts for individual fields when URL is blank", async () => {
    const result = await resolveDatabaseSelection(
      {},
      "fallback",
      prompt(["", "db", "6543", "user", "secret", "named"]),
      true,
    );
    expect(result.url).toBe("postgres://user:secret@db:6543/named");
    expect(result.setup).toBe(true);
  });
});
