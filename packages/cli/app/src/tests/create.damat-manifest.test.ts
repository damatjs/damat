import { beforeEach, describe, expect, test } from "bun:test";
import { resetMocks, writeCalls } from "./setup";
import { writeScaffold } from "../commands/create/writeScaffold";

beforeEach(resetMocks);

describe("backend receiver manifest", () => {
  test("create writes damat.json with all backend capability destinations", () => {
    writeScaffold("/app", "my-api", "1.0.0");
    const write = writeCalls.find((call) => call.path === "/app/damat.json");
    const manifest = JSON.parse(write!.content);
    expect(manifest).toMatchObject({
      schemaVersion: 1,
      kind: "application",
      name: "my-api",
    });
    expect(Object.keys(manifest.install.accepts)).toEqual([
      "module", "routes", "workflows", "jobs", "events", "pipelines",
      "links", "tests", "migrations", "models", "types",
    ]);
  });
});
