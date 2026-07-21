import "./setup";
import { describe, expect, it } from "bun:test";
import type { CommandOption } from "@damatjs/cli";
import { buildCommand } from "../commands/build";

const option = (name: string): CommandOption | undefined =>
  buildCommand.options?.find((item) => item.name === name);

describe("build command registration", () => {
  it("preserves its identity and handler", () => {
    expect(buildCommand).toMatchObject({
      name: "build",
      description: "Build for production",
      aliases: ["b"],
    });
    expect(typeof buildCommand.handler).toBe("function");
  });

  it("preserves all option defaults", () => {
    expect(buildCommand.options).toHaveLength(4);
    expect(option("output")).toMatchObject({
      alias: "o",
      type: "string",
      default: ".damat/dist",
    });
    expect(option("target")).toMatchObject({
      alias: "t",
      type: "string",
      default: "bun",
    });
    expect(option("minify")).toMatchObject({
      alias: "m",
      type: "boolean",
      default: false,
    });
    expect(option("typecheck")).toMatchObject({
      type: "boolean",
      default: true,
    });
  });
});
