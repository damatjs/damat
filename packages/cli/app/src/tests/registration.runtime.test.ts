import "./setup";
import { describe, expect, it } from "bun:test";
import { devCommand, startCommand } from "../commands";

describe("runtime command registration", () => {
  it("preserves dev metadata and options", () => {
    expect(devCommand).toMatchObject({
      name: "dev",
      description: "Start development server with hot reload",
      aliases: ["d"],
    });
    expect(devCommand.options).toEqual([
      expect.objectContaining({ name: "port", alias: "p", default: 3000 }),
      expect.objectContaining({ name: "clear", alias: "c", default: false }),
    ]);
    expect(typeof devCommand.handler).toBe("function");
  });

  it("preserves start metadata and options", () => {
    expect(startCommand).toMatchObject({
      name: "start",
      description: "Start production server",
      aliases: ["s"],
    });
    expect(startCommand.options).toEqual([
      expect.objectContaining({
        name: "output",
        alias: "o",
        default: ".damat/dist",
      }),
    ]);
    expect(typeof startCommand.handler).toBe("function");
  });
});
