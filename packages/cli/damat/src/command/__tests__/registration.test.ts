// IMPORTANT: import the shared setup FIRST — before the command sources below.
// These tests import `../build`, `../dev`, `../start` directly with no fakes of
// their own, so if registration runs before any command-handler test file, it
// would be the thing that snapshots the REAL Bun.spawn and a partial node:fs
// (→ ENOENT / "Export named 'renameSync' not found"). Loading setup first
// installs the stable spawn dispatcher + the full node:fs mock so the sources
// snapshot those instead. See setup.ts for the full rationale.
import "./setup";
import { describe, it, expect } from "bun:test";
import type { Command, CommandOption } from "@damatjs/cli";
import { buildCommand } from "../build";
import { devCommand } from "../dev";
import { startCommand } from "../start";
import * as commandIndex from "../index";

/**
 * These tests pin down the static "wiring" of each command object: name,
 * description, aliases and option declarations (including defaults). They run
 * no handlers, so nothing is spawned. This is the contract that the CLI
 * framework (runCli) consumes when registering commands.
 */

function findOption(cmd: Command, name: string): CommandOption | undefined {
  return cmd.options?.find((o) => o.name === name);
}

describe("command/index barrel", () => {
  it("re-exports all three commands", () => {
    expect(commandIndex.buildCommand).toBe(buildCommand);
    expect(commandIndex.devCommand).toBe(devCommand);
    expect(commandIndex.startCommand).toBe(startCommand);
  });
});

describe("buildCommand registration", () => {
  it("has the expected name, description and alias", () => {
    expect(buildCommand.name).toBe("build");
    expect(buildCommand.description).toBe("Build for production");
    expect(buildCommand.aliases).toEqual(["b"]);
  });

  it("exposes a handler function", () => {
    expect(typeof buildCommand.handler).toBe("function");
  });

  it("declares output/target/minify options with correct defaults", () => {
    expect(buildCommand.options).toHaveLength(3);

    const output = findOption(buildCommand, "output");
    expect(output).toMatchObject({
      name: "output",
      alias: "o",
      type: "string",
      default: ".damat/dist",
    });

    const target = findOption(buildCommand, "target");
    expect(target).toMatchObject({
      name: "target",
      alias: "t",
      type: "string",
      default: "bun",
    });

    const minify = findOption(buildCommand, "minify");
    expect(minify).toMatchObject({
      name: "minify",
      alias: "m",
      type: "boolean",
      default: false,
    });
  });
});

describe("devCommand registration", () => {
  it("has the expected name, description and alias", () => {
    expect(devCommand.name).toBe("dev");
    expect(devCommand.description).toBe(
      "Start development server with hot reload",
    );
    expect(devCommand.aliases).toEqual(["d"]);
  });

  it("exposes a handler function", () => {
    expect(typeof devCommand.handler).toBe("function");
  });

  it("declares port/clear options with correct defaults", () => {
    expect(devCommand.options).toHaveLength(2);

    const port = findOption(devCommand, "port");
    expect(port).toMatchObject({
      name: "port",
      alias: "p",
      type: "number",
      default: 3000,
    });

    const clear = findOption(devCommand, "clear");
    expect(clear).toMatchObject({
      name: "clear",
      alias: "c",
      type: "boolean",
      default: false,
    });
  });
});

describe("startCommand registration", () => {
  it("has the expected name, description and alias", () => {
    expect(startCommand.name).toBe("start");
    expect(startCommand.description).toBe("Start production server");
    expect(startCommand.aliases).toEqual(["s"]);
  });

  it("exposes a handler function", () => {
    expect(typeof startCommand.handler).toBe("function");
  });

  it("declares a single output option with correct default", () => {
    expect(startCommand.options).toHaveLength(1);

    const output = findOption(startCommand, "output");
    expect(output).toMatchObject({
      name: "output",
      alias: "o",
      type: "string",
      default: ".damat/dist",
    });
  });
});

describe("command names/aliases are unique across the CLI", () => {
  it("has no duplicate names or aliases", () => {
    const commands = [buildCommand, devCommand, startCommand];
    const tokens = commands.flatMap((c) => [c.name, ...(c.aliases ?? [])]);
    const unique = new Set(tokens);
    expect(unique.size).toBe(tokens.length);
  });
});
