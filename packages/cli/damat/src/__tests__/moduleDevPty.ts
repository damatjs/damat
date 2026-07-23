import { waitForReadiness } from "./moduleDevReadiness";
import { moduleDevEnv, within } from "./moduleDevProcess";

export interface RunningPtyModuleDev {
  port: number;
  output: () => string;
  interrupt: () => Promise<number>;
}

const expectProgram = String.raw`
set timeout 30
spawn -noecho $env(DAMAT_TEST_BUN) run dev -- --port 0
expect {
  -re {ready at http://localhost:([0-9]+)} {}
  timeout { puts stderr "module readiness timed out"; exit 124 }
  eof { set status [wait]; exit [lindex $status 3] }
}
puts "DAMAT_PTY_READY:$expect_out(1,string)"
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

async function read(
  stream: ReadableStream<Uint8Array>,
  update?: (text: string) => void,
): Promise<string> {
  let text = "";
  for await (const chunk of stream) {
    text += new TextDecoder().decode(chunk);
    update?.(text);
  }
  return text;
}

export async function startPtyModuleDev(
  cwd: string,
  databaseUrl: string,
): Promise<RunningPtyModuleDev> {
  let output = "";
  const child = Bun.spawn(["expect", "-c", expectProgram], {
    cwd,
    env: {
      ...moduleDevEnv(databaseUrl),
      DAMAT_TEST_BUN: process.execPath,
    },
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = read(child.stdout, (text) => void (output = text));
  const stderr = read(child.stderr);
  try {
    const readiness = waitForReadiness(() => output, 1);
    const exited = child.exited.then(async (code) => {
      throw new Error(`PTY exited ${code} before readiness: ${await stderr}`);
    });
    const port = await within(Promise.race([readiness, exited]), 30_000);
    return {
      port,
      output: () => output,
      interrupt: async () => {
        child.stdin.write("interrupt\n");
        await child.stdin.flush();
        const code = await within(child.exited, 15_000);
        output = await stdout;
        const error = await stderr;
        if (error) output += error;
        return code;
      },
    };
  } catch (error) {
    child.kill("SIGKILL");
    await child.exited;
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${message}\nPTY output:\n${output}`, { cause: error });
  }
}
