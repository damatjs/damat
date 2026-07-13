// setup.ts installs the process-global node:fs + node:child_process mocks and
// MUST be imported before the source under test (see its header comment).
import {
  state,
  writeCalls,
  rmCalls,
  cpCalls,
  spawnSyncCalls,
  mockSpawnSync,
  resetMocks,
} from "./setup";
import { describe, test, expect, beforeEach } from "bun:test";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { cloneCommand, parseCloneSource } from "../clone";
import { createContext } from "./helpers";

beforeEach(() => {
  resetMocks();
});

const runClone = (args: string[], options: Record<string, unknown> = {}) => {
  const { ctx, logger } = createContext(
    { fresh: false, install: false, ...options },
    { args, cwd: "/base" } as never,
  );
  return { result: cloneCommand.handler(ctx), logger };
};

// The handler preflights git with `git --version` (requireGit); filter that
// out so assertions stay about the actual work.
const spawned = () =>
  spawnSyncCalls
    .map((c) => [c.cmd, ...c.args].join(" "))
    .filter((line) => line !== "git --version");

// The mocked mkdtempSync returns `${prefix}XXXXXX`.
const TEMP = `${join(tmpdir(), "damat-clone-")}XXXXXX`;

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

describe("damat clone — validation", () => {
  test("requires a source", async () => {
    const { result, logger } = runClone([]);
    expect((await result).exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalled();
    expect(spawnSyncCalls).toHaveLength(0);
  });

  test("rejects an unparseable source", async () => {
    const { result, logger } = runClone(["no spaces allowed"]);
    expect((await result).exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) =>
        String(c[0]).includes("Could not parse clone source"),
      ),
    ).toBe(true);
  });

  test("refuses an existing target directory", async () => {
    state.existsMap["/base/service"] = true;
    const { result, logger } = runClone(["acme/service"]);
    expect((await result).exitCode).toBe(1);
    expect(logger.error.mock.calls[0]![0]).toContain("already exists");
    expect(spawned()).toHaveLength(0);
  });

  test("errors clearly up front when git is not installed — no fallback, no clone attempt", async () => {
    state.spawnSyncResult = { status: 1, stdout: "", stderr: "" }; // `git --version` fails
    const { result, logger } = runClone(["acme/service"]);
    expect((await result).exitCode).toBe(1);
    const message = String(logger.error.mock.calls[0]![0]);
    expect(message).toContain("git is required to clone repositories");
    expect(message).toContain("install git and re-run");
    // Only the preflight probe ran — nothing was downloaded any other way.
    expect(spawned()).toHaveLength(0);
    expect(spawnSyncCalls).toHaveLength(1);
  });

  test("a spawn error mid-clone (git vanished) is reported plainly", async () => {
    mockSpawnSync
      .mockImplementationOnce(
        () => ({ status: 0, stdout: "", stderr: "" }) as never,
      ) // preflight
      .mockImplementationOnce(
        () =>
          ({
            status: null,
            error: new Error("spawn git ENOENT"),
            stdout: "",
            stderr: "",
          }) as never,
      );
    const { result, logger } = runClone(["acme/service"]);
    expect((await result).exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) =>
        String(c[0]).includes("could not run git (spawn git ENOENT)"),
      ),
    ).toBe(true);
  });
});

describe("damat clone — plain clone (git clone semantics)", () => {
  test("clones the URL into a dir derived from the repo name, keeping .git", async () => {
    const { result, logger } = runClone([
      "https://github.com/acme/service.git",
    ]);
    expect((await result).exitCode).toBe(0);
    expect(spawned()).toEqual([
      "git clone -- https://github.com/acme/service.git /base/service",
    ]);
    // No fresh-history spawns, no .git removal.
    expect(rmCalls).toHaveLength(0);
    expect(logger.success.mock.calls[0]![0]).toContain("Cloned");
  });

  test("expands shorthand and honors an explicit target dir", async () => {
    await runClone(["acme/service", "my-copy"]).result;
    expect(spawned()).toEqual([
      "git clone -- https://github.com/acme/service.git /base/my-copy",
    ]);
  });

  test("--depth and #ref map to git clone flags; --branch overrides the #ref", async () => {
    await runClone(["acme/service#v1"], { depth: 5 }).result;
    expect(spawned()[0]).toBe(
      "git clone --depth 5 --branch v1 -- https://github.com/acme/service.git /base/service",
    );

    resetMocks();
    await runClone(["acme/service#v1"], { branch: "v2" }).result;
    expect(spawned()[0]).toContain("--branch v2");
  });

  test("a failed clone reports git's stderr, removes the target, and exits 1", async () => {
    mockSpawnSync
      .mockImplementationOnce(
        () => ({ status: 0, stdout: "", stderr: "" }) as never,
      ) // preflight
      .mockImplementationOnce(
        () =>
          ({
            status: 128,
            stdout: "",
            stderr: "fatal: repo not found",
          }) as never,
      );
    const { result, logger } = runClone(["acme/missing"]);
    expect((await result).exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) =>
        String(c[0]).includes("fatal: repo not found"),
      ),
    ).toBe(true);
    expect(rmCalls.some((c) => c.path === "/base/missing")).toBe(true);
  });
});

