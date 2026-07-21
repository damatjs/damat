import { describe, expect, test } from "bun:test";
import { runInstallerCommand } from "../../installer/runner";

describe("runInstallerCommand", () => {
  test("runs argument arrays and returns captured output", async () => {
    let received: unknown;
    const spawn = (command: string[], options: unknown) => {
      received = { command, options };
      return {
        exited: Promise.resolve(3),
        stdout: new Response("out").body!,
        stderr: new Response("err").body!,
      };
    };
    const result = await runInstallerCommand(
      {
        command: "bun",
        args: ["add", "pkg"],
        cwd: "/app",
        env: { A: "1" },
      },
      spawn,
    );
    expect(result).toEqual({ exitCode: 3, stdout: "out", stderr: "err" });
    expect(received).toMatchObject({
      command: ["bun", "add", "pkg"],
      options: { cwd: "/app", env: { A: "1" }, stdout: "pipe", stderr: "pipe" },
    });
  });
});
