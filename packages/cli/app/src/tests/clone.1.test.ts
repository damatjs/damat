// setup.ts installs the process-global node:fs + node:child_process mocks and
// MUST be imported before the source under test (see its header comment).
import { spawnSyncCalls, resetMocks } from "./setup";
import { describe, test, expect, beforeEach } from "bun:test";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { cloneCommand, parseCloneSource } from "../commands/clone";
import { createContext } from "./helpers";

beforeEach(() => {
  resetMocks();
});

const _runClone = (args: string[], options: Record<string, unknown> = {}) => {
  const { ctx, logger } = createContext(
    { fresh: false, install: false, ...options },
    { args, cwd: "/base" } as never,
  );
  return { result: cloneCommand.handler(ctx), logger };
};

// The handler preflights git with `git --version` (requireGit); filter that
// out so assertions stay about the actual work.
const _spawned = () =>
  spawnSyncCalls
    .map((c) => [c.cmd, ...c.args].join(" "))
    .filter((line) => line !== "git --version");

// The mocked mkdtempSync returns `${prefix}XXXXXX`.
const _TEMP = `${join(tmpdir(), "damat-clone-")}XXXXXX`;

describe("parseCloneSource", () => {
  test("parses plain URLs, keeping any #ref", () => {
    expect(parseCloneSource("https://github.com/a/b.git")).toEqual({
      repoUrl: "https://github.com/a/b.git",
      subDir: "",
      ref: "",
    });
    expect(parseCloneSource("git@github.com:a/b.git#v2")).toEqual({
      repoUrl: "git@github.com:a/b.git",
      subDir: "",
      ref: "v2",
    });
  });

  test("expands github shorthand, with optional subdirectory", () => {
    expect(parseCloneSource("acme/service")).toEqual({
      repoUrl: "https://github.com/acme/service.git",
      subDir: "",
      ref: "",
    });
    expect(parseCloneSource("acme/mono/examples/api#main")).toEqual({
      repoUrl: "https://github.com/acme/mono.git",
      subDir: "examples/api",
      ref: "main",
    });
  });

  test("rejects anything else", () => {
    expect(() => parseCloneSource("not a source")).toThrow(/neither a git URL/);
  });
});