describe("damat clone — subdirectory extraction", () => {
  test("shallow-clones to a temp dir, copies the subdir out, and cleans up", async () => {
    state.existsMap[resolve(join(TEMP, "examples/api"))] = true;
    const { result, logger } = runClone(["acme/mono/examples/api", "my-api"]);
    expect((await result).exitCode).toBe(0);

    expect(spawned()).toEqual([
      `git clone --depth 1 -- https://github.com/acme/mono.git ${TEMP}`,
    ]);
    expect(cpCalls[0]).toMatchObject({
      src: resolve(join(TEMP, "examples/api")),
      dest: "/base/my-api",
    });
    // The copy filter drops VCS and dependency dirs but keeps source files.
    const { filter } = cpCalls[0]!.opts as { filter: (src: string) => boolean };
    expect(filter(join(TEMP, "examples/api", "src", "x.ts"))).toBe(true);
    expect(filter(join(TEMP, "examples/api", ".git"))).toBe(false);
    expect(filter(join(TEMP, "examples/api", ".git", "HEAD"))).toBe(false);
    expect(filter(join(TEMP, "examples/api", "node_modules"))).toBe(false);
    expect(
      filter(join(TEMP, "examples/api", "node_modules", "x", "i.js")),
    ).toBe(false);
    expect(rmCalls.some((c) => c.path === TEMP)).toBe(true);
    // Extraction can't carry history — the hint appears without --fresh.
    expect(
      logger.info.mock.calls.some((c) =>
        String(c[0]).includes("no git history"),
      ),
    ).toBe(true);
  });

  test("refuses a subpath that escapes the checkout", async () => {
    const { result, logger } = runClone(["acme/mono/../../../etc"]);
    expect((await result).exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) =>
        String(c[0]).includes("escapes the cloned repository"),
      ),
    ).toBe(true);
    expect(cpCalls).toHaveLength(0);
  });

  test("errors when the subdir does not exist in the repo", async () => {
    const { result, logger } = runClone(["acme/mono/nope/nothing"]);
    expect((await result).exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) =>
        String(c[0]).includes("not found inside"),
      ),
    ).toBe(true);
  });
});

describe("damat clone — extras", () => {
  test("--fresh strips .git/.github and starts a new history", async () => {
    const { result, logger } = runClone(["acme/service"], { fresh: true });
    expect((await result).exitCode).toBe(0);
    expect(rmCalls.some((c) => c.path === "/base/service/.git")).toBe(true);
    expect(rmCalls.some((c) => c.path === "/base/service/.github")).toBe(true);
    expect(spawned().slice(1)).toEqual([
      "git init -b main",
      "git add .",
      "git commit -m chore: bootstrap from acme/service",
    ]);
    expect(
      logger.success.mock.calls.some((c) =>
        String(c[0]).includes("fresh git history"),
      ),
    ).toBe(true);
  });

  test("--fresh warns when the new init fails (clone already succeeded)", async () => {
    // preflight ok, clone ok, init fails.
    mockSpawnSync
      .mockImplementationOnce(
        () => ({ status: 0, stdout: "", stderr: "" }) as never,
      )
      .mockImplementationOnce(
        () => ({ status: 0, stdout: "", stderr: "" }) as never,
      )
      .mockImplementationOnce(() => {
        throw new Error("git broke");
      });
    const { result, logger } = runClone(["acme/service"], { fresh: true });
    expect((await result).exitCode).toBe(0);
    expect(
      logger.warn.mock.calls.some((c) =>
        String(c[0]).includes("Could not initialize"),
      ),
    ).toBe(true);
  });

  test("--name rewrites package.json preserving its indentation", async () => {
    state.existsMap["/base/service/package.json"] = true;
    state.readFileMap["/base/service/package.json"] =
      `{\n    "name": "old",\n    "version": "1.0.0"\n}\n`;
    const { result, logger } = runClone(["acme/service"], { name: "renamed" });
    expect((await result).exitCode).toBe(0);
    const write = writeCalls.find(
      (c) => c.path === "/base/service/package.json",
    )!;
    expect(write.content).toContain('    "name": "renamed"');
    expect(
      logger.success.mock.calls.some((c) => String(c[0]).includes('"renamed"')),
    ).toBe(true);
  });

  test("--name warns when there is no readable package.json", async () => {
    const { result, logger } = runClone(["acme/service"], { name: "renamed" });
    expect((await result).exitCode).toBe(0);
    expect(
      logger.warn.mock.calls.some((c) => String(c[0]).includes("No readable")),
    ).toBe(true);

    resetMocks();
    state.existsMap["/base/service/package.json"] = true;
    state.readFileMap["/base/service/package.json"] = "{ not json";
    const second = runClone(["acme/service"], { name: "renamed" });
    expect((await second.result).exitCode).toBe(0);
    expect(
      second.logger.warn.mock.calls.some((c) =>
        String(c[0]).includes("No readable"),
      ),
    ).toBe(true);
  });

  test("--install runs bun install and warns on failure", async () => {
    const { result, logger } = runClone(["acme/service"], { install: true });
    expect((await result).exitCode).toBe(0);
    expect(spawned()).toContain("bun install");
    expect(
      logger.success.mock.calls.some((c) =>
        String(c[0]).includes("Dependencies"),
      ),
    ).toBe(true);

    resetMocks();
    // preflight ok, clone ok, install fails.
    mockSpawnSync
      .mockImplementationOnce(
        () => ({ status: 0, stdout: "", stderr: "" }) as never,
      )
      .mockImplementationOnce(
        () => ({ status: 0, stdout: "", stderr: "" }) as never,
      )
      .mockImplementationOnce(
        () => ({ status: 1, stdout: "", stderr: "offline" }) as never,
      );
    const second = runClone(["acme/service"], { install: true });
    expect((await second.result).exitCode).toBe(0);
    expect(
      second.logger.warn.mock.calls.some((c) =>
        String(c[0]).includes("bun install failed"),
      ),
    ).toBe(true);
  });
});
