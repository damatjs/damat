import { handleMessage } from "./dispatch";

/**
 * Start the server: buffer stdin and dispatch each newline-delimited JSON-RPC
 * message. Malformed lines are ignored. Because handlers are async, responses
 * may arrive out of request order — clients match them by `id`.
 */
export function run(): void {
  let buffer = "";
  process.stdin.setEncoding("utf-8");
  process.stdin.on("data", (chunk: string) => {
    buffer += chunk;
    let newline: number;
    while ((newline = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line) continue;
      let msg: unknown;
      try {
        msg = JSON.parse(line);
      } catch {
        continue; // ignore malformed lines
      }
      void handleMessage(msg);
    }
  });
  process.stdin.on("end", () => process.exit(0));
}
