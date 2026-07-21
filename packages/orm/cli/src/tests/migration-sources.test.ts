import { expect, test } from "bun:test";
import { migrationSources } from "../cli/commands/migrate/sources";

test("migration list preserves resolved package migration directories", () => {
  expect(
    migrationSources([
      {
        id: "billing",
        name: "billing",
        path: "@fixtures/billing",
        resolve: "/app/node_modules/@fixtures/billing",
        migrations: "/app/node_modules/@fixtures/billing/src/migrations",
      },
      {
        id: "user",
        name: "user",
        path: "./src/modules/user",
        resolve: "/app/src/modules/user",
      },
    ]),
  ).toEqual([
    {
      resolve: "/app/node_modules/@fixtures/billing",
      migrations: "/app/node_modules/@fixtures/billing/src/migrations",
    },
    "/app/src/modules/user",
  ]);
});
