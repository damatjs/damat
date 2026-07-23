import { join } from "node:path";
import { collectOutput } from "./process";

const expectProgram = String.raw`
set timeout 30
spawn -noecho $env(DAMAT_TEST_BUN) run dev -- --port 0
expect {
  -re {ready at http://localhost:([0-9]+)} {}
  timeout { puts stderr "module readiness timed out"; exit 124 }
  eof { set status [wait]; exit [lindex $status 3] }
}
puts "DAMAT_RELEASE_READY:$expect_out(1,string)"
flush stdout
gets stdin command
send -- "\003"
set timeout 15
expect {
  eof {}
  timeout { puts stderr "module shutdown timed out"; exit 124 }
}
set status [wait]
exit [lindex $status 3]
`;

export async function exercisePackedModuleDev(
  consumerRoot: string,
  cli: string,
): Promise<void> {
  const init = Bun.spawnSync(
    [
      process.execPath,
      cli,
      "module",
      "init",
      "packed-module",
      "--no-install",
      "--no-database-setup",
    ],
    { cwd: consumerRoot, env: process.env },
  );
  if (init.exitCode !== 0) throw new Error(init.stderr.toString());
  const cwd = join(consumerRoot, "packed-module");
  let output = "";
  const child = Bun.spawn(["expect", "-c", expectProgram], {
    cwd,
    env: {
      ...process.env,
      DATABASE_URL: "postgres://invalid:invalid@127.0.0.1:1/unreachable",
      DAMAT_TEST_BUN: process.execPath,
      LOG_LEVEL: "fatal",
    },
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  const completed = collectOutput(child, (value) => void (output = value));
  const deadline = Date.now() + 30_000;
  while (!output.includes("DAMAT_RELEASE_READY:") && Date.now() < deadline)
    await Bun.sleep(25);
  const match = /DAMAT_RELEASE_READY:(\d+)/.exec(output);
  if (!match) throw new Error(`packed module did not become ready:\n${output}`);
  const port = Number(match[1]);
  const response = await fetch(`http://127.0.0.1:${port}/health`);
  if (response.status !== 200)
    throw new Error(`health returned ${response.status}`);
  child.stdin.write("interrupt\n");
  await child.stdin.flush();
  const code = await child.exited;
  output = await completed;
  if (code !== 0) throw new Error(`packed module exited ${code}:\n${output}`);
  await assertPortReusable(port);
}

async function assertPortReusable(port: number): Promise<void> {
  const server = Bun.listen({
    hostname: "127.0.0.1",
    port,
    socket: { data() {} },
  });
  server.stop(true);
}
