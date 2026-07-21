export function gitignoreTemplate(): string {
  return `node_modules/
dist/
.damat/
logs/
.env
.env.local
*.log
`;
}

/** A working example route so the app answers a request out of the box. */
export function helloRouteTemplate(name: string): string {
  return `import { RouteHandler } from "@damatjs/framework/router";

export const GET: RouteHandler = async (c) => {
  return c.json({
    success: true,
    data: { message: "Hello from ${name}" },
  });
};
`;
}

/**
 * The app-level workflow barrel. \`damat module add\` regenerates it when a
 * module ships workflows; until then it is an intentionally empty module.
 */
export function workflowsBarrelTemplate(): string {
  return `export {};\n`;
}

/** A minimal smoke test proving the config loads and has the expected shape. */
export function smokeTestTemplate(): string {
  return `import { describe, test, expect } from "bun:test";
import config from "../damat.config";

describe("damat.config", () => {
  test("exports a project config with an http block", () => {
    expect(config.projectConfig.http.port).toBeGreaterThan(0);
    expect(config.modules).toEqual({});
  });
});
`;
}
